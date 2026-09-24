import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";

const output = "artifacts/landing-ui";
await mkdir(output, { recursive: true });

const port = 3211;
const origin = `http://127.0.0.1:${port}`;
const results = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const server = spawn("npm", ["run", "start", "--", "-p", String(port)], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: origin
  },
  stdio: ["ignore", "pipe", "pipe"]
});

server.stdout.on("data", chunk => process.stdout.write(chunk));
server.stderr.on("data", chunk => process.stderr.write(chunk));

let browser;

async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
  console.log(`PASS: ${name}`);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error("Next.js test server exited before startup.");
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(500);
  }
  assert.ok(ready, "Local landing page server must start");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    locale: "id-ID",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(origin, { waitUntil: "networkidle" });

  await check("Landing page renders core product story", async () => {
    await expect(page).toHaveTitle("Sertifikat Digital ITTS");
    await expect(
      page.getByRole("heading", { name: /Sertifikat digital yang rapi, valid, dan mudah dipercaya/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Masuk ke Dashboard" })).toBeVisible();
    await expect(page.getByAltText("Contoh desain sertifikat ITTS")).toBeVisible();
    await page.screenshot({ path: `${output}/landing-desktop.png`, fullPage: true });
  });

  await check("Feature and workflow sections contain the expected structure", async () => {
    assert.equal(await page.locator("article").filter({ hasText: "Template Library" }).count(), 1);
    for (const title of [
      "Template Library",
      "Manajemen Kegiatan",
      "Penerbitan Batch",
      "Validasi QR",
      "Immutable Versioning",
      "Audit Snapshot"
    ]) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    for (const title of ["Buat kegiatan", "Pilih template", "Terbitkan", "Verifikasi"]) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
  });

  await check("Public verification message is visible and factual", async () => {
    await expect(page.getByText("SERTIFIKAT VALID", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Keaslian sertifikat dapat diperiksa dalam hitungan detik."
      })
    ).toBeVisible();
    await expect(page.getByText(/Tanpa perlu login untuk memeriksa keaslian/)).toBeVisible();
  });

  await check("Landing page has no horizontal overflow at common widths", async () => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      await page.goto(origin, { waitUntil: "networkidle" });
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `Horizontal overflow at ${width}px`
      );
      if (width === 390) {
        await page.screenshot({ path: `${output}/landing-mobile.png`, fullPage: true });
      }
    }
  });

  await check("Global theme system works on the landing page", async () => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(origin, { waitUntil: "networkidle" });
    const trigger = page.locator('summary[aria-label^="Pilih tema"]');
    await trigger.click();
    await page.getByRole("button", { name: /Midnight/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("itts-system-theme")),
      "midnight"
    );
    await page.screenshot({ path: `${output}/landing-midnight.png`, fullPage: true });

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");

    await page.locator('summary[aria-label^="Pilih tema"]').click();
    await page.getByRole("button", { name: /^ITTS/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "itts");
  });

  await check("Admin navigation targets the existing login route", async () => {
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Admin", exact: true })
    ).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: "Masuk ke Dashboard" })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  await check("No unhandled browser errors", async () => {
    assert.deepEqual(pageErrors, []);
  });
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
