// Background service worker

let captureState = {
  isCapturing: false,
  tabId: null,
  settings: null,
  pagesCaptured: 0,
  currentPageNumber: 1,
  folderName: null
};

// Listen for messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture') {
    startCapture(message.tabId, message.settings)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === 'stopCapture') {
    stopCapture()
      .then(() => sendResponse({ success: true, pagesCaptured: captureState.pagesCaptured }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (message.action === 'captureSegment') {
    captureSegment(message.pageNumber, message.segmentNumber, message.totalSegments, message.scrollInfo)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Start capture process
async function startCapture(tabId, settings) {
  if (captureState.isCapturing) {
    throw new Error('Capture already in progress');
  }

  // Initialize state
  captureState = {
    isCapturing: true,
    tabId: tabId,
    settings: settings,
    pagesCaptured: 0,
    currentPageNumber: 1,
    folderName: getDateFolderName()
  };

  // Save state
  await chrome.storage.local.set({
    isCapturing: true,
    pagesCaptured: 0
  });

  // Inject content script
  console.log('[Book Capture Background] Injecting content script');
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    console.log('[Book Capture Background] Content script injected successfully');

    // Wait for script to initialize
    await wait(500);
  } catch (error) {
    console.error('[Book Capture Background] Failed to inject content script:', error);
    captureState.isCapturing = false;
    await chrome.storage.local.set({ isCapturing: false });
    throw new Error('Failed to inject content script. Check if page allows extensions.');
  }

  // Start capture loop
  captureLoop();
}

// Stop capture process
async function stopCapture() {
  captureState.isCapturing = false;

  await chrome.storage.local.set({
    isCapturing: false
  });

  // Notify popup
  chrome.runtime.sendMessage({
    action: 'captureComplete',
    pagesCaptured: captureState.pagesCaptured
  });
}

// Main capture loop
async function captureLoop() {
  while (captureState.isCapturing) {
    try {
      // Check if reached target page count
      if (captureState.settings.totalPages > 0 &&
          captureState.pagesCaptured >= captureState.settings.totalPages) {
        await stopCapture();
        break;
      }

      // Capture current page
      await captureCurrentPage();

      // Click next page
      console.log('[Book Capture Background] Sending arrow key press command');
      try {
        await chrome.tabs.sendMessage(captureState.tabId, {
          action: 'clickNext'
        });
      } catch (error) {
        // Ignore error - page navigation may close message channel
        // This is expected behavior when page URL changes
        console.log('[Book Capture Background] Page navigated (message channel closed - this is normal)');
      }

      // Wait before next capture (allow page to navigate and load)
      await wait(captureState.settings.delay);

      // Re-inject content script for the new page
      console.log('[Book Capture Background] Re-injecting content script for new page');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: captureState.tabId },
          files: ['content.js']
        });
        console.log('[Book Capture Background] Content script re-injected successfully');

        // Wait a bit for the script to initialize
        await wait(500);
      } catch (error) {
        console.error('[Book Capture Background] Failed to re-inject content script:', error);
        throw new Error('Failed to inject content script. Page may have navigated away or be restricted.');
      }

    } catch (error) {
      console.error('Capture error:', error);
      captureState.isCapturing = false;

      await chrome.storage.local.set({ isCapturing: false });

      chrome.runtime.sendMessage({
        action: 'captureError',
        error: error.message,
        pagesCaptured: captureState.pagesCaptured
      });
      break;
    }
  }
}

// Capture current page
async function captureCurrentPage() {
  // Send capture command to content script
  const response = await chrome.tabs.sendMessage(captureState.tabId, {
    action: 'capturePage',
    pageNumber: captureState.currentPageNumber,
    settings: captureState.settings
  });

  if (!response.success) {
    throw new Error(response.error);
  }

  // If single page (no segments), capture and save now
  if (!response.result.isScrollable) {
    await captureSinglePage(captureState.currentPageNumber);
  }
  // If scrollable, segments were already captured by captureSegment handler

  // Update counters
  captureState.pagesCaptured++;
  captureState.currentPageNumber++;

  // Update storage and notify popup
  await chrome.storage.local.set({
    pagesCaptured: captureState.pagesCaptured
  });

  chrome.runtime.sendMessage({
    action: 'updateProgress',
    pagesCaptured: captureState.pagesCaptured
  });
}

// Capture single page (no scroll)
async function captureSinglePage(pageNumber) {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, {
    format: 'jpeg',
    quality: captureState.settings.quality
  });

  // Apply offset cropping if needed
  const croppedDataUrl = await cropImage(dataUrl, captureState.settings.leftOffset, captureState.settings.rightOffset);

  const filename = `${captureState.folderName}/${padNumber(pageNumber, 3)}.jpg`;

  await downloadImage(croppedDataUrl, filename);
}

// Capture segment (called from content script)
async function captureSegment(pageNumber, segmentNumber, totalSegments, scrollInfo) {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, {
    format: 'jpeg',
    quality: captureState.settings.quality
  });

  // Apply offset cropping (left/right)
  let croppedDataUrl = await cropImage(dataUrl, captureState.settings.leftOffset, captureState.settings.rightOffset);

  // Apply overlap removal (vertical cropping) based on actual scroll position
  croppedDataUrl = await cropSegmentOverlap(croppedDataUrl, segmentNumber, totalSegments, scrollInfo);

  const filename = `${captureState.folderName}/${padNumber(pageNumber, 3)}_p${segmentNumber}.jpg`;

  await downloadImage(croppedDataUrl, filename);
}

