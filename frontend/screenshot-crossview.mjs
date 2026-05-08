// End-to-end cross-view navigation check.
// Verifies the three new improvements (sort works, sticky cohort bar,
// time range filter) and walks every cross-view nav path through the
// nine feature views.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 6800 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

const log = (...args) => console.log(...args);

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".cohort-bar");

// ────────────────────────────────────────────────────────
log("\n=== ITEM 1 · Scorecard sort buttons ===");
// ────────────────────────────────────────────────────────

await page.locator(".scorecard-card").first().scrollIntoViewIfNeeded();
await page.waitForTimeout(150);

async function readScorecardOrder() {
  const names = await page.locator(".scorecard-card-name").allInnerTexts();
  return names.map((s) => s.trim());
}

const netLossOrder = await readScorecardOrder();
log("Net loss sort:", netLossOrder.slice(0, 5).join(" → "));

await page.locator(".scorecard-sort-btn").nth(1).click();
await page.waitForTimeout(150);
const volumeOrder = await readScorecardOrder();
log("Volume sort:   ", volumeOrder.slice(0, 5).join(" → "));

await page.locator(".scorecard-sort-btn").nth(2).click();
await page.waitForTimeout(150);
const worstRecOrder = await readScorecardOrder();
log("Worst recovery:", worstRecOrder.slice(0, 5).join(" → "));

const sortChanged = JSON.stringify(netLossOrder) !== JSON.stringify(worstRecOrder);
log(`Worst recovery sort produced different order than net loss: ${sortChanged ? "YES ✓" : "NO ✗"}`);

await page.locator(".scorecard-sort-btn").first().click();
await page.waitForTimeout(150);

// ────────────────────────────────────────────────────────
log("\n=== ITEM 2 · Sticky cohort bar ===");
// ────────────────────────────────────────────────────────

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100);
const defaultCohort = await page.locator(".cohort-bar").innerText();
log("Default cohort bar:", defaultCohort.replace(/\s+/g, " ").trim());

const isCohortAlwaysVisible = await page.locator(".cohort-bar").isVisible();
log("Visible at top of page:", isCohortAlwaysVisible);

// Scroll way down past Sankey, explorer, etc., then check bar is still
// visible (sticky position).
await page.evaluate(() => window.scrollTo(0, 3000));
await page.waitForTimeout(150);
const cohortVisibleScrolled = await page.locator(".cohort-bar").isVisible();
const cohortBoxScrolled = await page.locator(".cohort-bar").boundingBox();
log(`After scrolling 3000px, cohort bar visible: ${cohortVisibleScrolled}`);
log(`Bounding box top: ${cohortBoxScrolled?.y.toFixed(0)} (sticky should be near 0)`);

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(150);

// ────────────────────────────────────────────────────────
log("\n=== ITEM 3 · Time range filter ===");
// ────────────────────────────────────────────────────────

const defaultKpi = await page.locator(".kpi").nth(0).innerText();
log("Default annualized KPI:", defaultKpi.replace(/\s+/g, " ").trim());

// Click "Last 6 mo"
await page.locator(".time-range-buttons button").first().click();
await page.waitForTimeout(150);
const sixMoCohort = await page.locator(".cohort-bar").innerText();
log("After 6 mo:", sixMoCohort.replace(/\s+/g, " ").trim());

// Click "Last 1 yr"
await page.locator(".time-range-buttons button").nth(1).click();
await page.waitForTimeout(150);
const oneYrCohort = await page.locator(".cohort-bar").innerText();
log("After 1 yr:", oneYrCohort.replace(/\s+/g, " ").trim());

// Click "All"
await page.locator(".time-range-buttons button").nth(2).click();
await page.waitForTimeout(150);
const allCohort = await page.locator(".cohort-bar").innerText();
log("After All:", allCohort.replace(/\s+/g, " ").trim());

// Custom date range
await page.locator(".time-range-custom input[type='date']").first().fill("2025-08-01");
await page.locator(".time-range-custom input[type='date']").nth(1).fill("2025-12-31");
await page.waitForTimeout(150);
const customCohort = await page.locator(".cohort-bar").innerText();
log("After custom:", customCohort.replace(/\s+/g, " ").trim());

// Reset
await page.locator(".time-range-buttons button").nth(2).click();
await page.waitForTimeout(150);

