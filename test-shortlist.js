import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Clear any existing localStorage (just in case)
  await page.goto('http://localhost:3000/#/results');
  await page.evaluate(() => localStorage.clear());
  
  await page.reload();
  await page.waitForSelector('.result-card');
  
  // Click shortlist all
  await page.click('#shortlist-all-btn');
  
  // Wait for it to become '✅ Added'
  await page.waitForFunction(() => {
      const btn = document.getElementById('shortlist-all-btn');
      return btn.textContent.includes('Added');
  }, { timeout: 10000 });
  
  // Go to shortlist page
  await page.goto('http://localhost:3000/#/shortlist');
  await page.waitForTimeout(2000);
  
  // Ensure the page says something about the number of shortlisted items.
  // Shortlist has a clear all button or items list?
  // Actually, we can check localStorage directly
  const shortlistItems = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('neet_shortlist')) || [];
  });
  
  console.log(`Shortlisted count: ${shortlistItems.length}`);
  
  if (shortlistItems.length < 100) {
      console.error("Shortlist should have thousands of items, not just the first page of 50!");
      process.exit(1);
  }
  
  console.log("Success: Shortlist All correctly bypassed pagination.");
  
  await browser.close();
})();
