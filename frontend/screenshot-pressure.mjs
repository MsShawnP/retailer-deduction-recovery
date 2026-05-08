// Verify the timeline pressure view: bucket counts, cross-tab,
// urgent list, bucket selection, cohort filter pass-through, trace
// cross-link.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 4200 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".pressure-bucket");

const ctx = await page.locator(".pressure-context").innerText();
console.log("Context:", ctx.replace(/\s+/g, " ").trim());

async function readBuckets() {
  const buckets = await page.locator(".pressure-bucket").all();
  const out = [];
  for (const b of buckets) {
    out.push((await b.innerText()).replace(/\s+/g, " ").trim());
  }
  return out;
}

console.log("\nBuckets:");
for (const b of await readBuckets()) console.log("  " + b);

// Read cross-tab
const xrows = await page.locator(".pressure-crosstab-table tbody tr").all();
console.log("\nCross-tab rows:");
for (const r of xrows) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

// Read default urgent list
const headerH3 = await page.locator(".pressure-table-header h3").innerText();
console.log("\nDefault list header:", headerH3.replace(/\s+/g, " ").trim());

const rowCount = await page.locator(".pressure-table tbody tr").count();
console.log("Default list rows:", rowCount);
const firstRow = await page.locator(".pressure-table tbody tr").first().innerText().catch(() => "(empty)");
console.log("Top row:", firstRow.replace(/\s+/g, " ").trim());

await page.screenshot({ path: "pressure-default.png", fullPage: true });

// Click Critical bucket
await page.locator(".pressure-bucket-critical").click();
await page.waitForTimeout(150);
const critH3 = await page.locator(".pressure-table-header h3").innerText();
const critRows = await page.locator(".pressure-table tbody tr").count();
console.log("\nCritical-only list:", critH3.replace(/\s+/g, " ").trim(), "rows:", critRows);

// Click Expired bucket
await page.locator(".pressure-bucket-expired").click();
await page.waitForTimeout(150);
const expH3 = await page.locator(".pressure-table-header h3").innerText();
const expRows = await page.locator(".pressure-table tbody tr").count();
console.log("Expired-only list:", expH3.replace(/\s+/g, " ").trim(), "rows:", expRows);

// Click Trace on first row → check trace summary populates
await page.locator(".pressure-trace-btn").first().click();
await page.waitForTimeout(400);
const traceSummary = await page.locator(".trace-summary").innerText().catch(() => "(no trace)");
console.log("\nTrace summary after Trace click:", traceSummary.replace(/\s+/g, " ").trim());

// Filter cohort to short_ship
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);
const ssCtx = await page.locator(".pressure-context").innerText();
console.log("\nShort-ship cohort context:", ssCtx.replace(/\s+/g, " ").trim());
console.log("Short-ship buckets:");
for (const b of await readBuckets()) console.log("  " + b);

await page.screenshot({ path: "pressure-short-ship.png", fullPage: true });

console.log("\nErrors:", errors);
await browser.close();
