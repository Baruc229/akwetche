import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";
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

    const qty = parseInt(quantity);
    const product = await prisma.product.findFirst({
      where: { id: parseInt(productId), userId },
    });

    if (!product) {
      return badRequest("Produit introuvable");
    }

    const movement = await prisma.stockMovement.create({
      data: {
        type,
        quantity: qty,
        description: description || "",
        productId: product.id,
        userId,
      },
      include: { product: true },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: type === "in" ? product.stock + qty : Math.max(0, product.stock - qty),
      },
    });

    const direction = type === "in" ? "Entrée" : "Sortie";
    await createNotification(userId, "stock", `${direction} stock : ${qty} x ${product.name}`, "/dashboard/stock");

    return created({ movement });
  } catch {
    return badRequest("Erreur lors du mouvement de stock");
  }
}
