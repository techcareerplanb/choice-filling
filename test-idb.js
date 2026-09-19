import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Loading app...");
  await page.goto('http://localhost:3000/#/results');
  await page.waitForSelector('.result-card', { timeout: 10000 });
  
  console.log("App loaded. Navigating to next page...");
  // Click next page
  await page.click('#next-page-top');
  await page.waitForTimeout(2000); // wait for load
  
  console.log("Next page loaded. Reloading...");
  // Reload
  await page.reload();
  await page.waitForSelector('.result-card', { timeout: 10000 });
  
  console.log("Reloaded.");
  // Verify 'Refresh from server' button is visible
  const refreshBtnVisible = await page.isVisible('#refresh-server-btn');
  console.log(`Refresh button visible: ${refreshBtnVisible}`);
  
  // Verify IDB has keys
  const idbKeys = await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open('neet-pg-decision-cache-v1', 1);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
      });
      const tx = db.transaction('resultPages', 'readonly');
      const store = tx.objectStore('resultPages');
      return new Promise((resolve) => {
          const req = store.getAllKeys();
          req.onsuccess = () => resolve(req.result);
      });
  });
  console.log(`Cached result pages count: ${idbKeys.length}`);
  
  if (refreshBtnVisible && idbKeys.length > 0) {
      console.log("Success! Caching works.");
  } else {
      console.log("Failure! Caching didn't work as expected.");
      process.exit(1);
  }
  
  await browser.close();
})();
