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
    return ok({ products });
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
    await prisma.product.deleteMany({
      where: { id: parseInt(id), userId },
    });
    return ok({ success: true });
  } catch {
    return badRequest("Erreur lors de la suppression");
  }
}
