// Verify the explorer updates when the Sankey selection changes,
// and that prev/next navigation cycles through the cohort.
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2200 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForSelector(".explorer-card");

// Default state — top of full cohort
const defaultId = await page.locator(".explorer-kv").first().locator(".explorer-v").innerText();
console.log("Default first ID:", defaultId);

// Filter to "Short ship" via dropdown
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(150);
const filteredId = await page.locator(".explorer-kv").first().locator(".explorer-v").innerText();
const filteredHeadline = await page.locator(".explorer-card").nth(2).locator(".explorer-headline").innerText();
console.log("Filtered (Short ship) first ID:", filteredId);
console.log("Filtered (Short ship) root cause headline:", filteredHeadline);
await page.screenshot({ path: "explorer-short-ship.png", fullPage: true });

// Click Next
await page.locator(".explorer-nav button").nth(2).click();
await page.waitForTimeout(100);
const nextId = await page.locator(".explorer-kv").first().locator(".explorer-v").innerText();
const nextContext = await page.locator(".explorer-context").innerText();
console.log("After Next ID:", nextId);
console.log("After Next context:", nextContext.replace(/\s+/g, " ").trim());

console.log("Errors:", errors);
await browser.close();
