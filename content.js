console.log("CONTENT SCRIPT LOADED");

// Native setter helpers (VERY IMPORTANT)
function setNativeValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  ).set;

  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}


chrome.runtime.onMessage.addListener((msg) => {
  console.log("MESSAGE RECEIVED:", msg);
  if (msg.type !== "FILL_CREDENTIALS") return;

  const { username, password } = msg;

  // Find username/email field
  const usernameInput =
    document.querySelector('input[type="email"]') ||
    document.querySelector('input[name*="email" i]') ||
    document.querySelector('input[placeholder*="email" i]') ||
    document.querySelector('input[name*="user" i]') ||
    document.querySelector('input[placeholder*="user" i]') ||
    document.querySelector('input[type="text"]');

  // Find password field
  const passwordInput = document.querySelector('input[type="password"]');

  if (usernameInput) {
    usernameInput.focus();
    setNativeValue(usernameInput, username);
  }

  if (passwordInput) {
    passwordInput.focus();
    setNativeValue(passwordInput, password);
  }

  console.log("Credentials filled");
});
