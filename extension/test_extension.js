#!/usr/bin/env node
/**
 * Automated test for Book Capture Chrome Extension
 *
 * Usage:
 *   Option 1: Local Chrome (with puppeteer)
 *     npm install puppeteer
 *     node test_extension.js
 *
 *   Option 2: Remote Chrome (with puppeteer-core)
 *     npm install puppeteer-core
 *     # On Windows, start Chrome with: chrome.exe --remote-debugging-port=9222
 *     CHROME_WS=ws://localhost:9222 node test_extension.js
 *
 * This script:
 * 1. Launches Chrome with the extension loaded (or connects to remote Chrome)
 * 2. Opens the test page
 * 3. Tests scroll capture disabled behavior
 * 4. Tests stop button state
 */

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  puppeteer = require('puppeteer-core');
}

const path = require('path');
const fs = require('fs');

const EXTENSION_PATH = path.resolve(__dirname);
const TEST_PAGE_PATH = path.join(EXTENSION_PATH, 'test_page.html');
const CHROME_WS = process.env.CHROME_WS; // e.g., ws://localhost:9222

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Book Capture Extension - Automated Test');
  console.log('='.repeat(60));
  console.log();

  let browser;

  if (CHROME_WS) {
    // Connect to remote Chrome
    console.log(`[1/5] Connecting to remote Chrome at ${CHROME_WS}...`);
    const http = require('http');

    // Get WebSocket URL from Chrome DevTools
    const wsUrl = await new Promise((resolve, reject) => {
      http.get(`http://${CHROME_WS.replace('ws://', '').split('/')[0]}/json/version`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.webSocketDebuggerUrl);
          } catch (e) {
            resolve(CHROME_WS);
          }
        });
      }).on('error', () => resolve(CHROME_WS));
    });

    browser = await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      defaultViewport: null
    });
    console.log('  ✓ Connected to remote Chrome');
  } else {
    // Launch local Chrome with extension
    console.log('[1/5] Launching Chrome with extension...');
    browser = await puppeteer.launch({
      headless: false, // Need to see the extension UI
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      defaultViewport: null
    });
  }

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('[Book Capture]')) {
      console.log('  [Page Console]', msg.text());
    }
  });

  try {
    // Open test page
    console.log('[2/5] Opening test page...');
    await page.goto(`file://${TEST_PAGE_PATH}`);
    await sleep(1000);
    console.log('  ✓ Test page loaded');

    // Get extension ID
    console.log('[3/5] Finding extension popup...');
    const targets = await browser.targets();
    const extensionTarget = targets.find(t =>
      t.type() === 'service_worker' && t.url().includes('chrome-extension://')
    );

    if (!extensionTarget) {
      throw new Error('Extension not found. Make sure it loaded correctly.');
    }

    const extensionUrl = extensionTarget.url();
    const extensionId = extensionUrl.split('/')[2];
    console.log(`  ✓ Extension ID: ${extensionId}`);

    // Open extension popup
    const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
    const popupPage = await browser.newPage();
    await popupPage.goto(popupUrl);
    await sleep(500);
    console.log('  ✓ Popup opened');

    // Test 1: Check initial button states
    console.log('[4/5] Testing initial button states...');
    const startBtnDisabled = await popupPage.$eval('#startBtn', el => el.disabled);
    const stopBtnDisabled = await popupPage.$eval('#stopBtn', el => el.disabled);

    if (!startBtnDisabled && stopBtnDisabled) {
      console.log('  ✓ Initial state correct: Start enabled, Stop disabled');
    } else {
      console.log('  ✗ Initial state incorrect!');
      console.log(`    Start disabled: ${startBtnDisabled}, Stop disabled: ${stopBtnDisabled}`);
    }

    // Test 2: Uncheck scroll capture and verify setting
    console.log('[5/5] Testing scroll capture setting...');

    // Uncheck scroll capture checkbox
    const scrollCaptureChecked = await popupPage.$eval('#scrollCapture', el => el.checked);
    console.log(`  Current scrollCapture state: ${scrollCaptureChecked}`);

    if (scrollCaptureChecked) {
      await popupPage.click('#scrollCapture');
      await sleep(200);
      const newState = await popupPage.$eval('#scrollCapture', el => el.checked);
      console.log(`  After click, scrollCapture state: ${newState}`);

      if (!newState) {
        console.log('  ✓ Scroll capture checkbox unchecked successfully');
      }
    }

    // Click Start and check Stop button becomes enabled
    console.log('\n[Test] Clicking Start button...');
    await popupPage.click('#startBtn');
    await sleep(500);

    const stopBtnAfterStart = await popupPage.$eval('#stopBtn', el => el.disabled);
    if (!stopBtnAfterStart) {
      console.log('  ✓ Stop button is ENABLED after clicking Start');
    } else {
      console.log('  ✗ BUG: Stop button is still DISABLED after clicking Start');
    }

    // Wait a moment and check console for scroll behavior
    await sleep(2000);

    // Click Stop
    console.log('\n[Test] Clicking Stop button...');
    const canClickStop = !await popupPage.$eval('#stopBtn', el => el.disabled);
    if (canClickStop) {
      await popupPage.click('#stopBtn');
      console.log('  ✓ Stop button was clickable');
    } else {
      console.log('  ✗ Could not click Stop button - it was disabled');
    }

    await sleep(1000);

    console.log('\n' + '='.repeat(60));
    console.log('Test completed! Check the console output above for results.');
    console.log('='.repeat(60));

    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    console.log('Press Ctrl+C to close earlier.');
    await sleep(30000);

  } catch (error) {
    console.error('\n✗ Test failed with error:', error.message);
  } finally {
    await browser.close();
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  runTests().catch(console.error);
} catch (e) {
  console.log('Puppeteer is not installed. Please run:');
  console.log('  npm install puppeteer');
  console.log('\nThen run this test again:');
  console.log('  node test_extension.js');
}
