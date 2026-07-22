import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, badRequest, ok } from "@/lib/api";

const MAX_SIZE = 2 * 1024 * 1024; // 2 Mo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BASE64_LENGTH = Math.ceil(MAX_SIZE * 4 / 3) + 100; // base64 overhead

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { avatar } = await req.json();

    if (!avatar || typeof avatar !== "string") {
      return badRequest("Aucune image fournie");
    }

    // Check base64 format
    if (!avatar.startsWith("data:image/")) {
      return badRequest("Format d'image invalide");
    }

    // Extract MIME type
    const mimeMatch = avatar.match(/^data:(image\/[a-z+]+);base64,/);
    if (!mimeMatch) {
      return badRequest("Format d'image invalide");
    }

    const mime = mimeMatch[1];
    if (!ALLOWED_TYPES.includes(mime)) {
      return badRequest("Format non supporté (JPEG, PNG, WebP uniquement)");
    }

    // Check size (base64 length × 0.75 ≈ raw bytes)
    const base64Data = avatar.split(",")[1];
    if (!base64Data || base64Data.length > MAX_BASE64_LENGTH) {
      return badRequest("Image trop lourde (max 2 Mo)");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: avatar },
    });

    return ok({ avatarUrl: user.avatarUrl });
  } catch {
    return badRequest("Non autorisé");
  }
}

export async function DELETE() {
  try {
    const userId = await requireAuth();

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return ok({ success: true });
  } catch {
    return badRequest("Non autorisé");
  }
}
