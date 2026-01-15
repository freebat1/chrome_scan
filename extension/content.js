// Content script for page capture

let isCapturing = false;
let currentSettings = null;

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capturePage') {
    capturePage(message.pageNumber, message.settings)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  } else if (message.action === 'clickNext') {
    clickNextPage()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === 'showGuidelines') {
    showGuidelines(message.leftOffset, message.rightOffset);
    sendResponse({ success: true });
    return true;
  }
});

// Capture current page (with scroll if needed)
async function capturePage(pageNumber, settings) {
  console.log(`[Book Capture] Starting capture for page ${pageNumber}`);
  console.log(`[Book Capture] Settings:`, settings);

  const isScrollable = checkIfScrollable();

  if (settings.scrollCapture && isScrollable) {
    // Capture segments
    console.log(`[Book Capture] Page ${pageNumber}: Using scroll capture mode`);
    return await captureScrollablePage(pageNumber, settings);
  } else {
    // Single capture
    console.log(`[Book Capture] Page ${pageNumber}: Using single capture mode (scrollCapture=${settings.scrollCapture}, isScrollable=${isScrollable})`);
    return await captureSinglePage(pageNumber, settings);
  }
}

// Find the scrollable element on the page
function findScrollableElement() {
  // Try to find the main scrollable element
  const candidates = [
    document.documentElement,
    document.body,
    document.querySelector('[role="main"]'),
    document.querySelector('.scroll-container'),
    document.querySelector('#viewer'),
    document.querySelector('.viewer'),
    document.querySelector('[class*="scroll"]'),
    document.querySelector('[style*="overflow"]')
  ].filter(el => el !== null);

  for (const el of candidates) {
    if (el.scrollHeight > el.clientHeight + 100) {
      console.log(`[Book Capture] Found scrollable element:`, el);
      return el;
    }
  }

  // Default to documentElement
  return document.documentElement;
}

// Check if page content is scrollable
function checkIfScrollable() {
  const scrollElement = findScrollableElement();
  const scrollHeight = scrollElement.scrollHeight;
  const viewportHeight = scrollElement.clientHeight || window.innerHeight;

  const isScrollable = scrollHeight > viewportHeight + 100; // 100px threshold

  console.log(`[Book Capture] Scroll check: height=${scrollHeight}px, viewport=${viewportHeight}px, scrollable=${isScrollable}`);
  console.log(`[Book Capture] Scroll element:`, scrollElement.tagName, scrollElement.className || scrollElement.id || '');

  return isScrollable;
}

// Capture single page (no scroll)
async function captureSinglePage(pageNumber, settings) {
  // Scroll to top first
  const scrollElement = findScrollableElement();
  scrollElement.scrollTop = 0;
  window.scrollTo(0, 0);
  await wait(100);

  return {
    pageNumber,
    segments: 1,
    isScrollable: false
  };
}

// Capture scrollable page in segments
async function captureScrollablePage(pageNumber, settings) {
  const scrollElement = findScrollableElement();
  const scrollHeight = scrollElement.scrollHeight;
  const viewportHeight = scrollElement.clientHeight || window.innerHeight;
  const scrollDelay = settings.scrollDelay || 1200; // Increased for visibility

  // Calculate number of segments
  const segments = Math.ceil(scrollHeight / viewportHeight);

  console.log(`[Book Capture] Page is scrollable: ${scrollHeight}px (viewport: ${viewportHeight}px)`);
  console.log(`[Book Capture] Will capture ${segments} segments`);
  console.log(`[Book Capture] Scrolling element:`, scrollElement.tagName);

  // Add visual indicator
  showScrollIndicator(`Capturing ${segments} segments...`);

  // Scroll to top first
  scrollElement.scrollTop = 0;
  window.scrollTo(0, 0);
  await wait(500);

  // Capture each segment
  for (let i = 0; i < segments; i++) {
    const targetScrollPosition = i * viewportHeight;
    const currentScrollPosition = scrollElement.scrollTop;

    console.log(`[Book Capture] Scrolling to ${targetScrollPosition}px (segment ${i + 1}/${segments})`);
    updateScrollIndicator(`📸 Segment ${i + 1}/${segments} - Scrolling...`);

    // Scroll like mouse wheel - in small steps
    await scrollLikeWheel(scrollElement, currentScrollPosition, targetScrollPosition, scrollDelay);

    console.log(`[Book Capture] Final scroll position: ${scrollElement.scrollTop}px (target: ${targetScrollPosition}px)`);

    // HIDE all indicators before capturing
    hideScrollIndicator();

    // Wait for page to render and indicators to disappear
    await wait(500);

    // Signal background to capture this segment with scroll info
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'captureSegment',
        pageNumber,
        segmentNumber: i + 1,
        totalSegments: segments,
        scrollInfo: {
          currentScrollY: scrollElement.scrollTop,
          targetScrollY: targetScrollPosition,
          viewportHeight: viewportHeight,
          captureHeight: window.innerHeight
        }
      }, resolve);
    });

    // Show indicator again for next segment (if not last)
    if (i < segments - 1) {
      showScrollIndicator(`Capturing ${segments} segments...`);
    }

    await wait(200); // Small pause between segments
  }

  // Done capturing - hide indicator
  hideScrollIndicator();

  return {
    pageNumber,
    segments,
    isScrollable: true
  };
}

