import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@akwetche.app";
const ADMIN_PASSWORD = "admin123";

test.describe("Dashboard (protégé)", () => {
  test("redirige vers /login si non authentifié", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("affiche le dashboard après connexion", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 15000 });
    expect(page.url()).toContain("/dashboard");
  });
});

test.describe("Transactions (protégé)", () => {
  test("redirige vers /login si non authentifié", async ({ page }) => {
    await page.goto("/dashboard/transactions");
    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

test.describe("Settings (protégé)", () => {
  test("redirige vers /login si non authentifié", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForURL("**/login**", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
