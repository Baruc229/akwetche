import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created, parseMoney } from "@/lib/api";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  try {
    const userId = await requireAuth();
    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    const inMovements = await prisma.stockMovement.groupBy({
      by: ["productId"],
      where: { userId, type: "in" },
      _sum: { quantity: true },
    });
    const initialStockMap: Record<number, number> = {};
    for (const m of inMovements) {
      initialStockMap[m.productId] = m._sum.quantity ?? 0;
    }

    const enriched = products.map((p) => ({
      ...p,
      initialStock: initialStockMap[p.id] ?? p.stock,
    }));

    return ok({ products: enriched });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { name, purchasePrice, salePrice, stock } = await req.json();

    if (!name) {
      return badRequest("Le nom du produit est requis");
    }

    const purchase = parseMoney(purchasePrice ?? "0") ?? 0;
    const price = parseMoney(salePrice ?? "0") ?? 0;
    const initialStock = parseInt(stock ?? "0", 10);
    if (purchase < 0 || price < 0) return badRequest("Prix invalide");
    if (!Number.isFinite(initialStock) || initialStock < 0) return badRequest("Stock initial invalide");

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          purchasePrice: purchase,
          salePrice: price,
          stock: initialStock,
          userId,
        },
      });

      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            type: "in",
            quantity: initialStock,
            description: "Stock initial",
            productId: createdProduct.id,
            userId,
          },
        });
      }

      return createdProduct;
    });

    await createNotification(userId, "product", `Produit ajouté : ${product.name}`, "/dashboard/products").catch(() => {});

    return created({ product });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id, name, purchasePrice, salePrice } = await req.json();

    const purchase = parseMoney(purchasePrice ?? "0") ?? 0;
    const price = parseMoney(salePrice ?? "0") ?? 0;
    if (purchase < 0 || price < 0) return badRequest("Prix invalide");

    const product = await prisma.product.updateMany({
      where: { id: parseInt(id), userId },
      data: {
        name,
        purchasePrice: purchase,
        salePrice: price,
      },
    });

    return ok({ product });
  } catch {
    return badRequest("Erreur lors de la modification");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id } = await req.json();
    const productId = parseInt(id);

    // Atomicité : la suppression des ventes cascade vers les mouvements de
    // stock et les transactions de revenu liés (saleId).
    await prisma.$transaction(async (tx) => {
      await tx.sale.deleteMany({
        where: { productId, userId },
      });

      await tx.product.deleteMany({
        where: { id: productId, userId },
      });
    });
    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