// Press right arrow key to navigate
async function clickNextPage() {
  console.log('[Book Capture] Pressing right arrow key to go to next page');

  // Simulate right arrow key press
  const keydownEvent = new KeyboardEvent('keydown', {
    key: 'ArrowRight',
    code: 'ArrowRight',
    keyCode: 39,
    which: 39,
    bubbles: true,
    cancelable: true
  });

  const keypressEvent = new KeyboardEvent('keypress', {
    key: 'ArrowRight',
    code: 'ArrowRight',
    keyCode: 39,
    which: 39,
    bubbles: true,
    cancelable: true
  });

  const keyupEvent = new KeyboardEvent('keyup', {
    key: 'ArrowRight',
    code: 'ArrowRight',
    keyCode: 39,
    which: 39,
    bubbles: true,
    cancelable: true
  });

  // Dispatch all three events (keydown, keypress, keyup)
  document.dispatchEvent(keydownEvent);
  document.dispatchEvent(keypressEvent);
  document.dispatchEvent(keyupEvent);

  // Also try on document.body and active element
  if (document.body) {
    document.body.dispatchEvent(keydownEvent);
    document.body.dispatchEvent(keypressEvent);
    document.body.dispatchEvent(keyupEvent);
  }

  if (document.activeElement) {
    document.activeElement.dispatchEvent(keydownEvent);
    document.activeElement.dispatchEvent(keypressEvent);
    document.activeElement.dispatchEvent(keyupEvent);
  }

  await wait(200);
}

// Utility: wait function
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Scroll like mouse wheel - in steps
async function scrollLikeWheel(scrollElement, fromY, toY, duration) {
  const distance = toY - fromY;
  const stepSize = 50; // Smaller steps (50px) for smoother, more visible scrolling
  const steps = Math.abs(Math.ceil(distance / stepSize));
  const stepDelay = Math.max(30, duration / steps); // At least 30ms per step

  console.log(`[Book Capture] Scrolling from ${fromY}px to ${toY}px in ${steps} steps`);

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const currentY = fromY + (distance * progress);

    // Scroll both the element and window (in case either works)
    scrollElement.scrollTop = currentY;
    if (scrollElement !== document.documentElement && scrollElement !== document.body) {
      // Also try window scroll for custom containers
      window.scrollTo(0, currentY);
    }

    // Highlight scroll position every few steps
    if (i % 5 === 0) {
      highlightScrollPosition();
    }

    await wait(stepDelay);
  }

  // Final correction to ensure exact position
  scrollElement.scrollTop = toY;
  if (scrollElement !== document.documentElement && scrollElement !== document.body) {
    window.scrollTo(0, toY);
  }
  await wait(100); // Wait for final position to settle
}

