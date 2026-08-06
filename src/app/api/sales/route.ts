import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created, parseMoney, parsePositiveInt } from "@/lib/api";
import { createNotification } from "@/lib/notifications";
import { formatCurrency } from "@/lib/currency";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50") || 50, 1), 500);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where: Record<string, unknown> = { userId };
    if (start && end) {
      where.date = { gte: new Date(start), lte: new Date(end) };
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { product: true },
        orderBy: { date: "desc" },
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return ok({ sales, total });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { productId, quantity, unitPrice: rawUnitPrice, currency } = await req.json();

    if (!productId || !quantity) {
      return badRequest("Produit et quantité requis");
    }

    const parsedProductId = parseInt(productId, 10);
    const qty = parsePositiveInt(quantity);
    if (!Number.isFinite(parsedProductId) || qty === null) {
      return badRequest("Quantité invalide");
    }

    const product = await prisma.product.findFirst({
      where: { id: parsedProductId, userId },
    });

    if (!product) {
      return badRequest("Produit introuvable");
    }

    const unitPrice = rawUnitPrice != null ? parseMoney(rawUnitPrice) : product.salePrice;
    if (unitPrice === null || unitPrice < 0) {
      return badRequest("Prix unitaire invalide");
    }
    const effectivePrice = rawUnitPrice != null ? unitPrice : product.salePrice;

    let sale;
    try {
      sale = await prisma.$transaction(async (tx) => {
        // Décrément atomique : la condition `stock >= qty` empêche la vente
        // concurrente de faire passer le stock en négatif (pas de perte d'update).
        const decremented = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (decremented.count === 0) {
          throw new Error("STOCK_INSUFFISANT");
        }

        const totalAmount = effectivePrice * qty;
        const unitProfit = effectivePrice - product.purchasePrice;
        const profit = unitProfit * qty;

        const createdSale = await tx.sale.create({
          data: {
            quantity: qty,
            unitPrice: effectivePrice,
            totalAmount,
            profit,
            productId: product.id,
            userId,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: "out",
            quantity: qty,
            description: `Vente: ${qty} x ${product.name}`,
            productId: product.id,
            userId,
            saleId: createdSale.id,
          },
        });

        // Créer auto une transaction revenu activité
        let ventesCategory = await tx.category.findFirst({
          where: { name: "Ventes", userId, type: "income" },
        });
        if (!ventesCategory) {
          ventesCategory = await tx.category.create({
            data: { name: "Ventes", icon: "TrendingUp", type: "income", userId },
          });
        }
        await tx.transaction.create({
          data: {
            type: "income",
            amount: totalAmount,
            description: `Vente: ${qty} x ${product.name}`,
            scope: "activity",
            categoryId: ventesCategory.id,
            userId,
            saleId: createdSale.id,
            date: new Date(),
          },
        });

        return createdSale;
      });
    } catch (e) {
      if (e instanceof Error && e.message === "STOCK_INSUFFISANT") {
        return badRequest("Stock insuffisant");
      }
      throw e;
    }

    const saleWithProduct = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: { product: true },
    });

    // Échec de la notification : ne doit pas transformer une écriture committée en erreur.
    await createNotification(userId, "sale", `Vente : ${qty} x ${product.name} — ${formatCurrency(effectivePrice * qty, currency || "XOF")}`, "/dashboard/sales").catch(() => {});

    return created({ sale: saleWithProduct });
  } catch {
    return badRequest("Erreur lors de la vente");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id, quantity, unitPrice } = await req.json();

    if (!id || !quantity) {
      return badRequest("ID et quantité requis");
    }

    const saleId = parseInt(id, 10);
    const qty = parsePositiveInt(quantity);
    if (!Number.isFinite(saleId) || qty === null) {
      return badRequest("Quantité invalide");
    }

    const existingSale = await prisma.sale.findFirst({
      where: { id: saleId, userId },
      include: { product: true },
    });

    if (!existingSale) {
      return badRequest("Vente introuvable");
    }

    const price = unitPrice != null ? parseMoney(unitPrice) : existingSale.unitPrice;
    if (price === null || price < 0) {
      return badRequest("Prix unitaire invalide");
    }

    let sale;
    try {
      sale = await prisma.$transaction(async (tx) => {
        const stockDiff = existingSale.quantity - qty;

        if (stockDiff < 0) {
          // Augmentation de quantité : il faut du stock disponible en plus.
          const need = Math.abs(stockDiff);
          const decremented = await tx.product.updateMany({
            where: { id: existingSale.productId, stock: { gte: need } },
            data: { stock: { decrement: need } },
          });
          if (decremented.count === 0) {
            throw new Error("STOCK_INSUFFISANT");
          }
        } else if (stockDiff > 0) {
          // Diminution de quantité : on rend le surplus de stock.
          await tx.product.update({
            where: { id: existingSale.productId },
            data: { stock: { increment: stockDiff } },
          });
        }

        const totalAmount = price * qty;
        const unitProfit = price - existingSale.product.purchasePrice;
        const profit = unitProfit * qty;

        const updatedSale = await tx.sale.update({
          where: { id: saleId },
          data: {
            quantity: qty,
            unitPrice: price,
            totalAmount,
            profit,
          },
        });

        // Garde le mouvement de stock et la transaction de revenu cohérents.
        await tx.stockMovement.updateMany({
          where: { saleId, userId },
          data: { quantity: qty, description: `Vente: ${qty} x ${existingSale.product.name}` },
        });

        await tx.transaction.updateMany({
          where: { saleId, userId },
          data: {
            amount: totalAmount,
            description: `Vente: ${qty} x ${existingSale.product.name}`,
          },
        });

        return updatedSale;
      });
    } catch (e) {
      if (e instanceof Error && e.message === "STOCK_INSUFFISANT") {
        return badRequest("Stock insuffisant");
      }
      throw e;
    }

    const saleWithProduct = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: { product: true },
    });

    return ok({ sale: saleWithProduct });
  } catch {
    return badRequest("Erreur lors de la modification");
  }
}