// Store captured regions across segments
let capturedRegions = [];

// Crop segment to remove overlap between consecutive segments
async function cropSegmentOverlap(dataUrl, segmentNumber, totalSegments, scrollInfo) {
  // If only one segment, no overlap to remove
  if (totalSegments === 1) {
    capturedRegions = []; // Reset for next page
    return dataUrl;
  }

  // Reset captured regions for first segment
  if (segmentNumber === 1) {
    capturedRegions = [];
  }

  // If no scroll info provided, fall back to no cropping
  if (!scrollInfo) {
    console.warn('[Book Capture] No scroll info provided, skipping crop');
    return dataUrl;
  }

  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const fullWidth = imageBitmap.width;
    const fullHeight = imageBitmap.height;

    // Current segment captures from scrollY to scrollY + captureHeight
    const currentStart = scrollInfo.currentScrollY;
    const currentEnd = currentStart + scrollInfo.captureHeight;

    let cropY = 0;
    let cropHeight = fullHeight;

    if (segmentNumber === 1) {
      // First segment: keep everything
      cropY = 0;
      cropHeight = fullHeight;
    } else {
      // Find overlap with previous segment
      const previousSegment = capturedRegions[capturedRegions.length - 1];

      if (previousSegment && currentStart < previousSegment.end) {
        // We have overlap!
        const overlapPixels = previousSegment.end - currentStart;
        cropY = Math.floor(overlapPixels);
        cropHeight = fullHeight - cropY;

        console.log(`[Book Capture] Segment ${segmentNumber}/${totalSegments}: Overlap detected! Previous ended at ${previousSegment.end}px, current starts at ${currentStart}px, cropping ${overlapPixels}px from top`);
      } else {
        // No overlap (or gap)
        cropY = 0;
        cropHeight = fullHeight;

        if (previousSegment && currentStart > previousSegment.end) {
          const gap = currentStart - previousSegment.end;
          console.warn(`[Book Capture] Segment ${segmentNumber}/${totalSegments}: Gap detected! ${gap}px of content missing between segments`);
        }
      }
    }

    // Store this segment's captured region (after cropping)
    const actualCapturedStart = currentStart + cropY;
    const actualCapturedEnd = currentEnd;
    capturedRegions.push({ start: actualCapturedStart, end: actualCapturedEnd });

    console.log(`[Book Capture] Segment ${segmentNumber}/${totalSegments}: ScrollY=${currentStart}px, CaptureRange=${currentStart}-${currentEnd}px, CropY=${cropY}px, FinalHeight=${cropHeight}px (Original: ${fullHeight}px)`);

    // Create canvas with cropped dimensions
    const canvas = new OffscreenCanvas(fullWidth, cropHeight);
    const ctx = canvas.getContext('2d');

    // Draw the cropped portion
    ctx.drawImage(
      imageBitmap,
      0, cropY, fullWidth, cropHeight,  // source rectangle
      0, 0, fullWidth, cropHeight       // destination rectangle
    );

    // Convert canvas to blob
    const croppedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: captureState.settings.quality / 100
    });

    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(croppedBlob);
    });

  } catch (error) {
    console.error('[Book Capture] Overlap removal failed:', error);
    return dataUrl; // Return original if cropping fails
  }
}

// Crop image based on left and right offsets
async function cropImage(dataUrl, leftOffset, rightOffset) {
  // If no offsets, return original
  if (leftOffset === 0 && rightOffset === 0) {
    return dataUrl;
  }

  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create ImageBitmap from blob
    const imageBitmap = await createImageBitmap(blob);

    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;
    const croppedWidth = originalWidth - leftOffset - rightOffset;

    // Validate dimensions
    if (croppedWidth <= 0) {
      console.error('[Book Capture] Invalid crop width:', croppedWidth);
      return dataUrl; // Return original if invalid
    }

    // Create canvas with cropped dimensions
    const canvas = new OffscreenCanvas(croppedWidth, originalHeight);
    const ctx = canvas.getContext('2d');

    // Draw the cropped portion of the image
    ctx.drawImage(
      imageBitmap,
      leftOffset, 0, croppedWidth, originalHeight,  // source rectangle
      0, 0, croppedWidth, originalHeight            // destination rectangle
    );

    // Convert canvas to blob
    const croppedBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: captureState.settings.quality / 100
    });

    // Convert blob to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(croppedBlob);
    });

  } catch (error) {
    console.error('[Book Capture] Cropping failed:', error);
    // Return original image if cropping fails
    return dataUrl;
  }
}

// Download image
function downloadImage(dataUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false,
      conflictAction: 'overwrite'  // Overwrite without prompting
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(downloadId);
      }
    });
  });
}

// Get date folder name (YYYY-MM-DD)
function getDateFolderName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Pad number with zeros
function padNumber(num, length) {
  return String(num).padStart(length, '0');
}

// Utility: wait function
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
