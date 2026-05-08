// Screenshot the dropdown filter behavior — pick a type, verify
// Sankey + tables + dropdown stay in sync.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForSelector(".sankey-svg");

// Default state — confirm dropdown is "all"
await page.screenshot({ path: "dropdown-default.png", fullPage: true });
const defaultVal = await page.locator("#type-filter").inputValue();
console.log("Default dropdown value:", defaultVal);

// Pick "Short ship" via dropdown — Sankey should update
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForSelector(".selection-chip");
await page.screenshot({ path: "dropdown-short-ship.png", fullPage: true });
const chip1 = await page.locator(".selection-chip").innerText();
console.log("Chip after dropdown -> Short ship:", chip1.replace(/\n/g, " | "));

// Click the Sankey node whose <title> contains "Late delivery" — the
// element with that title is the rect inside the node group.
const lateDeliveryRect = page
  .locator(".sankey-node-rect")
  .filter({ has: page.locator("title", { hasText: /^Late delivery:/ }) })
  .first();
await lateDeliveryRect.click({ force: true });
await page.waitForTimeout(150);
const chip2 = await page.locator(".selection-chip").innerText();
const dropdownAfterClick = await page.locator("#type-filter").inputValue();
console.log("Chip after Sankey click:", chip2.replace(/\n/g, " | "));
console.log("Dropdown after Sankey click:", dropdownAfterClick);
await page.screenshot({ path: "dropdown-clicked-sync.png", fullPage: true });

// Reset via dropdown
await page.locator("#type-filter").selectOption("all");
await page.waitForTimeout(100);
const chipPresent = await page.locator(".selection-chip").count();
console.log("Chip count after reset:", chipPresent);

console.log("Errors:", errors);
await browser.close();
