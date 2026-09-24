// Isolated login smoke test. Never connects to production or uses its credentials.
// Prerequisites: npm run build; npm install --no-save @playwright/test;
//               npx playwright install chromium
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, expect } from "@playwright/test";

const origin = "http://localhost:3210";
const email = "login-ui-test@example.invalid";
const password = randomBytes(24).toString("hex");
const results = [];
const output = "artifacts/login-ui";
await mkdir(output, { recursive: true });
const env = {
  ...process.env,
  NODE_ENV: "production",
  DATABASE_URL: "", POSTGRES_URL: "", NEON_DATABASE_URL: "",
  BLOB_READ_WRITE_TOKEN: "", ADMIN_EMAIL: email, ADMIN_PASSWORD: password,
  AUTH_SECRET: randomBytes(32).toString("hex"), NEXT_TELEMETRY_DISABLED: "1"
};
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "3210"], { env, stdio: "ignore" });
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
      const response = await fetch(`${origin}/login`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) { ready = true; break; }
    } catch { /* wait for the isolated Next.js process */ }
    await sleep(500);
  }
  assert.ok(ready, "Local test server must start");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce", locale: "id-ID" });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`${origin}/login`, { waitUntil: "networkidle" });
  await check("Login page renders with branding and metadata", async () => {
    await expect(page).toHaveTitle("Masuk Admin | Sertifikat ITTS");
    await expect(page.getByRole("heading", { name: /Selamat datang\s+kembali/ })).toBeVisible();
    await expect(page.getByLabel("Email admin", { exact: true })).toBeVisible();
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
    await page.screenshot({ path: `${output}/login-desktop.png`, fullPage: true });
  });
  await check("Native validation blocks empty credentials", async () => {
    await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
    assert.equal(await page.locator("form").evaluate(form => form.checkValidity()), false);
    await expect(page).toHaveURL(`${origin}/login`);
  });
  await check("Password visibility works by mouse and keyboard", async () => {
    const input = page.getByLabel("Password", { exact: true });
    await expect(input).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Tampilkan password" }).click();
    await expect(input).toHaveAttribute("type", "text");
    const hide = page.getByRole("button", { name: "Sembunyikan password" });
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await hide.press("Enter");
    await expect(input).toHaveAttribute("type", "password");
  });
  await check("Caps Lock warning responds to keyboard state", async () => {
    const input = page.getByLabel("Password", { exact: true });
    await input.focus();
    await input.dispatchEvent("keyup", { key: "A", modifierCapsLock: true });
    await expect(page.locator("#login-caps-lock")).toContainText("Caps Lock aktif");
    await input.dispatchEvent("keyup", { key: "a", modifierCapsLock: false });
    await expect(page.locator("#login-caps-lock")).toBeEmpty();
  });
  await check("Mobile and tablet layouts have no horizontal overflow", async () => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole("button", { name: "Masuk ke dashboard" })).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow at ${width}px`);
      await page.screenshot({ path: `${output}/login-${width}.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check("Theme switcher offers many presets and persists the selected theme", async () => {
    const trigger = page.locator('summary[aria-label^="Pilih tema"]');
    await expect(trigger).toBeVisible();
    await trigger.click();
    assert.equal(await page.locator('button[aria-pressed]').count(), 16, "Expected 16 theme choices");
    await page.getByRole("button", { name: /Midnight/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
    assert.equal(await page.evaluate(() => localStorage.getItem("itts-system-theme")), "midnight");
    await page.screenshot({ path: `${output}/login-theme-midnight.png`, fullPage: true });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
    await page.locator('summary[aria-label^="Pilih tema"]').click();
    await page.getByRole("button", { name: /^ITTS/ }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "itts");
  });
  await check("Help is available without a dead reset-password link", async () => {
    await page.getByText("Butuh bantuan masuk?", { exact: true }).click();
    await expect(page.getByText(/Untuk kendala akses atau penggantian password/)).toBeVisible();
    await page.getByText("Butuh bantuan masuk?", { exact: true }).click();
  });
  await check("Loading state prevents double-submit and incorrect login shows an alert", async () => {
    await page.route("**/login", async route => {
      if (route.request().method() === "POST") await sleep(800);
      await route.continue();
    });
    await page.getByLabel("Email admin", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("incorrect-test-value");
    await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
    await expect(page.getByRole("button", { name: "Memeriksa akun..." })).toBeDisabled();
    await expect(page).toHaveURL(/\/login\?error=1$/);
    await expect(page.locator("#login-error")).toContainText("Email atau password tidak sesuai");
    await expect(page.locator("#login-error")).toBeFocused();
    await page.getByLabel("Email admin", { exact: true }).fill("");
    await page.getByLabel("Password", { exact: true }).fill("");
    await page.screenshot({ path: `${output}/login-error.png`, fullPage: true });
    await page.unroute("**/login");
  });
  await check("Existing Server Action signs in and logout clears the session", async () => {
    await page.getByLabel("Email admin", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await expect(page).toHaveURL(`${origin}/admin`, { timeout: 20000 });
    const session = (await context.cookies()).find(cookie => cookie.name === "itts_cert_admin");
    assert.ok(session?.httpOnly && session.secure, "Existing HTTP-only secure session should be set");
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(page).toHaveURL(`${origin}/`);
    assert.equal((await context.cookies()).some(cookie => cookie.name === "itts_cert_admin"), false);
  });
  await check("Login form still submits without client JavaScript", async () => {
    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const plain = await noJs.newPage();
    await plain.goto(`${origin}/login`);
    await plain.getByLabel("Email admin", { exact: true }).fill(email);
    await plain.getByLabel("Password", { exact: true }).fill("incorrect-test-value");
    await plain.getByRole("button", { name: "Masuk ke dashboard" }).click();
    await expect(plain).toHaveURL(/\/login\?error=1$/);
    await expect(plain.locator("#login-error")).toBeVisible();
    await noJs.close();
  });
  await check("No unhandled browser errors", async () => assert.deepEqual(pageErrors, []));
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  if (browser) await browser.close();
  server.kill("SIGTERM");
}
