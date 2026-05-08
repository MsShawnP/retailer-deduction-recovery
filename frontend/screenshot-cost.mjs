// Verify the cost-to-dispute view: bucket counts add up, slider moves
// the buckets, the digital-evidence toggle shifts the picture, and the
// "Trace →" cross-link sets the trace anchor.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 3200 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".cost-bucket");

async function readBuckets() {
  const buckets = await page.locator(".cost-bucket").all();
  const out = [];
  for (const b of buckets) {
    const txt = (await b.innerText()).replace(/\s+/g, " ").trim();
    out.push(txt);
  }
  return out;
}

console.log("Default ($42/hr, current evidence):");
for (const r of await readBuckets()) console.log("  " + r);

const ctx = await page.locator(".cost-context").innerText();
console.log("Context:", ctx.replace(/\s+/g, " ").trim());

const shift = await page.locator(".cost-shift").innerText().catch(() => "(no shift hint)");
console.log("Shift hint:", shift.replace(/\s+/g, " ").trim());

await page.screenshot({ path: "cost-default.png", fullPage: true });

// Move hourly rate slider to $80
await page.locator("#cost-rate").fill("80");
await page.dispatchEvent("#cost-rate", "input");
await page.waitForTimeout(150);
console.log("\nAt $80/hr:");
for (const r of await readBuckets()) console.log("  " + r);

// Reset hourly rate to default-ish
await page.locator("#cost-rate").fill("42");
await page.dispatchEvent("#cost-rate", "input");
await page.waitForTimeout(150);

// Toggle "Project with digital evidence"
await page.locator(".cost-control-toggle input").check();
await page.waitForTimeout(150);
console.log("\nWith digital evidence:");
for (const r of await readBuckets()) console.log("  " + r);
await page.screenshot({ path: "cost-digital.png", fullPage: true });

// Toggle off
await page.locator(".cost-control-toggle input").uncheck();
await page.waitForTimeout(150);

// Click Write off bucket; check the table swaps
await page.locator(".cost-bucket-writeoff").click();
await page.waitForTimeout(150);
const writeoffH3 = await page.locator(".cost-table-header h3").innerText();
const writeoffRows = await page.locator(".cost-table tbody tr").count();
console.log("\nWrite-off table:", writeoffH3, "rows:", writeoffRows);

// Click Fight bucket and verify a Trace button works
await page.locator(".cost-bucket-fight").click();
await page.waitForTimeout(150);
const fightH3 = await page.locator(".cost-table-header h3").innerText();
console.log("Fight table:", fightH3);

const firstId = await page.locator(".cost-id").first().innerText();
console.log("Top fight ID:", firstId);

// Click trace and check the trace section populates
await page.locator(".cost-trace-btn").first().click();
await page.waitForTimeout(400);
const traceSummary = await page.locator(".trace-summary").innerText().catch(() => "(no trace)");
console.log("Trace summary after Trace click:", traceSummary.replace(/\s+/g, " ").trim());

// Filter cohort to short_ship and confirm cost view rescopes
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);
const ssCtx = await page.locator(".cost-context").innerText();
console.log("\nShort-ship cohort context:", ssCtx.replace(/\s+/g, " ").trim());
console.log("Short-ship buckets:");
for (const r of await readBuckets()) console.log("  " + r);
await page.screenshot({ path: "cost-short-ship.png", fullPage: true });

console.log("\nErrors:", errors);
await browser.close();
