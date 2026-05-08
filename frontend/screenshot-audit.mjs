// Verify the post-audit risk view: headline exposure, digital
// projection toggle, realized claims summary, retailer breakdown,
// evidence breakdown, trace cross-link, and cohort filter pass-through.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 4800 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".audit-headline-num");

const ctx = await page.locator(".audit-context").innerText();
console.log("Context:", ctx.replace(/\s+/g, " ").trim());

const defaultExposure = await page.locator(".audit-headline-num").innerText();
const defaultSub = await page.locator(".audit-headline-sub").innerText();
console.log("Default exposure:", defaultExposure, "·", defaultSub.replace(/\s+/g, " ").trim());

// Read realized stats
const stats = await page.locator(".audit-stat").allInnerTexts();
console.log("Realized stats:", stats.map(s => s.replace(/\s+/g, " ").trim()));

const auditorLine = await page.locator(".audit-realized-auditor").innerText().catch(() => "(none)");
console.log("Top auditor:", auditorLine.replace(/\s+/g, " ").trim());

// Read retailer breakdown
const retailerRows = await page.locator(".audit-retailer-table tbody tr").all();
console.log("\nRetailer breakdown:");
for (const r of retailerRows.slice(0, 6)) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

// Read evidence breakdown
const evRows = await page.locator(".audit-evidence-table tbody tr").all();
console.log("\nEvidence breakdown:");
for (const r of evRows) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

await page.screenshot({ path: "audit-default.png", fullPage: true });

// Toggle digital evidence projection
await page.locator(".audit-toggle input").check();
await page.waitForTimeout(150);
const projExposure = await page.locator(".audit-headline-num").innerText();
const projDelta = await page.locator(".audit-headline-delta").innerText().catch(() => "(no delta)");
console.log("\nWith digital evidence:");
console.log("  Exposure:", projExposure);
console.log("  Delta:", projDelta.replace(/\s+/g, " ").trim());

await page.screenshot({ path: "audit-digital.png", fullPage: true });
await page.locator(".audit-toggle input").uncheck();
await page.waitForTimeout(150);

// Click trace on first realized claim
const firstId = (await page.locator(".audit-id").first().innerText()).trim();
console.log("\nFirst realized claim ID:", firstId);
await page.locator(".audit-trace-btn").first().click();
await page.waitForTimeout(400);
const traceSummary = await page.locator(".trace-summary").innerText().catch(() => "(no trace)");
console.log("Trace summary after click:", traceSummary.replace(/\s+/g, " ").trim());

// Filter cohort to walmart
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);
const ssExposure = await page.locator(".audit-headline-num").innerText();
const ssSub = await page.locator(".audit-headline-sub").innerText();
console.log("\nShort-ship cohort:", ssExposure, "·", ssSub.replace(/\s+/g, " ").trim());

console.log("\nErrors:", errors);
await browser.close();
