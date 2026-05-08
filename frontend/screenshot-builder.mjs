// Verify the dispute builder: filter tabs, readiness counts, prev/next
// nav, requirements vs evidence assessment, mock package, and the
// trace cross-link.
import { chromium } from "playwright";

const PORT = process.env.PORT || "5175";
const URL = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 3600 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
});

await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".builder");
await page.waitForSelector(".builder-summary");

const filterLabels = await page.locator(".builder-filter-tab").allInnerTexts();
console.log("Filter tabs:", filterLabels.map(s => s.trim()));

const summary = await page.locator(".builder-summary").innerText();
console.log("Default summary:", summary.replace(/\s+/g, " ").trim());

const readiness = await page.locator(".builder-readiness").innerText();
console.log("Default readiness:", readiness.trim());

const reqsHead = await page.locator(".builder-section h3").first().innerText();
console.log("Requirements heading:", reqsHead.replace(/\s+/g, " ").trim());

const reqRows = await page.locator(".req-row").count();
console.log("Requirement rows:", reqRows);
const reqStatuses = await page.locator(".req-status").allInnerTexts();
console.log("Statuses:", reqStatuses.map(s => s.replace(/\s+/g, " ").trim()));

const mockDesc = await page.locator(".builder-mock-desc").innerText();
console.log("Mock package desc:", mockDesc.replace(/\s+/g, " ").trim());

const mockTitles = await page.locator(".mock-title").allInnerTexts();
console.log("Mock items:", mockTitles.map(s => s.trim()));

await page.screenshot({ path: "builder-default.png", fullPage: true });

// Click Ready filter
await page.locator(".builder-filter-tab.variant-ok").click();
await page.waitForTimeout(150);
const readyReadiness = await page.locator(".builder-readiness").innerText().catch(() => "(empty)");
console.log("\nAfter Ready filter — readiness:", readyReadiness.trim());

// Click Not disputable filter
await page.locator(".builder-filter-tab.variant-bad").click();
await page.waitForTimeout(150);
const notDispReadiness = await page.locator(".builder-readiness").innerText().catch(() => "(empty)");
const notDispSummary = await page.locator(".builder-summary").innerText().catch(() => "(empty)");
console.log("After Not disputable filter — readiness:", notDispReadiness.trim());
console.log("Summary:", notDispSummary.replace(/\s+/g, " ").trim());

// Click Next a few times to ensure nav cycles
await page.locator(".builder-filter-tab").first().click(); // back to All
await page.waitForTimeout(100);
const initialId = (await page.locator(".builder-summary-id").innerText()).match(/DED-\d+/)?.[0];
console.log("\nInitial ID:", initialId);
await page.locator(".builder-nav button").nth(2).click(); // Next
await page.waitForTimeout(100);
const afterNextId = (await page.locator(".builder-summary-id").innerText()).match(/DED-\d+/)?.[0];
console.log("After Next ID:", afterNextId);

// Click "View causation trace" and confirm it sets the trace
await page.locator(".builder-action-btn").click();
await page.waitForTimeout(400);
const traceSummary = await page.locator(".trace-summary").innerText().catch(() => "(no trace)");
console.log("\nTrace summary after View causation trace click:", traceSummary.replace(/\s+/g, " ").trim());

// Filter to short_ship cohort and re-check
await page.locator("#type-filter").selectOption("Short ship");
await page.waitForTimeout(200);
const ssCounts = await page.locator(".builder-filter-tab").allInnerTexts();
console.log("\nShort-ship filter counts:", ssCounts.map(s => s.trim()));
await page.screenshot({ path: "builder-short-ship.png", fullPage: true });

// Test cross-link from cost view: click a Trace button and confirm
// the builder syncs to that deduction
await page.locator("#type-filter").selectOption("all");
await page.waitForTimeout(200);
const costFirstId = (await page.locator(".cost-id").first().innerText()).trim();
await page.locator(".cost-trace-btn").first().click();
await page.waitForTimeout(400);
const builderAfterCost = (await page.locator(".builder-summary-id").innerText()).match(/DED-\d+/)?.[0];
console.log(`\nCost-view first ID: ${costFirstId}, builder synced to: ${builderAfterCost}`);

console.log("\nErrors:", errors);
await browser.close();
