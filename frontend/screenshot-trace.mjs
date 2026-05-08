// Verify the causation trace: empty state, click "Trace this order"
// in the explorer, the trace populates with a chronological timeline,
// nav buttons cycle through the cohort.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 2400 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".explorer-card");
await page.waitForSelector(".trace");

// 1. Empty state
const emptyText = await page.locator(".trace-empty").innerText();
console.log("Empty state:", emptyText.replace(/\s+/g, " ").trim());

// 2. Click trace this order button
const explorerDeductionId = await page
  .locator(".explorer-kv")
  .first()
  .locator(".explorer-v")
  .innerText();
console.log("Explorer current ID:", explorerDeductionId);

await page.locator(".explorer-trace-btn").click();
await page.waitForSelector(".trace-timeline");
await page.waitForTimeout(200);

const summaryText = await page.locator(".trace-summary").innerText();
console.log("Trace summary:", summaryText.replace(/\s+/g, " ").trim());

const eventCount = await page.locator(".trace-event").count();
console.log("Timeline event count:", eventCount);

const stepNames = await page.locator(".trace-step").allInnerTexts();
console.log("Steps:", stepNames);

const severityCounts = {};
for (const sev of ["ok", "warn", "fail", "neutral"]) {
  severityCounts[sev] = await page.locator(`.trace-event.sev-${sev}`).count();
}
console.log("Severity counts:", severityCounts);

await page.screenshot({ path: "trace-default.png", fullPage: true });

// 3. Nav: click Next on the trace
await page.locator(".trace-nav button").nth(2).click();
await page.waitForTimeout(150);
const nextSummary = await page.locator(".trace-summary").innerText();
console.log("After Next:", nextSummary.replace(/\s+/g, " ").trim());

// 4. Filter cohort to short_ship and re-trace
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);

// trace should reset (deduction may not be in new cohort)
const traceEmptyAfterFilter = await page.locator(".trace-empty").count();
console.log("Trace empty after filter (1 = empty / 0 = still tracing):", traceEmptyAfterFilter);

await page.locator(".explorer-trace-btn").click();
await page.waitForSelector(".trace-timeline");
await page.waitForTimeout(200);

const shortShipSteps = await page.locator(".trace-step").allInnerTexts();
console.log("Short-ship trace steps:", shortShipSteps);
const shortShipSummary = await page.locator(".trace-summary").innerText();
console.log("Short-ship summary:", shortShipSummary.replace(/\s+/g, " ").trim());

await page.screenshot({ path: "trace-short-ship.png", fullPage: true });

// 5. Clear trace
await page.locator(".trace-clear").click();
await page.waitForTimeout(100);
const clearedEmpty = await page.locator(".trace-empty").count();
console.log("After clear, trace empty (expect 1):", clearedEmpty);

console.log("Errors:", errors);
await browser.close();