// Flash effect at current scroll position
function flashScrollPosition() {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    background: linear-gradient(90deg, #3498db 0%, #e74c3c 50%, #3498db 100%);
    z-index: 999998;
    box-shadow: 0 2px 10px rgba(231, 76, 60, 0.5);
  `;

  document.body.appendChild(flash);

  // Fade out and remove
  setTimeout(() => {
    flash.style.transition = 'opacity 0.3s';
    flash.style.opacity = '0';
    setTimeout(() => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 300);
  }, 800);
}

// Highlight scroll position during scrolling
function highlightScrollPosition() {
  const highlight = document.createElement('div');
  highlight.style.cssText = `
    position: fixed;
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
    background: rgba(52, 152, 219, 0.9);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: bold;
    z-index: 999997;
    pointer-events: none;
  `;
  highlight.textContent = '↓ SCROLLING ↓';
  document.body.appendChild(highlight);

  // Remove after short time
  setTimeout(() => {
    if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
  }, 200);
}

// Visual feedback for scrolling
let scrollIndicator = null;

function showScrollIndicator(text) {
  if (!scrollIndicator) {
    scrollIndicator = document.createElement('div');
    scrollIndicator.id = 'book-capture-indicator';
    scrollIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(52, 152, 219, 0.95);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    document.body.appendChild(scrollIndicator);
  }
  scrollIndicator.textContent = '📖 ' + text;
  scrollIndicator.style.display = 'block';
}

function updateScrollIndicator(text) {
  if (scrollIndicator) {
    scrollIndicator.textContent = '📖 ' + text;
  }
}

function hideScrollIndicator() {
  if (scrollIndicator && scrollIndicator.parentNode) {
    scrollIndicator.parentNode.removeChild(scrollIndicator);
    scrollIndicator = null;
  }
}

// Show capture area guidelines
let leftGuideline = null;
let rightGuideline = null;
let captureAreaOverlay = null;

function showGuidelines(leftOffset, rightOffset) {
  console.log(`[Book Capture] Showing guidelines - Left: ${leftOffset}px, Right: ${rightOffset}px`);

  // Remove existing guidelines
  hideGuidelines();

  const viewportWidth = window.innerWidth;

  // Create left guideline
  if (leftOffset > 0) {
    leftGuideline = document.createElement('div');
    leftGuideline.id = 'book-capture-left-guideline';
    leftGuideline.style.cssText = `
      position: fixed;
      left: ${leftOffset}px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: rgba(255, 0, 0, 0.8);
      z-index: 9999999;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
    `;
    document.body.appendChild(leftGuideline);

    // Add label
    const leftLabel = document.createElement('div');
    leftLabel.style.cssText = `
      position: fixed;
      left: ${leftOffset + 10}px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 9999999;
      pointer-events: none;
    `;
    leftLabel.textContent = `Left Offset: ${leftOffset}px`;
    leftGuideline.appendChild(leftLabel);
  }

  // Create right guideline
  if (rightOffset > 0) {
    rightGuideline = document.createElement('div');
    rightGuideline.id = 'book-capture-right-guideline';
    rightGuideline.style.cssText = `
      position: fixed;
      right: ${rightOffset}px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: rgba(255, 0, 0, 0.8);
      z-index: 9999999;
      pointer-events: none;
      box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
    `;
    document.body.appendChild(rightGuideline);

    // Add label
    const rightLabel = document.createElement('div');
    rightLabel.style.cssText = `
      position: fixed;
      right: ${rightOffset + 10}px;
      top: 50%;
      transform: translate(-100%, -50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      z-index: 9999999;
      pointer-events: none;
    `;
    rightLabel.textContent = `Right Offset: ${rightOffset}px`;
    rightGuideline.appendChild(rightLabel);
  }

  // Create capture area overlay (semi-transparent to show what will be captured)
  const captureWidth = viewportWidth - leftOffset - rightOffset;
  captureAreaOverlay = document.createElement('div');
  captureAreaOverlay.id = 'book-capture-area-overlay';
  captureAreaOverlay.style.cssText = `
    position: fixed;
    left: ${leftOffset}px;
    top: 0;
    bottom: 0;
    width: ${captureWidth}px;
    background: rgba(0, 255, 0, 0.1);
    border: 2px dashed rgba(0, 255, 0, 0.5);
    z-index: 9999998;
    pointer-events: none;
  `;
  document.body.appendChild(captureAreaOverlay);

  // Add info box at top
  const infoBox = document.createElement('div');
  infoBox.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 9999999;
    pointer-events: none;
    text-align: center;
  `;
  infoBox.innerHTML = `
    <strong>📸 Capture Area Preview</strong><br>
    Green area will be captured<br>
    Red lines show offset boundaries<br>
    Capture width: ${captureWidth}px<br>
    <small>Guidelines will auto-hide in 10 seconds</small>
  `;
  captureAreaOverlay.appendChild(infoBox);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    hideGuidelines();
  }, 10000);
}

function hideGuidelines() {
  if (leftGuideline && leftGuideline.parentNode) {
    leftGuideline.parentNode.removeChild(leftGuideline);
    leftGuideline = null;
  }
  if (rightGuideline && rightGuideline.parentNode) {
    rightGuideline.parentNode.removeChild(rightGuideline);
    rightGuideline = null;
  }
  if (captureAreaOverlay && captureAreaOverlay.parentNode) {
    captureAreaOverlay.parentNode.removeChild(captureAreaOverlay);
    captureAreaOverlay = null;
  }
}
