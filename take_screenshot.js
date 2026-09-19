import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/#/results');
  
  // Wait for initial load
  await page.waitForSelector('.result-card');
  
  await page.screenshot({ path: 'artifacts/screenshot.png', fullPage: true });
  
  console.log("Screenshot taken.");
  
  await browser.close();
})();
