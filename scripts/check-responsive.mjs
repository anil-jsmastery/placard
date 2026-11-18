#!/usr/bin/env node
// Responsive check (design-system §13). Opens each path at six widths and fails on:
//   1. the page scrolls sideways
//   2. a visible element (outside [inert], [aria-hidden="true"] and scroll boxes) ends past the right edge
//   3. below 640 px, tap targets under 40 px (buttons, inputs, selects, textareas, summary, [role=radio])
//      or under 36 px (chips [aria-pressed], tabs, menu items, button-styled links)
//   4. visible text under 12 px
//   5. below 640 px, inputs, textareas and selects with text under 16 px
// Saves notes/responsive/<path-slug>-<width>.png per page and width, prints a pass/fail table, exits 1 on any failure.
//
// Usage: node scripts/check-responsive.mjs [--base http://localhost:3000] [--signed-in] [--site <id>] <path> [<path> …]

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { chromium } from "@playwright/test";

config({ path: ".env.local", quiet: true });

const WIDTHS = [
  [360, 780],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
];
const OUT_DIR = "notes/responsive";

function parseArgs(argv) {
  const opts = { base: "http://localhost:3000", signedIn: false, site: null, paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base") opts.base = argv[++i];
    else if (a === "--signed-in") opts.signedIn = true;
    else if (a === "--site") opts.site = argv[++i];
    else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else opts.paths.push(a);
  }
  if (!opts.paths.length) throw new Error("Give at least one path, e.g. node scripts/check-responsive.mjs /dashboard");
  opts.base = opts.base.replace(/\/$/, "");
  opts.paths = opts.paths.map((p) => {
    if (p.includes("{id}")) {
      if (!opts.site) throw new Error(`${p} needs --site <id>`);
      return p.replaceAll("{id}", opts.site);
    }
    return p;
  });
  return opts;
}

const slugOf = (p) => p.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-") || "home";

// ---- Sign-in with the E2E test user (a +clerk_test address, verification code 424242) ----

async function clerkUserExists(email) {
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Clerk user lookup failed (${res.status})`);
  const users = await res.json();
  return Array.isArray(users) && users.length > 0;
}

// Signs up through the app's own /sign-up page, so the account is made exactly like a real one
// (Clerk's user.created webhook creates the users row and sends signed_up).
async function signUpThroughUi(page, base, email) {
  await page.goto(`${base}/sign-up`);
  await page.locator('input[name="emailAddress"]').fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const code = page.locator('input[autocomplete="one-time-code"], input[name="code"]').first();
  await code.waitFor({ timeout: 20000 });
  await code.pressSequentially("424242");
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function signIn(context, base) {
  const email = process.env.E2E_USER_EMAIL;
  if (!email || !email.includes("+clerk_test")) throw new Error("E2E_USER_EMAIL must be a +clerk_test address in .env.local");
  const { clerkSetup, setupClerkTestingToken, clerk } = await import("@clerk/testing/playwright");
  await clerkSetup();
  await setupClerkTestingToken({ context });
  const page = await context.newPage();
  if (!(await clerkUserExists(email))) {
    await signUpThroughUi(page, base, email);
  } else {
    await page.goto(`${base}/sign-in`);
    await clerk.signIn({ page, signInParams: { strategy: "email_code", identifier: email } });
  }
  await page.close();
}

// ---- The checks, run inside the page ----

function runChecks(width) {
  const failures = [];
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const phone = width < 640;

  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${tag}${id}${label ? ` "${label}"` : ""}`;
  };
  const hiddenByAncestor = (el) => !!el.closest('[inert], [aria-hidden="true"]');
  const isVisible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const isSrOnly = (el) => !!el.closest(".sr-only");
  const inScrollBox = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden" || ox === "clip") return true;
    }
    return false;
  };

  // 1. sideways scroll
  if (doc.scrollWidth > doc.clientWidth) {
    failures.push({ rule: 1, element: `page scrolls sideways (${doc.scrollWidth} > ${doc.clientWidth})` });
  }

  const all = [...document.body.querySelectorAll("*")].filter(
    (el) => !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "LINK", "META"].includes(el.tagName),
  );

  // 2. elements past the right edge
  for (const el of all) {
    if (hiddenByAncestor(el) || isSrOnly(el) || !isVisible(el) || inScrollBox(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1) failures.push({ rule: 2, element: `${describe(el)} ends at ${Math.round(r.right)}px > ${vw}px` });
  }

  // 3. tap targets (phones)
  if (phone) {
    const targets40 = 'button, input:not([type="hidden"]), select, textarea, summary, [role="radio"]';
    const targets36 = '[aria-pressed], [role="tab"], [role="menuitem"], a';
    const seen = new Set();
    const check = (el, min) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (hiddenByAncestor(el) || isSrOnly(el) || !isVisible(el)) return;
      if (el.matches('[role="switch"]')) return;
      if (el.tagName === "A") {
        // text links inside sentences don't count; stretched card links don't either
        if (el.closest("p, li, td, figcaption")) return;
        if (getComputedStyle(el, "::after").position === "absolute") return;
        const s = getComputedStyle(el);
        const filled = s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent";
        const bordered = parseFloat(s.borderTopWidth) > 0;
        const buttonLike = (s.display === "inline-flex" || s.display === "flex") && (filled || bordered || el.matches('[class*="h-"]'));
        if (!buttonLike) return;
      }
      const limit = el.matches("[data-small-target]") ? 32 : min;
      const r = el.getBoundingClientRect();
      const smaller = Math.min(r.width, r.height);
      if (smaller + 0.5 < limit) failures.push({ rule: 3, element: `${describe(el)} is ${Math.round(r.width)}×${Math.round(r.height)} (< ${limit})` });
    };
    // chips and tabs first: an element matching both lists is held to 36 (check skips elements it has seen)
    document.querySelectorAll(targets36).forEach((el) => check(el, 36));
    document.querySelectorAll(targets40).forEach((el) => check(el, 40));
  }

  // 4. text under 12 px
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const reported = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || reported.has(el) || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
    if (hiddenByAncestor(el) || isSrOnly(el) || !isVisible(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) {
      reported.add(el);
      failures.push({ rule: 4, element: `${describe(el)} text is ${size}px` });
    }
  }

  // 5. form controls under 16 px (phones)
  if (phone) {
    for (const el of document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select')) {
      if (hiddenByAncestor(el) || !isVisible(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 16) failures.push({ rule: 5, element: `${describe(el)} text is ${size}px` });
    }
  }

  return failures;
}

