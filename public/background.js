// Background script for PolyCzar Chrome Extension
// This script handles opening the side panel when the extension icon is clicked

// When the extension icon is clicked, open the side panel
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel in the current tab
  chrome.sidePanel.open({ tabId: tab.id });
});

// Set the side panel as open by default when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('PolyCzar extension installed. Side panel functionality enabled.');
});
