let cryptoKey = null; // so that the key is lost as soon as the popup is cleared

// Auth elements
const authDiv = document.getElementById("auth");
const appDiv = document.getElementById("app");
const authBtn = document.getElementById("authBtn");
const masterInput = document.getElementById("masterPassword");

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Derives a cryptographic key from the master password
// This key is later used for encrypting and decrypting stored passwords
async function deriveKeyFromPassword(password) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("password-manager-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Handles master password authentication
// - First time: stores a hash of the master password
// - Next times: verifies entered password by comparing hashes
authBtn.addEventListener("click", async () => {
  const password = masterInput.value;
  if (!password) {
    alert("Please enter a master password");
    return;
  }
  const hash = await hashPassword(password);
  chrome.storage.local.get(["masterHash"], (res) => {

    // FIRST TIME SETUP
    // Store only the hash of the master password
    // Plain-text master password is never stored
    if (!res.masterHash) {
      chrome.storage.local.set({ masterHash: hash }, async() => {
        cryptoKey = await deriveKeyFromPassword(password);
        authDiv.style.display = "none";
        appDiv.style.display = "block";
      });
    }

    // VERIFY PASSWORD
    // Entered password is hashed and compared with stored hash
    else {
      if (res.masterHash === hash) {
        authDiv.style.display = "none";
        appDiv.style.display = "block";
      } else {
        alert("Wrong master password");
      }
    }
  });
});

const siteInput = document.getElementById('site');
const userInput = document.getElementById('username');
const passInput = document.getElementById('password');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const listDiv = document.getElementById('list');
const revealBtn = document.getElementById('revealBtn');
const generateBtn = document.getElementById('generateBtn');
const toast = document.getElementById('toast');

function showToast(text = 'Saved') {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 1500);
}

// Toggle password visibility
revealBtn.addEventListener('click', () => {
  if (passInput.type === 'password') {
    passInput.type = 'text';
    revealBtn.textContent = '🙈'; // hide icon
  } else {
    passInput.type = 'password';
    revealBtn.textContent = '👁️'; // show icon
  }
});


//generating random password with 12 characters
generateBtn.addEventListener('click', () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let out = '';
  for (let i=0;i<12;i++) out += chars[Math.floor(Math.random()*chars.length)];
  passInput.value = out;
  showToast('Generated password');
});

addBtn.addEventListener('click', () => {
  const site = siteInput.value.trim();
  const username = userInput.value.trim();
  const password = passInput.value;
  if (!site || !username || !password) { alert('Please fill all fields'); return; }

  chrome.storage.local.get({ passwords: [] }, (res) => {
    const list = res.passwords;
    list.push({
      id: Date.now(),
      site,
      username,
      password,
      created: new Date().toISOString()
    });
    chrome.storage.local.set({ passwords: list }, () => {
      siteInput.value = '';
      userInput.value = '';
      passInput.value = '';
      renderList(list);
      showToast('Saved');
    });
  });
});

clearBtn.addEventListener('click', () => {
  siteInput.value = ''; userInput.value=''; passInput.value='';
});

// Render list
function renderList(list) {
  if (!list || list.length === 0) {
    listDiv.innerHTML = '<div class="small-muted">No passwords saved.</div>';
    return;
  }
  const html = list.slice().reverse().map(item => {
    // avatar letter
    const letter = escapeHtml(item.site[0] ? item.site[0].toUpperCase() : '?');
    const safeSite = escapeHtml(item.site);
    const safeUser = escapeHtml(item.username);
    const safePw = escapeHtml(item.password);
    return `
      <div class="entry" data-id="${item.id}">
        <div class="avatar">${letter}</div>
        <div class="entry-body">
          <div class="site">${safeSite}</div>
          <div class="username">${safeUser}</div>
          <div class="pw-row">
            <div class="small-muted" style="flex:1">🔒 ${safePw}</div>
            <div class="entry-actions">
             <button class="btn-ghost fillBtn">Fill</button> 
             <button class="btn-ghost copyBtn">Copy</button>
             <button class="btn-ghost btn-danger deleteBtn">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  listDiv.innerHTML = html;

  // attach handlers (event delegation would also work)
  listDiv.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = +e.target.closest('.entry').dataset.id;
      deleteEntry(id);
    });
  });
  listDiv.querySelectorAll('.copyBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = +e.target.closest('.entry').dataset.id;
      copyPassword(id);
    });
  });
  listDiv.querySelectorAll('.fillBtn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const id = +e.target.closest('.entry').dataset.id;
    handleFill(id);
  });
});
}

function handleFill(id) {
  chrome.storage.local.get({ passwords: [] }, (res) => {
    const entry = res.passwords.find(x => x.id === id);
    if (!entry) return;

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        args: [entry.username, entry.password],
        func: (USERNAME, PASSWORD) => {

          
          //  HELPERS
          
          function setNativeValue(el, value) {
            const setter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value"
            ).set;
            setter.call(el, value);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }

          function isVisible(el) {
            return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          }

          
          // FIND INPUTS
          
          let usernameInput, passwordInput;

          // CodeChef override (needed)
          if (location.hostname.includes("codechef.com")) {
            usernameInput = document.querySelector("#edit-name");
            passwordInput = document.querySelector("#edit-pass");
          } 
          // Generic fallback (most other sites)
          else {
            usernameInput = Array.from(
              document.querySelectorAll(
                'input[type="email"], input[type="text"], input[name*="user" i], input[name*="email" i]'
              )
            ).find(el => isVisible(el) && !el.disabled);

            passwordInput = Array.from(
              document.querySelectorAll('input[type="password"]')
            ).find(el => isVisible(el) && !el.disabled);
          }

          // FILL
         
          if (usernameInput) {
            usernameInput.focus();
            setNativeValue(usernameInput, USERNAME);
          }

          if (passwordInput) {
            passwordInput.focus();
            setNativeValue(passwordInput, PASSWORD);
          }
        }
      });
    });
  });
}





function deleteEntry(id) {
  chrome.storage.local.get({ passwords: [] }, (res) => {
    const list = res.passwords.filter(x => x.id !== id);
    chrome.storage.local.set({ passwords: list }, () => {
      renderList(list);
      showToast('Deleted');
    });
  });
}

function copyPassword(id) {
  chrome.storage.local.get({ passwords: [] }, (res) => {
    const found = res.passwords.find(x => x.id === id);
    if (!found) return;
    navigator.clipboard.writeText(found.password).then(() => {
      showToast('Copied to clipboard');
    }, () => {
      showToast('Copy failed');
    });
  });
}

// escape helper
function escapeHtml(s='') {
  return String(s)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

// initial load
chrome.storage.local.get({ passwords: [] }, (res) => renderList(res.passwords));

chrome.storage.local.get(["masterHash"], (res) => {
  if (res.masterHash) {
    authDiv.querySelector("h3").innerText = "Enter Master Password";
  }
});
