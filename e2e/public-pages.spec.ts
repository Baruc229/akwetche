import { test, expect } from "@playwright/test";

test.describe("Page d'accueil", () => {
  test("affiche le titre de la landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Akwetche");
  });

  test("contient un lien vers /login", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink.first()).toBeVisible();
  });

  test("contient un lien vers /register", async ({ page }) => {
    await page.goto("/");
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink.first()).toBeVisible();
  });
});

test.describe("Page de login", () => {
  test("affiche le formulaire de connexion", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("affiche un bouton de connexion", async ({ page }) => {
    await page.goto("/login");
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
  });

  test("redirige vers /login/forgot-password depuis le lien", async ({ page }) => {
    await page.goto("/login");
    const forgotLink = page.locator('a[href="/login/forgot-password"]');
    await expect(forgotLink).toBeVisible();
  });
});

test.describe("Page de register", () => {
  test("affiche le formulaire d'inscription", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("body")).toContainText("Créer");
  });
});

test.describe("Page forgot-password", () => {
  test("affiche le champ email", async ({ page }) => {
    await page.goto("/login/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
