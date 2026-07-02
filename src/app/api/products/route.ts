import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok, created } from "@/lib/api";
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

    const product = await prisma.product.create({
      data: {
        name,
        purchasePrice: parseFloat(purchasePrice || "0"),
        salePrice: parseFloat(salePrice || "0"),
        stock: parseInt(stock || "0"),
        userId,
      },
    });

    if (parseInt(stock || "0") > 0) {
      await prisma.stockMovement.create({
        data: {
          type: "in",
          quantity: parseInt(stock),
          description: "Stock initial",
          productId: product.id,
          userId,
        },
      });
    }

    await createNotification(userId, "product", `Produit ajouté : ${product.name}`, "/dashboard/products");

    return created({ product });
  } catch {
    return badRequest("Erreur lors de la création");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { id, name, purchasePrice, salePrice } = await req.json();

    const product = await prisma.product.updateMany({
      where: { id: parseInt(id), userId },
      data: {
        name,
        purchasePrice: parseFloat(purchasePrice),
        salePrice: parseFloat(salePrice),
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

    await prisma.sale.deleteMany({
      where: { productId, userId },
    });

    await prisma.product.deleteMany({
      where: { id: productId, userId },
    });
    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
