// DOM Elements
const statusEl = document.getElementById('status');
const capturedEl = document.getElementById('captured');
const delayInput = document.getElementById('delay');
const totalPagesInput = document.getElementById('totalPages');
const scrollCaptureInput = document.getElementById('scrollCapture');
const scrollDelayInput = document.getElementById('scrollDelay');
const qualityInput = document.getElementById('quality');
const leftOffsetInput = document.getElementById('leftOffset');
const rightOffsetInput = document.getElementById('rightOffset');
const showGuidelinesBtn = document.getElementById('showGuidelinesBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

// Load saved settings
chrome.storage.local.get({
  delay: 1000,
  totalPages: 0,
  scrollCapture: true,
  scrollDelay: 1200,  // Increased for much better visibility
  quality: 90,
  leftOffset: 0,
  rightOffset: 0
}, (settings) => {
  delayInput.value = settings.delay;
  totalPagesInput.value = settings.totalPages;
  scrollCaptureInput.checked = settings.scrollCapture;
  scrollDelayInput.value = settings.scrollDelay;
  qualityInput.value = settings.quality;
  leftOffsetInput.value = settings.leftOffset;
  rightOffsetInput.value = settings.rightOffset;
});

// Load current capture state - this runs every time popup opens
chrome.storage.local.get(['isCapturing', 'pagesCaptured'], (data) => {
  console.log('[Popup] Loading capture state from storage:', data);
  if (data.isCapturing) {
    console.log('[Popup] Capture is in progress, enabling stop button');
    setCapturingState(true, data.pagesCaptured || 0);
  } else {
    console.log('[Popup] No capture in progress');
    setCapturingState(false, data.pagesCaptured || 0);
  }
});

// Show guidelines
showGuidelinesBtn.addEventListener('click', async () => {
  const leftOffset = parseInt(leftOffsetInput.value);
  const rightOffset = parseInt(rightOffsetInput.value);

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject content script if not already
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  } catch (error) {
    // Script may already be injected, that's ok
  }

  // Send message to show guidelines
  chrome.tabs.sendMessage(tab.id, {
    action: 'showGuidelines',
    leftOffset,
    rightOffset
  });
});

// Start capture
startBtn.addEventListener('click', async () => {
  const settings = {
    delay: parseInt(delayInput.value),
    totalPages: parseInt(totalPagesInput.value),
    scrollCapture: scrollCaptureInput.checked,
    scrollDelay: parseInt(scrollDelayInput.value),
    quality: parseInt(qualityInput.value),
    leftOffset: parseInt(leftOffsetInput.value),
    rightOffset: parseInt(rightOffsetInput.value)
  };

  console.log('[Popup] Starting capture with settings:', settings);
  console.log('[Popup] scrollCapture is:', settings.scrollCapture);

  // Save settings
  await chrome.storage.local.set(settings);

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Immediately update UI to show capturing state
  // This ensures the stop button is enabled even if popup closes and reopens
  setCapturingState(true, 0);

  // Send start command to background
  chrome.runtime.sendMessage({
    action: 'startCapture',
    tabId: tab.id,
    settings: settings
  }, (response) => {
    console.log('[Popup] Start capture response:', response);
    if (response && response.success) {
      // Already set to capturing state above
      console.log('[Popup] Capture started successfully');
    } else {
      // Revert to ready state on error
      const errorMsg = response ? response.error : 'No response from background';
      console.error('[Popup] Capture failed:', errorMsg);
      setCapturingState(false, 0);
      updateStatus('Error: ' + errorMsg, 'error');
    }
  });
});

// Stop capture
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({
    action: 'stopCapture'
  }, (response) => {
    if (response.success) {
      setCapturingState(false, response.pagesCaptured);
    }
  });
});

// Update UI state
function setCapturingState(isCapturing, pagesCaptured) {
  if (isCapturing) {
    startBtn.disabled = true;
    stopBtn.disabled = false;
    updateStatus('Capturing...', 'capturing');
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus('Ready', '');
  }
  capturedEl.textContent = `${pagesCaptured} pages`;
}

function updateStatus(text, className) {
  statusEl.textContent = text;
  statusEl.className = 'value ' + className;
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Popup] Received message:', message);
  if (message.action === 'updateProgress') {
    capturedEl.textContent = `${message.pagesCaptured} pages`;
  } else if (message.action === 'captureComplete') {
    setCapturingState(false, message.pagesCaptured);
    updateStatus('Complete!', '');
  } else if (message.action === 'captureError') {
    setCapturingState(false, message.pagesCaptured);
    updateStatus('Error: ' + message.error, 'error');
  }
});

// Listen for storage changes to keep UI in sync
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('[Popup] Storage changed:', changes);
    if (changes.isCapturing !== undefined) {
      const isCapturing = changes.isCapturing.newValue;
      const pagesCaptured = changes.pagesCaptured ? changes.pagesCaptured.newValue : 0;
      console.log('[Popup] Capture state changed to:', isCapturing);
      setCapturingState(isCapturing, pagesCaptured);
    } else if (changes.pagesCaptured !== undefined) {
      capturedEl.textContent = `${changes.pagesCaptured.newValue} pages`;
    }
  }
});
