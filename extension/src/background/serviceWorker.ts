// Background Service Worker
// Handles communication with the Native Host

const NATIVE_HOST_NAME = "com.dynamics.helper.native";

// Listen for messages from Content Script or Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "NATIVE_MSG") {
        sendNativeMessage(message.payload)
            .then(response => sendResponse({ status: "success", data: response }))
            .catch(error => sendResponse({ status: "error", error: error.message }));
        return true; // Keep channel open for async response
    }
    
    if (message.type === "OPEN_OPTIONS") {
        chrome.runtime.openOptionsPage();
        return false;
    }
});

// Helper to send message to Native Host
function sendNativeMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            chrome.runtime.sendNativeMessage(
                NATIVE_HOST_NAME,
                message,
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                }
            );
        } catch (e: any) {
            reject(e);
        }
    });
}

console.log("[DH] Background Service Worker Loaded");
