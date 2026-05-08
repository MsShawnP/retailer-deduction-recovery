// Verify origin clustering: concentration summary, dimension tabs,
// cluster table, Filter writes selection state, Trace top crosslink,
// and special-cased cohort (cluster filter doesn't collapse view).
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 6000 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".origin-summary-table");

console.log("Concentration summary:");
const summaryRows = await page.locator(".origin-summary-table tbody tr").all();
for (const r of summaryRows) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

console.log("\nDefault dimension tabs:");
const tabs = await page.locator(".origin-tab").allInnerTexts();
console.log("  " + tabs.map(s => s.trim()).join(" | "));

console.log("\nDefault active dimension cluster table (first 8 rows):");
const clusterRows = await page.locator(".origin-cluster-table tbody tr").all();
for (const r of clusterRows.slice(0, 8)) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

await page.screenshot({ path: "origin-default.png", fullPage: true });

// Click "Drill in →" on a different dimension (the top-share one)
const drillRow = page.locator(".origin-summary-table tbody tr").first();
const topDimName = (await drillRow.locator("td").first().innerText()).trim();
console.log(`\nDrilling in to ${topDimName}...`);
await drillRow.locator(".origin-drill-btn").click();
await page.waitForTimeout(150);

const detailH3 = await page.locator(".origin-detail h3").innerText();
console.log("Detail header:", detailH3.trim());

const newClusterRows = await page.locator(".origin-cluster-table tbody tr").all();
console.log("Cluster rows for top dimension:");
for (const r of newClusterRows.slice(0, 6)) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

// Click Filter on top cluster
const topCluster = (await page.locator(".origin-cluster-name").first().innerText()).trim();
console.log(`\nClicking Filter on cluster: ${topCluster}`);
await page.locator(".origin-filter-btn").first().click();
await page.waitForTimeout(200);

const chipLabel = await page.locator(".selection-value").innerText().catch(() => "(no chip)");
const chipCount = await page.locator(".selection-count").innerText().catch(() => "(no count)");
console.log("Filter chip:", chipLabel.trim(), "·", chipCount.trim());

const stillAllRows = await page.locator(".origin-cluster-table tbody tr").count();
console.log("Cluster rows after cluster filter (should still show all):", stillAllRows);

const activeRow = await page.locator(".origin-cluster-table tbody tr.active").count();
console.log("Active cluster row:", activeRow);

// Trace top → on first cluster
await page.locator(".origin-cluster-table .origin-trace-btn").first().click();
await page.waitForTimeout(400);
const traceSummary = await page.locator(".trace-summary").innerText().catch(() => "(no trace)");
console.log("\nTrace summary after Trace top click:", traceSummary.replace(/\s+/g, " ").trim());

// Clear cluster filter
await page.locator(".origin-cluster-table tbody tr.active .origin-filter-btn").click();
await page.waitForTimeout(150);
const chipAfterClear = await page.locator(".selection-chip").count();
console.log("Chip after clear (expect 0):", chipAfterClear);

// Try sankey filter pass-through: filter to short_ship
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);
const ssSummary = await page.locator(".origin-summary-table tbody tr").all();
console.log("\nWith short_ship filter — concentration summary:");
for (const r of ssSummary) {
  console.log("  " + (await r.innerText()).replace(/\s+/g, " ").trim());
}

await page.screenshot({ path: "origin-short-ship.png", fullPage: true });

console.log("\nErrors:", errors);
await browser.close();
