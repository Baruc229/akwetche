import puppeteer, { type Browser } from "puppeteer-core";

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  if (process.env.VERCEL) {
    const chromium = await import("@sparticuz/chromium");
    const execPath = await chromium.default.executablePath();
    _browser = await puppeteer.launch({
      args: chromium.default.args,
      executablePath: execPath,
      headless: true,
    });
  } else {
    const { accessSync } = await import("fs");
    const localPaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH || "",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ].filter(Boolean);

    let execPath = "";
    for (const p of localPaths) {
      try {
        accessSync(p);
        execPath = p;
        break;
      } catch {
        continue;
      }
    }

    if (!execPath) {
      throw new Error(
        "No Chromium/Chrome executable found. Install Chrome or set PUPPETEER_EXECUTABLE_PATH."
      );
    }

    _browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      executablePath: execPath,
      headless: true,
    });
  }

  return _browser;
}

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15000 });

    const raw = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: false,
    });

    return Buffer.from(raw);
  } finally {
    await page.close();
  }
}
