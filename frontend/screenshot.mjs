import { chromium } from "playwright";

const url = process.argv[2] || "http://localhost:5173/";
const out = process.argv[3] || "screenshot.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });

const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
});

await page.goto(url, { waitUntil: "networkidle" });

try {
  await page.waitForSelector(".kpi-value", { timeout: 5000 });
} catch (e) {
  errors.push(`waitForSelector .kpi-value timed out — React may not have mounted`);
}

await page.screenshot({ path: out, fullPage: true });

const dimensions = await page.evaluate(() => ({
  bodyText: document.body.innerText.slice(0, 500),
  rootChildCount: document.getElementById("root")?.children.length || 0,
}));

console.log("DOM root children:", dimensions.rootChildCount);
console.log("Body text preview:", dimensions.bodyText);
console.log("Errors:", errors);

await browser.close();
