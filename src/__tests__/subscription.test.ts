import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  emailLayout: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/admin-emails", () => ({
  notifyAdmin: vi.fn(),
}));

import { daysUntil, daysSince, getSubscriptionStatus } from "@/lib/subscription";

describe("subscription — daysUntil", () => {
  it("retourne un nombre positif pour une date future", () => {
    const future = new Date(Date.now() + 10 * 86400000);
    expect(daysUntil(future)).toBeGreaterThanOrEqual(9);
    expect(daysUntil(future)).toBeLessThanOrEqual(11);
  });

  it("retourne 0 ou négatif pour une date passée", () => {
    const past = new Date(Date.now() - 5 * 86400000);
    expect(daysUntil(past)).toBeLessThanOrEqual(0);
  });
});

describe("subscription — daysSince", () => {
  it("retourne un nombre positif pour une date passée", () => {
    const past = new Date(Date.now() - 5 * 86400000);
    expect(daysSince(past)).toBeGreaterThanOrEqual(4);
    expect(daysSince(past)).toBeLessThanOrEqual(6);
  });

  it("retourne 0 pour aujourd'hui", () => {
    expect(daysSince(new Date())).toBe(0);
  });
});

describe("subscription — getSubscriptionStatus", () => {
  it("retourne 'Expiré' si le statut n'est pas active", () => {
    const result = getSubscriptionStatus(new Date("2099-01-01"), "expired");
    expect(result.label).toBe("Expiré");
    expect(result.variant).toBe("expired");
  });

  it("retourne 'Actif' si plus de 7 jours restants", () => {
    const future = new Date(Date.now() + 30 * 86400000);
    const result = getSubscriptionStatus(future, "active");
    expect(result.label).toBe("Actif");
    expect(result.variant).toBe("active");
  });

  it("retourne 'critical' si 3 jours ou moins", () => {
    const soon = new Date(Date.now() + 2 * 86400000);
    const result = getSubscriptionStatus(soon, "active");
    expect(result.variant).toBe("critical");
    expect(result.label).toContain("2 jours");
  });

  it("retourne 'warning' si 4-7 jours restants", () => {
    const warning = new Date(Date.now() + 5 * 86400000);
    const result = getSubscriptionStatus(warning, "active");
    expect(result.variant).toBe("warning");
    expect(result.label).toContain("5 jours");
  });

  it("retourne 'expired' si la date est passée", () => {
    const past = new Date(Date.now() - 1 * 86400000);
    const result = getSubscriptionStatus(past, "active");
    expect(result.variant).toBe("expired");
  });
});
