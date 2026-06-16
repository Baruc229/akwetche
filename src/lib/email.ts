const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "Akwetche <noreply@brevo.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function emailLayout(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f0;padding:40px 20px">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden">
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px 24px;text-align:center">
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700">Akwetche</h1>
              <p style="color:#a7f3d0;font-size:14px;margin:4px 0 0">Gestion financière personnelle</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px">
              <h2 style="color:#1c1917;font-size:20px;margin:0 0 16px;font-weight:600">${title}</h2>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background-color:#fafaf9;text-align:center;border-top:1px solid #e7e5e4">
              <p style="color:#a8a29e;font-size:12px;margin:0">
                Akwetche — © ${new Date().getFullYear()}. Tous droits réservés.
                <br>Si vous n'êtes pas à l'origine de cette action, ignorez cet email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not set — email not sent");
    return { error: "BREVO_API_KEY not configured" };
  }

  const [name, email] = FROM_EMAIL.match(/^(.*?)\s*<(.+)>$/)?.slice(1) ?? [
    "Akwetche",
    FROM_EMAIL,
  ];

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name, email },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Brevo error:", body);
    return { error: body };
  }

  return await res.json();
}

export function verificationEmailHtml(token: string): string {
  const url = `${APP_URL}/api/auth/verify-email?token=${token}`;
  return emailLayout(
    "Confirmez votre email",
    `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Merci de votre inscription sur Akwetche ! Veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Confirmer mon email</a>
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:0">Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>`
  );
}

export function resetPasswordEmailHtml(token: string): string {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return emailLayout(
    "Réinitialisation du mot de passe",
    `<p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour le modifier :</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px">
      <tr>
        <td align="center">
          <a href="${url}" style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">Réinitialiser mon mot de passe</a>
        </td>
      </tr>
    </table>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:0">Ce lien expirera dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>`
  );
}
