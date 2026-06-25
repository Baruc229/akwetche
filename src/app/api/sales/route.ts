import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
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
    const { productId, quantity } = await req.json();

    if (!productId || !quantity) {
      return badRequest("Produit et quantité requis");
    }

    const product = await prisma.product.findFirst({
      where: { id: parseInt(productId), userId },
    });

    if (!product) {
      return badRequest("Produit introuvable");
    }

    const qty = parseInt(quantity);
    if (qty > product.stock) {
      return badRequest("Stock insuffisant");
    }

    const unitPrice = product.salePrice;
    const totalAmount = unitPrice * qty;
    const unitProfit = product.salePrice - product.purchasePrice;
    const profit = unitProfit * qty;

    const sale = await prisma.sale.create({
      data: {
        quantity: qty,
        unitPrice,
        totalAmount,
        profit,
        productId: product.id,
        userId,
      },
      include: { product: true },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: product.stock - qty },
    });

    await prisma.stockMovement.create({
      data: {
        type: "out",
        quantity: qty,
        description: `Vente: ${qty} x ${product.name}`,
        productId: product.id,
        userId,
      },
    });

    // Créer auto une transaction revenu activité
    let ventesCategory = await prisma.category.findFirst({
      where: { name: "Ventes", userId, type: "income" },
    });
    if (!ventesCategory) {
      ventesCategory = await prisma.category.create({
        data: { name: "Ventes", icon: "TrendingUp", type: "income", userId },
      });
    }
    await prisma.transaction.create({
      data: {
        type: "income",
        amount: totalAmount,
        description: `Vente: ${qty} x ${product.name}`,
        scope: "activity",
        categoryId: ventesCategory.id,
        userId,
        date: new Date(),
      },
    });

    await createNotification(userId, "sale", `Vente : ${qty} x ${product.name} — ${totalAmount.toLocaleString()} FCFA`, "/dashboard/sales");

    return created({ sale });
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

    const existingSale = await prisma.sale.findFirst({
      where: { id: parseInt(id), userId },
      include: { product: true },
    });

    if (!existingSale) {
      return badRequest("Vente introuvable");
    }

    const qty = parseInt(quantity);
    const price = unitPrice ? parseFloat(unitPrice) : existingSale.unitPrice;
    const totalAmount = price * qty;
    const unitProfit = price - existingSale.product.purchasePrice;
    const profit = unitProfit * qty;

    const stockDiff = existingSale.quantity - qty;
    if (stockDiff < 0 && Math.abs(stockDiff) > existingSale.product.stock) {
      return badRequest("Stock insuffisant");
    }

    await prisma.product.update({
      where: { id: existingSale.productId },
      data: { stock: { increment: stockDiff } },
    });

    const sale = await prisma.sale.update({
      where: { id: parseInt(id) },
      data: {
        quantity: qty,
        unitPrice: price,
        totalAmount,
        profit,
      },
      include: { product: true },
    });

    return ok({ sale });
  } catch {
    return badRequest("Erreur lors de la modification");
  }
}