// ────────────────────────────────────────────────────────
log("\n=== ITEM 4 · Cross-view navigation ===");
// ────────────────────────────────────────────────────────

// Sankey click → all views should rescope
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100);

// Use the type dropdown as a deterministic Sankey-equivalent filter
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);

const cohortAfterFilter = await page.locator(".cohort-bar").innerText();
log("Cohort bar after Short ship filter:", cohortAfterFilter.replace(/\s+/g, " ").trim());

// Verify each downstream view rescoped
const explorerCohortLabel = await page.locator(".explorer-context").innerText();
log("Explorer context:", explorerCohortLabel.replace(/\s+/g, " ").trim().slice(0, 100));

const simContext = await page.locator(".sim-context").innerText();
const simMatch = simContext.match(/\d[\d,]+/);
log(`Simulation cohort size: ${simMatch?.[0]}`);

const costContext = await page.locator(".cost-context").innerText();
const costMatch = costContext.match(/\d[\d,]+/);
log(`Cost-to-dispute scope: ${costMatch?.[0]}`);

const builderAll = await page.locator(".builder-filter-tab").first().innerText();
log("Dispute builder tab counts:", builderAll.replace(/\s+/g, " ").trim());

const pressureCtx = await page.locator(".pressure-context").innerText();
const pressureMatch = pressureCtx.match(/\d[\d,]+/);
log(`Timeline pressure scope: ${pressureMatch?.[0]}`);

const auditSub = await page.locator(".audit-headline-sub").innerText();
log("Post-audit headline sub:", auditSub.replace(/\s+/g, " ").trim());

const scorecardCount = await page.locator(".scorecard-card").count();
log(`Scorecard cards visible (filter is type, not retailer, so should be all): ${scorecardCount}`);

const originSummaryRow = await page.locator(".origin-summary-table tbody tr").first().innerText();
log("Origin top-share row:", originSummaryRow.replace(/\s+/g, " ").trim());

// Now click Trace from cost view → trace should populate; explorer + builder should sync
await page.locator(".cost-trace-btn").first().scrollIntoViewIfNeeded();
await page.locator(".cost-trace-btn").first().click();
await page.waitForTimeout(400);
const traceSummary = await page.locator(".trace-summary").innerText();
log("Trace summary after cost view trace:", traceSummary.replace(/\s+/g, " ").trim());

// Reset filter
await page.locator("#type-filter").selectOption("all");
await page.waitForTimeout(150);

// Click a retailer card in scorecard → write retailer selection
await page.locator(".scorecard-filter-btn").first().scrollIntoViewIfNeeded();
await page.locator(".scorecard-filter-btn").first().click();
await page.waitForTimeout(200);
const cohortAfterRetailer = await page.locator(".cohort-bar").innerText();
log("After retailer filter:", cohortAfterRetailer.replace(/\s+/g, " ").trim());

// Verify scorecard preserved comparative view
const scorecardCardsAfter = await page.locator(".scorecard-card").count();
log(`Scorecard cards after retailer filter (should still show all 10): ${scorecardCardsAfter}`);

// Clear retailer filter via the cohort-bar Clear button
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(100);
await page.locator(".cohort-bar-clear").click();
await page.waitForTimeout(150);
const afterClear = await page.locator(".cohort-bar").innerText();
log("After Clear button:", afterClear.replace(/\s+/g, " ").trim());

// Click an origin cluster filter → write cluster selection
await page.locator(".origin-filter-btn").first().scrollIntoViewIfNeeded();
await page.locator(".origin-filter-btn").first().click();
await page.waitForTimeout(200);
const cohortAfterCluster = await page.locator(".cohort-bar").innerText();
log("After cluster filter:", cohortAfterCluster.replace(/\s+/g, " ").trim());

await page.evaluate(() => window.scrollTo(0, 0));
await page.locator(".cohort-bar-clear").click();
await page.waitForTimeout(150);

// Combined filter: short_ship + last 6 months
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(150);
await page.locator(".time-range-buttons button").first().click();
await page.waitForTimeout(150);
const combinedCohort = await page.locator(".cohort-bar").innerText();
log("\nCombined filter (Short ship + Last 6 mo):", combinedCohort.replace(/\s+/g, " ").trim());

await page.screenshot({ path: "crossview.png", fullPage: true });

await page.locator(".cohort-bar-clear").click();
await page.waitForTimeout(150);

log("\nErrors:", errors);
await browser.close();
