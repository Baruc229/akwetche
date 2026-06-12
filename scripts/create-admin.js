// Usage: node scripts/create-admin.js <email> <password> <name>
// Requires the Next.js dev server running on http://localhost:3000
// Example: node scripts/create-admin.js admin@akwetche.app MonMotDePasse123 "Admin"

const http = require("http");
const crypto = require("crypto");

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "Admin";

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.js <email> <password> [name]");
  console.error("Example: node scripts/create-admin.js admin@akwetche.app MonMotDePasse123");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caractères");
  process.exit(1);
}

const baseUrl = process.env.APP_URL || "http://localhost:3000";
const data = JSON.stringify({ name, email, password, plan: "free", initialBalance: 1000000, currency: "XOF" });

const options = {
  hostname: new URL(baseUrl).hostname,
  port: new URL(baseUrl).port || 3000,
  path: "/api/auth/register",
  method: "POST",
  headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
};

const req = http.request(options, (res) => {
  let body = "";
  res.on("data", (chunk) => (body += chunk));
  res.on("end", () => {
    const result = JSON.parse(body);
    if (res.statusCode === 201) {
      console.log("✅ Admin créé :", email);
      console.log("📧 Vérifie l'email pour confirmer le compte (ou utilise /api/seed)");
    } else {
      console.log("⚠️", result.error || result.message);
    }
  });
});

req.on("error", (e) => console.error("❌ Erreur :", e.message));
req.write(data);
req.end();
