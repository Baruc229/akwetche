import { describe, it, expect } from "vitest";
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateEmailToken,
} from "@/lib/auth";

const BCRYPT_TIMEOUT = 15000;

describe("auth — Hachage de mot de passe", () => {
  it("hashPassword retourne un hash différent du mot de passe", async () => {
    const hash = await hashPassword("monpassword123");
    expect(hash).not.toBe("monpassword123");
    expect(hash.length).toBeGreaterThan(20);
  }, BCRYPT_TIMEOUT);

  it("comparePassword retourne vrai pour le bon mot de passe", async () => {
    const hash = await hashPassword("testpassword");
    expect(await comparePassword("testpassword", hash)).toBe(true);
  }, BCRYPT_TIMEOUT);

  it("comparePassword retourne faux pour un mauvais mot de passe", async () => {
    const hash = await hashPassword("testpassword");
    expect(await comparePassword("wrongpassword", hash)).toBe(false);
  }, BCRYPT_TIMEOUT);

  it("deux hashes du même mot de passe sont différents (salt)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
    expect(await comparePassword("samepassword", hash1)).toBe(true);
    expect(await comparePassword("samepassword", hash2)).toBe(true);
  }, BCRYPT_TIMEOUT);
});

describe("auth — JWT Tokens", () => {
  it("generateToken retourne une chaîne non vide", () => {
    const token = generateToken(42);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("verifyToken décode un token valide", () => {
    const token = generateToken(42);
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe(42);
  });

  it("verifyToken retourne null pour un token invalide", () => {
    expect(verifyToken("token-invalide")).toBeNull();
  });

  it("verifyToken retourne null pour un token expiré", async () => {
    const jwt = await import("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "dev-jwt-secret-do-not-use-in-production";
    const token = jwt.default.sign({ userId: 1 }, secret, { expiresIn: "0s" });
    const payload = verifyToken(token);
    expect(payload).toBeNull();
  });
});

describe("auth — Email Token", () => {
  it("generateEmailToken retourne une chaîne hexadécimale", () => {
    const token = generateEmailToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deux tokens sont différents", () => {
    const token1 = generateEmailToken();
    const token2 = generateEmailToken();
    expect(token1).not.toBe(token2);
  });
});
