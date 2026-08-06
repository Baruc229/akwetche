import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created, parsePositiveInt } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const where: Record<string, unknown> = { userId };
    if (productId) where.productId = parseInt(productId);

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { product: true },
      orderBy: { date: "desc" },
      take: 100,
    });

    const products = await prisma.product.findMany({
      where: { userId },
    });

    const totalStockValue = products.reduce(
      (sum, p) => sum + p.purchasePrice * p.stock,
      0
    );

    const outOfStock = products.filter((p) => p.stock === 0);

    return ok({ movements, totalStockValue, outOfStock, productCount: products.length });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { productId, quantity, type, description } = await req.json();

    if (!productId || !quantity || !type) {
      return badRequest("Produit, quantité et type requis");
    }
    if (type !== "in" && type !== "out") {
      return badRequest("Type de mouvement invalide");
    }

    const qty = parsePositiveInt(quantity);
    const parsedProductId = parseInt(productId, 10);
    if (qty === null || !Number.isFinite(parsedProductId)) {
      return badRequest("Quantité invalide");
    }

    const product = await prisma.product.findFirst({
      where: { id: parsedProductId, userId },
    });

    if (!product) {
      return badRequest("Produit introuvable");
    }

    // Écriture atomique : une sortie ne peut jamais faire passer le stock en
    // négatif, et aucune lecture-modification-écriture non atomique.
    let movement;
    try {
      movement = await prisma.$transaction(async (tx) => {
        if (type === "out") {
          const decremented = await tx.product.updateMany({
            where: { id: product.id, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (decremented.count === 0) {
            throw new Error("STOCK_INSUFFISANT");
          }
        } else {
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: qty } },
          });
        }

        return tx.stockMovement.create({
          data: {
            type,
            quantity: qty,
            description: description || "",
            productId: product.id,
            userId,
          },
          include: { product: true },
        });
      });
    } catch (e) {
      if (e instanceof Error && e.message === "STOCK_INSUFFISANT") {
        return badRequest("Stock insuffisant");
      }
      throw e;
    }

    const direction = type === "in" ? "Entrée" : "Sortie";
    await createNotification(userId, "stock", `${direction} stock : ${qty} x ${product.name}`, "/dashboard/stock").catch(() => {});

    return created({ movement });
  } catch {
    return badRequest("Erreur lors du mouvement de stock");
  }
}
