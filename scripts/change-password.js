// Usage: node scripts/change-password.js [email] [new-password]
// Requires the Next.js dev server running on http://localhost:3000
// and the admin token cookie (run from browser devtools instead)

console.log("⚠️  Pour changer le mot de passe, connecte-toi en tant qu'admin et utilise la page de réinitialisation :");
console.log("   http://localhost:3000/login/forgot-password");
console.log("");
console.log("Ou directement en DB via psql ou le dashboard Neon.");