// ---- Main ----

const opts = parseArgs(process.argv.slice(2));
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext();
let exitCode = 0;

try {
  if (opts.signedIn) await signIn(context, opts.base);

  const rows = [];
  for (const p of opts.paths) {
    for (const [width, height] of WIDTHS) {
      const page = await context.newPage();
      await page.setViewportSize({ width, height });
      const response = await page.goto(`${opts.base}${p}`, { waitUntil: "load" });
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
      await page.evaluate(() => document.fonts?.ready);
      const failures = await page.evaluate(runChecks, width);
      const finalUrl = new URL(page.url()).pathname;
      if (!response || !response.ok()) failures.unshift({ rule: 0, element: `HTTP ${response ? response.status() : "no response"}` });
      if (finalUrl !== new URL(`${opts.base}${p}`).pathname) failures.unshift({ rule: 0, element: `redirected to ${finalUrl}, so the page itself wasn't checked` });
      const file = path.join(OUT_DIR, `${slugOf(p)}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      rows.push({ path: p, width, failures });
      await page.close();
    }
  }

  // Table: page × width
  console.log(`\nResponsive check · ${opts.base}${opts.signedIn ? " · signed in" : ""}\n`);
  const header = ["Page", ...WIDTHS.map(([w]) => String(w))];
  const table = opts.paths.map((p) => [
    p,
    ...WIDTHS.map(([w]) => {
      const r = rows.find((x) => x.path === p && x.width === w);
      return r.failures.length ? `FAIL(${r.failures.length})` : "pass";
    }),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...table.map((r) => r[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  table.forEach((r) => console.log(line(r)));

  const failed = rows.filter((r) => r.failures.length);
  if (failed.length) {
    exitCode = 1;
    console.log("\nFailures:");
    for (const r of failed) {
      for (const f of r.failures.slice(0, 15)) console.log(`  ${r.path} @ ${r.width}  rule ${f.rule}  ${f.element}`);
      if (r.failures.length > 15) console.log(`  ${r.path} @ ${r.width}  … ${r.failures.length - 15} more`);
    }
  } else {
    console.log("\nAll pages pass at all six widths.");
  }
  console.log(`\nScreenshots: ${OUT_DIR}/`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  exitCode = 1;
} finally {
  await browser.close();
}

process.exit(exitCode);
