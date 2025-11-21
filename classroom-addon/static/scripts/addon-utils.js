/**
 * Utility functions for Classroom Add-on
 */

/**
 * Opens a given destination route in a new window
 */
function openWebsiteInNewTab(destinationURL = '/') {
  window.open(destinationURL, '_blank');
}

/**
 * Close the iframe by calling postMessage() in the host Classroom page
 */
function closeAddonIframe() {
  window.parent.postMessage({
    type: 'Classroom',
    action: 'closeIframe',
  }, '*');
}

/**
 * Send a message to the parent Classroom window
 */
function sendMessageToParent(action, data = {}) {
  window.parent.postMessage({
    type: 'Classroom',
    action: action,
    ...data
  }, '*');
}
