// Background service worker for the extension
console.log('Classroom Auto-Grader background service worker loaded');

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Extension installed');
        // Open settings page on first install
        chrome.tabs.create({ url: 'https://bedwards.github.io/auto-grader/' });
    }
});
