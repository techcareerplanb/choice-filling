import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/#/results');
  
  // Wait for initial load
  await page.waitForSelector('.result-card');
  
  const initialCardsCount = await page.locator('.result-card').count();
  console.log(`Page 1: ${initialCardsCount} cards`);
  
  const textPage1 = await page.locator('#results-count').textContent();
  console.log(`Text: ${textPage1}`);
  
  // Click Next
  await page.click('.btn-next');
  await page.waitForTimeout(1000); // wait for load
  
  const page2CardsCount = await page.locator('.result-card').count();
  console.log(`Page 2: ${page2CardsCount} cards`);
  
  const textPage2 = await page.locator('#results-count').textContent();
  console.log(`Text: ${textPage2}`);
  
  // Click Previous
  await page.click('.btn-prev');
  await page.waitForTimeout(1000);
  
  const textPage1Back = await page.locator('#results-count').textContent();
  console.log(`Back to Page 1: ${textPage1Back}`);
  
  if (textPage1 !== textPage1Back) {
      console.error("Mismatch on returning to page 1!");
      process.exit(1);
  }
  
  console.log("Pagination UI works as expected.");
  
  await browser.close();
})();
