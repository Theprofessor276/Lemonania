// === Lemonania Account System Additions Start ===

// --- Constants & Utility ---
const LS_KEY_USERS = "lemonUsers"; // { username: {email, verified, pfp, ...} }
const LS_KEY_CURRENT = "lemonCurrentUser";

// --- EmailJS Config ---
const EMAILJS_SERVICE = "service_3uepw1g";
const EMAILJS_TEMPLATE = "template_bjwslao";
const EMAILJS_PUBLIC_KEY = "MPEttrKFI6fFs8iNx";
const EMAILJS_TEMPLATE_VERIFIED = "template_1zqrydx";
// Place this after your other constants (e.g., after LS_KEY_CURRENT)
const EULA_VERSION = "2024-06-22"; // Update this string whenever the EULA changes
(function loadCouponCodes() {
  // Only load if not already loaded
  if (typeof window.COUPON_CODES === "undefined") {
    var script = document.createElement('script');
    script.src = "coupon-codes.js";
    script.async = false; // must load before checkout logic runs
    document.head.appendChild(script);
  }
})();

// --- User Storage Helpers ---
function getAllUsers() {
  try { return JSON.parse(localStorage.getItem(LS_KEY_USERS)) || {}; }
  catch { return {}; }
}
function saveAllUsers(users) { localStorage.setItem(LS_KEY_USERS, JSON.stringify(users)); }
function getUser(username) {
  const users = getAllUsers();
  return users[username] || null;
}
function setUser(username, userObj) {
  const users = getAllUsers();
  users[username] = userObj;
  saveAllUsers(users);
}
function getCurrentUser() {
  return localStorage.getItem(LS_KEY_CURRENT) || null;
}
function setCurrentUser(username) {
  if (username) localStorage.setItem(LS_KEY_CURRENT, username);
  else localStorage.removeItem(LS_KEY_CURRENT);
}

// --- EmailJS Senders ---
function sendVerificationEmail(toEmail, username, code, cb) {
  const expiry = new Date(Date.now() + 15*60*1000)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE,
      template_id: EMAILJS_TEMPLATE,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        'email': toEmail,
        'username': username,
        'passcode': code,
        'time': expiry
      }
    })
  }).then(r => r.ok ? cb(true) : cb(false))
    .catch(e => cb(false));
}

function getSelectedCurrency() {
  return localStorage.getItem("lemonCurrency") || "USD";
}
function setSelectedCurrency(cur) {
  if (CURRENCIES[cur]) localStorage.setItem("lemonCurrency", cur);
}

// Patch formatPrice to support currency and KROMER (Spamton) mode
(function() {
  window.formatPrice = function(num) {
    let price = (typeof num === 'number' && !isNaN(num)) ? num : 0;
    const cur = getSelectedCurrency();
    const { symbol, rate } = CURRENCIES[cur] || CURRENCIES.USD;
    // Show KROMER if Spamton mode is active OR KROMER is selected
    if (
      (typeof isSpamtonActive === "function" && isSpamtonActive()) ||
      cur === "KROMER"
    ) {
      const kromer = Math.ceil(price * rate);
      return `${kromer} KROMER`;
    }
    // JPY: no decimals
    if (cur === "JPY") {
      return symbol + Math.round(price * rate);
    }
    return symbol + (price * rate).toFixed(2);
  };
})();
function sendAccountVerifiedEmail(toEmail, username, cb) {
  fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE,
      template_id: EMAILJS_TEMPLATE_VERIFIED,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        'email': toEmail,
        'username': username
      }
    })
  }).then(r => r.ok ? cb(true) : cb(false))
    .catch(e => cb(false));
}

// --- UI Functions for Account Page ---
function renderAccountArea() {
  const user = getCurrentUser();
  if (!user) {
    if (!document.getElementById('accountArea')) return;
document.getElementById('accountArea').innerHTML = `
  <h2>Login or Register</h2>
  <form class="account-form" id="accountForm" onsubmit="return false">
    <label for="username">Username:</label>
    <input type="text" id="username" maxlength="24" required>
    <label for="email">Email (for fake verification):</label>
    <input type="email" id="email" maxlength="80" required>
    <label for="password">Password:</label>
    <input type="password" id="password" maxlength="32" required>
    <div style="margin:0.7em 0; display:flex; align-items:flex-start; gap:0.7em; flex-wrap:wrap; max-width: 100%;">
      <input type="checkbox" id="eulaAgree" class="lemon-checkbox" required style="margin-top:0.18em;">
      <label for="eulaAgree" style="line-height:1.4; font-weight:bold; color:#222; flex:1 1 0; min-width:0;">
        I agree to the
        <a href="eula.html" target="_blank" style="color:#6c2eb7; text-decoration:underline; font-weight:bold;">
          Lemonania End User License Agreement
        </a>
      </label>
    </div>
    <div style="display:flex; gap:0.5em;">
      <button type="button" onclick="registerUser()">Register</button>
      <button type="button" onclick="loginUser()">Login</button>
    </div>
    <div id="accountMsg"></div>
  </form>
`;
} else {
    const u = getUser(user);
    let pfp = u && u.pfp
      ? `<img src="${u.pfp}" class="pfp-img" alt="Profile Picture" style="width:80px;height:80px;object-fit:cover;border-radius:50%;margin-bottom:0.5em;"><br>`
      : '';
    let emailStatus = u && u.verified
      ? `<span class="success">Verified</span>`
      : `<span class="error">Not Verified</span>
         <span class="fake-link" onclick="showVerifyPrompt()">[Verify Now]</span>
         <span class="fake-link" onclick="resendVerificationEmail()">[Resend]</span>`;
    // --- Pop Pop Curse: disable and style logout button if cursed
    let cursedMsg = '';
    let logoutBtnStyle = '';
    let logoutBtnAttrs = '';
    if (u && u.popPopCursed) {
      cursedMsg = `<div style="color:red;font-weight:bold;margin:0.5em 0;">You are cursed by the Pop Pop Coupon.<br>Account switching is forbidden.</div>`;
      logoutBtnStyle = 'background:#c00!important;color:#eee!important;cursor:not-allowed;border-color:#900!important;pointer-events:none;opacity:0.7;';
      logoutBtnAttrs = 'disabled title="Cursed users may not log out."';
    }
// --- Currency Selector ---
let currencyOptions = Object.entries(CURRENCIES).filter(([code]) => {
  // Only show KROMER if Spamton mode is active or currently selected
  return code !== "KROMER" || isSpamtonActive() || getSelectedCurrency() === "KROMER";
}).map(([code, cur]) =>
  `<option value="${code}"${getSelectedCurrency() === code ? " selected" : ""}>${cur.symbol} ${code} (${cur.name})</option>`
).join("");
let currencySelector = `
  <label for="currencySelect"><b>Preferred Currency:</b></label>
  <select id="currencySelect" style="margin-left:0.5em;">
    ${currencyOptions}
  </select>
  <span id="currencySavedMsg" style="color:green;display:none;">Saved!</span>
  <br><br>
`;

    if (!document.getElementById('accountArea')) return;
    document.getElementById('accountArea').innerHTML = `
      <h2>Your Lemonania Account</h2>
      <div style="text-align:center;">${pfp}
        <form onsubmit="return false" style="margin-bottom:1em;">
          <label for="pfpInput">Change Profile Picture:</label>
          <input type="file" id="pfpInput" accept="image/*" style="margin:0.5em auto 1em auto;" onchange="changePFP(event)">
        </form>
      </div>
      ${currencySelector}
      <table class="account-info-table">
        <tr><th>Username:</th><td>${user}</td></tr>
        <tr><th>Email:</th><td>${u.email}</td></tr>
        <tr><th>Email Status:</th><td id="emailStatus">${emailStatus}</td></tr>
      </table>
      ${cursedMsg}
      <button class="logout-btn" onclick="logoutUser()" style="${logoutBtnStyle}" ${logoutBtnAttrs}>Log Out</button>
      <div class="account-area">
        <h3>Lemon Stats</h3>
        <ul>
          <li>Lemon Points: <b>${getLemonPointsDisplay()}</b></li>
          <li>Rewards: <b>${getMyRewards().length}</b></li>
          <li>Cart Items: <b>${getUserCartCount(user)}</b></li>
        </ul>
      </div>
      <div id="accountMsg"></div>
    `;

    // Add event listener for currency select
    setTimeout(() => {
      const sel = document.getElementById("currencySelect");
      if (sel) {
        sel.onchange = function() {
          setSelectedCurrency(this.value);
          updateAllMenuPrices();
          if (typeof renderCart === "function") renderCart();
          if (typeof renderCartCheckout === "function") renderCartCheckout();
          if (typeof updateCheckoutTotal === "function") updateCheckoutTotal();
          document.getElementById("currencySavedMsg").style.display = "inline";
          setTimeout(() => document.getElementById("currencySavedMsg").style.display = "none", 1200);
        };
      }
    }, 0);
  }
}

// --- Add Account Button/Profile To Header ---
function renderAccountHeaderBtn() {
  const header = document.querySelector('header');
  if (!header) return;
  let btn = document.getElementById('account-header-btn');
  if (btn) btn.remove();

  let btnArea = document.getElementById('account-header-btn-area');
  if (!btnArea) {
    // If not present (old header), add it to header
    btnArea = document.createElement('span');
    btnArea.id = "account-header-btn-area";
    header.appendChild(btnArea);
  }

  const user = getCurrentUser();
  let profilePic = '';
  let username = '';
  if (user) {
    const u = getUser(user);
    profilePic = u && u.pfp
      ? `<img src="${u.pfp}" alt="profile" style="width:32px;height:32px;object-fit:cover;border-radius:50%;vertical-align:middle;margin-right:8px;">`
      : '👤';
    username = `<span style="vertical-align:middle;font-weight:bold;">${user}</span>`;
  } else {
    profilePic = '👤';
    username = '<span style="vertical-align:middle;">Account</span>';
  }
  btnArea.innerHTML = `
    <a id="account-header-btn" href="account.html" aria-label="Account"
      style="float:right; margin:10px 20px 0 0; display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-family:inherit;font-size:1.1em;">
      ${profilePic} ${username}
    </a>
  `;
}

function tryRenderHeaderBtn() {
  if (document.getElementById('account-header-btn-area') || document.querySelector('header')) renderAccountHeaderBtn();
  else setTimeout(tryRenderHeaderBtn, 100);
}
document.addEventListener('DOMContentLoaded', tryRenderHeaderBtn);

(function() {
  const origFetch = window.fetch;
  window.fetch = function(...args) {
    return origFetch.apply(this, args).then(resp => {
      if (args[0] && typeof args[0] === "string" && args[0].includes("header.html")) {
        setTimeout(tryRenderHeaderBtn, 100);
      }
      return resp;
    });
  };
})();

// --- Styles ---
const style = document.createElement('style');
style.innerHTML = `
.logout-btn {
  background: #FFD700;
  color: #fff;
  border: 2px solid #DAA520;
  border-radius: 0.6em;
  font-family: 'Lemon', 'Lobster', Arial, sans-serif;
  font-size: 1.12em;
  font-weight: bold;
  padding: 0.7em 1.7em;
  margin: 1.2em 0 1.2em 0;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, border 0.18s, box-shadow 0.18s;
  box-shadow: 0 0.09em 0.39em #ffd70044;
  display: block;
  width: 100%;
  max-width: 320px;
  margin-left: auto;
  margin-right: auto;
}
.logout-btn:hover {
  background: #32CD32;
  color: #fff;
  border-color: #32CD32;
  box-shadow: 0 0.09em 0.29em #32cd3244;
}
#account-header-btn:hover {
  background: #FFFACD;
  border-radius: 2em;
  box-shadow: 0 0.14em 0.44em #ffd70055;
  color: #32CD32 !important;
}
`;
document.head.appendChild(style);

// --- Account Data Logic ---
function getUserCartCount(username) {
  try {
    const cart = JSON.parse(localStorage.getItem("cart__" + username)) || {};
    let count = 0;
    for (const k in cart) count += cart[k].quantity || 0;
    return count;
  } catch { return 0; }
}

// --- Per-user data migration (for first login after system added) ---
function migrateUserDataToThisUser(username) {
  const keys = ["cart", "lemonPoints", "myRewards", "usedRewards"];
  keys.forEach(base => {
    let val = localStorage.getItem(base);
    if (val && !localStorage.getItem(base + "__" + username)) {
      localStorage.setItem(base + "__" + username, val);
    }
  });
}

// --- PFP upload ---
window.changePFP = function(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const url = e.target.result;
    const u = getCurrentUser();
    if (!u) return;
    let userObj = getUser(u);
    userObj.pfp = url;
    setUser(u, userObj);
    renderAccountArea();
    renderAccountHeaderBtn();
  };
  reader.readAsDataURL(file);
};

// --- Account Actions ---
window.registerUser = function() {
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('accountMsg');
  const eulaBox = document.getElementById('eulaAgree');
  if (eulaBox && !eulaBox.checked) {
    msg.innerHTML = '<span class="error">You must agree to the Lemonania EULA to register.</span>';
    return;
  }

let users = getAllUsers();
if (users[username]) { msg.innerHTML = '<span class="error">Username already exists.</span>'; return; }
if (Object.values(users).some(u => u.email === email)) { msg.innerHTML = '<span class="error">Email already used.</span>'; return; }
let code = Math.floor(100000 + Math.random()*900000).toString();
users[username] = { email, password, verified:false, code, pfp:null, eulaAgreed: EULA_VERSION };
saveAllUsers(users);
  // --- Pop Pop Forbidden Names Check (redirect to error page instantly) ---
  const forbiddenNames = [/pop[\s_]?pop/i];
  if (forbiddenNames.some(re => re.test(username))) {
    window.location.href = "error.html?reason=poppop";
    return;
  }
  if (!username || !email || !password) { msg.innerHTML = '<span class="error">Fill all fields.</span>'; return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { msg.innerHTML = '<span class="error">Username letters, numbers, _ only.</span>'; return; }
  if (username.length < 3 || username.length > 24) { msg.innerHTML = '<span class="error">Username 3-24 chars.</span>'; return; }
  msg.innerHTML = 'Sending verification email...';
  sendVerificationEmail(email, username, code, ok => {
    if (ok) {
      msg.innerHTML = '<span class="success">Verification email sent! Check your inbox.</span>';
      setTimeout(() => showVerifyPrompt(username), 1200);
    } else {
      msg.innerHTML = '<span class="error">Failed to send verification email. Try again.</span>';
    }
  });
}

window.loginUser = function() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('accountMsg');
  if (!username || !password) { msg.innerHTML = '<span class="error">Fill all fields.</span>'; return; }
  const u = getUser(username);
  if (!u || u.password !== password) { msg.innerHTML = '<span class="error">Incorrect username or password.</span>'; return; }
  // --- EULA re-agreement check ---
  if (u.eulaAgreed !== EULA_VERSION) {
    msg.innerHTML = `
  <span class="error">The Lemonania EULA has been updated. Please agree to the new terms to continue.</span>
  <div style="margin:0.7em 0; display:flex; align-items:center; gap:0.5em;">
    <input type="checkbox" id="eulaAgreeLogin" class="lemon-checkbox" required>
    <label for="eulaAgreeLogin" style="line-height:1.4;">
      I agree to the <a href="eula.html" target="_blank">Lemonania End User License Agreement</a>
    </label>
  </div>
  <div style="font-size:0.95em;color:#888;margin-bottom:0.5em;">
    (You must agree to the latest EULA to use your account. If you have questions, please <a href="mailto:support@lemonania.com">contact support</a>.)
  </div>
  <button onclick="agreeEulaAndLogin('${username}', '${password}')">Agree & Continue</button>
`;
    return;
  }
  window.agreeEulaAndLogin = function(username, password) {
  const eulaBox = document.getElementById('eulaAgreeLogin');
  const msg = document.getElementById('accountMsg');
  if (!eulaBox || !eulaBox.checked) {
    msg.innerHTML = '<span class="error">You must agree to the Lemonania EULA to continue.</span>';
    return;
  }
  let u = getUser(username);
  if (!u || u.password !== password) {
    msg.innerHTML = '<span class="error">Incorrect username or password.</span>';
    return;
  }
  u.eulaAgreed = EULA_VERSION;
  setUser(username, u);
  setCurrentUser(username);
  migrateUserDataToThisUser(username);
  if (!u.verified) {
    if (!u.code) {
      u.code = Math.floor(100000 + Math.random()*900000).toString();
      setUser(username, u);
    }
    sendVerificationEmail(u.email, username, u.code, function(){});
  }
  renderAccountArea();
  renderAccountHeaderBtn();
};
  setCurrentUser(username);
  migrateUserDataToThisUser(username);
  if (!u.verified) {
    if (!u.code) {
      u.code = Math.floor(100000 + Math.random()*900000).toString();
      setUser(username, u);
    }
    sendVerificationEmail(u.email, username, u.code, function(){});
  }
  renderAccountArea();
  renderAccountHeaderBtn();
}
window.loginUser = function() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('accountMsg');
  if (!username || !password) { msg.innerHTML = '<span class="error">Fill all fields.</span>'; return; }
  const u = getUser(username);
  if (!u || u.password !== password) { msg.innerHTML = '<span class="error">Incorrect username or password.</span>'; return; }
  // --- EULA re-agreement check ---
  if (u.eulaAgreed !== EULA_VERSION) {
    msg.innerHTML = `
      <span class="error">The Lemonania EULA has been updated. Please agree to the new terms to continue.</span>
      <div style="margin:0.5em 0;">
        <input type="checkbox" id="eulaAgreeLogin" required>
        <label for="eulaAgreeLogin">
          I agree to the <a href="eula.html" target="_blank">Lemonania End User License Agreement</a>
        </label>
      </div>
      <button onclick="agreeEulaAndLogin('${username}', '${password}')">Agree & Continue</button>
    `;
    return;
  }
  setCurrentUser(username);
  migrateUserDataToThisUser(username);
  if (!u.verified) {
    if (!u.code) {
      u.code = Math.floor(100000 + Math.random()*900000).toString();
      setUser(username, u);
    }
    sendVerificationEmail(u.email, username, u.code, function(){});
  }
  renderAccountArea();
  renderAccountHeaderBtn();
}
window.agreeEulaAndLogin = function(username, password) {
  const eulaBox = document.getElementById('eulaAgreeLogin');
  const msg = document.getElementById('accountMsg');
  if (!eulaBox || !eulaBox.checked) {
    msg.innerHTML = '<span class="error">You must agree to the Lemonania EULA to continue.</span>';
    return;
  }
  let u = getUser(username);
  if (!u || u.password !== password) {
    msg.innerHTML = '<span class="error">Incorrect username or password.</span>';
    return;
  }
  u.eulaAgreed = EULA_VERSION;
  setUser(username, u);
  setCurrentUser(username);
  migrateUserDataToThisUser(username);
  if (!u.verified) {
    if (!u.code) {
      u.code = Math.floor(100000 + Math.random()*900000).toString();
      setUser(username, u);
    }
    sendVerificationEmail(u.email, username, u.code, function(){});
  }
  renderAccountArea();
  renderAccountHeaderBtn();
};
window.logoutUser = function() {
  // "pop pop" curse: prevent logout for cursed users
  const u = getCurrentUser();
  let userObj = u ? getUser(u) : null;
  if (userObj && userObj.popPopCursed) {
    // Do nothing, button should be disabled anyway
    return;
  }
  setCurrentUser(null);
  renderAccountArea();
  renderAccountHeaderBtn();
}

// --- Verification ---
window.showVerifyPrompt = function(username) {
  if (!username) username = getCurrentUser();
  if (!username) return;
  const u = getUser(username);
  if (!document.getElementById('accountArea')) return;
  document.getElementById('accountArea').innerHTML = `
    <h2>Email Verification</h2>
    <p>A verification code was sent to: <b>${u.email}</b></p>
    <form onsubmit="return false" class="account-form">
      <label for="codeInput">Enter the code:</label>
      <input type="text" id="codeInput" maxlength="6" required>
      <button onclick="submitVerifyCode('${username}')">Verify</button>
      <button onclick="renderAccountArea()">Cancel</button>
    </form>
    <div id="accountMsg"></div>
  `;
}
window.submitVerifyCode = function(username) {
  const code = document.getElementById('codeInput').value.trim();
  const msg = document.getElementById('accountMsg');
  let u = getUser(username);
  if (!u) { msg.innerHTML = '<span class="error">User missing.</span>'; return; }
  if (u.verified) { msg.innerHTML = '<span class="success">Already verified!</span>'; return; }
  if (u.code === code) {
    u.verified = true;
    u.code = undefined;
    setUser(username, u);
    setCurrentUser(username);
    sendAccountVerifiedEmail(u.email, username, function(success) {});
    msg.innerHTML = '<span class="success">Email verified! Logging in...</span>';
    setTimeout(() => { renderAccountArea(); renderAccountHeaderBtn(); }, 800);
  } else {
    msg.innerHTML = '<span class="error">Incorrect code. Check your email.</span>';
  }
}
window.resendVerificationEmail = function() {
  const username = getCurrentUser();
  if (!username) return;
  const user = getUser(username);
  if (!user) return;
  let code = Math.floor(100000 + Math.random()*900000).toString();
  user.code = code;
  setUser(username, user);
  const msgDiv = document.getElementById('accountMsg');
  msgDiv.innerHTML = 'Resending verification email...';
  sendVerificationEmail(user.email, username, code, function(ok) {
    if (ok) {
      msgDiv.innerHTML = '<span class="success">Verification email resent! Check your inbox.</span>';
    } else {
      msgDiv.innerHTML = '<span class="error">Failed to send verification email. Try again.</span>';
    }
  });
};

// === Per-account Cart/Points/Rewards Layer ===
function patchGlobalFunctionsForAccounts() {
  window.loadCart = function() {
    const u = getCurrentUser();
    if (u) {
      try {
        return JSON.parse(localStorage.getItem("cart__" + u)) || {};
      } catch { return {}; }
    }
    return JSON.parse(localStorage.getItem("cart")) || {};
  };
  window.saveCart = function(cart) {
    const u = getCurrentUser();
    if (u) {
      localStorage.setItem("cart__" + u, JSON.stringify(cart));
      return;
    }
    localStorage.setItem("cart", JSON.stringify(cart));
  };

  // --- Curse logic: Lemon Points ---
  window.getLemonPoints = function() {
    const u = getCurrentUser();
    if (u) {
      let userObj = getUser(u);
      if (userObj && userObj.popPopCursed) return "no";
      return Math.max(0, parseInt(localStorage.getItem("lemonPoints__" + u) || '0', 10));
    }
    return Math.max(0, parseInt(localStorage.getItem("lemonPoints") || '0', 10));
  };
  window.setLemonPoints = function(points) {
    const u = getCurrentUser();
    if (u) {
      let userObj = getUser(u);
      if (userObj && userObj.popPopCursed) {
        // Setting Lemon Points is forbidden if cursed
        localStorage.setItem("lemonPoints__" + u, "0");
        return;
      }
      localStorage.setItem("lemonPoints__" + u, String(Math.max(0, Math.floor(points))));
    } else {
      localStorage.setItem("lemonPoints", String(Math.max(0, Math.floor(points))));
    }
  };
  window.getMyRewards = function() {
    const u = getCurrentUser();
    if (u) {
      try { return JSON.parse(localStorage.getItem("myRewards__" + u)) || []; }
      catch { return []; }
    }
    try { return JSON.parse(localStorage.getItem("myRewards")) || []; }
    catch { return []; }
  };
  window.saveMyRewards = function(rewards) {
    const u = getCurrentUser();
    if (u) localStorage.setItem("myRewards__" + u, JSON.stringify(rewards));
    else localStorage.setItem("myRewards", JSON.stringify(rewards));
  };
  window.getUsedRewards = function() {
    const u = getCurrentUser();
    if (u) {
      try { return JSON.parse(localStorage.getItem("usedRewards__" + u)) || []; }
      catch { return []; }
    }
    try { return JSON.parse(localStorage.getItem("usedRewards")) || []; }
    catch { return []; }
  };
  window.saveUsedRewards = function(used) {
    const u = getCurrentUser();
    if (u) localStorage.setItem("usedRewards__" + u, JSON.stringify(used));
    else localStorage.setItem("usedRewards", JSON.stringify(used));
  };
}
document.addEventListener("DOMContentLoaded", function() {
  patchGlobalFunctionsForAccounts();
  if (typeof renderAccountArea === "function" && document.getElementById('accountArea')) renderAccountArea();
});

// === End Lemonania Account System Additions ===

// === Lemonania Utility: General Flexible Price Display Updater ===

/**
 * Updates all elements containing a data-price attribute within a given container.
 * Calls formatPrice (if exists) or falls back to $X.XX.
 * @param {Element|Document} [container=document] - Root element to search within.
 * @param {string} [selector='.price[data-price]'] - Selector for price elements.
 * @param {Function|null} [priceOverride=null] - If provided, called as priceOverride(price, el) and should return string to display.
 */
function updateAllMenuPrices(container = document) {
  // Update .price[data-price] (legacy/main menu)
  container.querySelectorAll('.price[data-price]').forEach(el => {
    const price = parseFloat(el.getAttribute('data-price'));
    el.textContent = typeof formatPrice === "function" ? formatPrice(price) : "$" + price.toFixed(2);
  });
  // Update .menu-price[data-base] (merch, secret menu, etc)
  container.querySelectorAll('.menu-price[data-base]').forEach(el => {
    const price = parseFloat(el.getAttribute('data-base'));
    el.textContent = typeof formatPrice === "function" ? formatPrice(price) : "$" + price.toFixed(2);
  });
}

// === Begin Lemonania Core Shop/Cart/Points/Coupon Code ===

// === SPAMTON MODE: KROMER PRICES ONLY ===
function isSpamtonActive() {
  return (
    window._lemonAppliedCoupon &&
    window._lemonAppliedCoupon.code &&
    window._lemonAppliedCoupon.code.toUpperCase() === "SPAMTON"
  );
}

// --- Lemonania Currency Exchange Rates ---
function renderCurrencySelector() {
  let sel = document.getElementById("currencySelector");
  if (!sel) {
    sel = document.createElement("select");
    sel.id = "currencySelector";
    sel.style.margin = "0 1em";
    // Try to insert into #boc if it exists, else at top of body
    const boc = document.getElementById("boc");
    if (boc) boc.insertBefore(sel, boc.firstChild);
    else document.body.insertBefore(sel, document.body.firstChild);
  }
  sel.innerHTML = ""; // Clear existing options

  const selected = getSelectedCurrency();
  for (const code in CURRENCIES) {
    // Only show KROMER if Spamton mode is active or currently selected
    if (code === "KROMER" && !(isSpamtonActive() || selected === "KROMER")) continue;
    const opt = document.createElement("option");
    opt.value = code;
    opt.text = `${CURRENCIES[code].symbol} ${code}`;
    sel.appendChild(opt);
  }
  sel.value = selected;
  sel.onchange = function() {
    setSelectedCurrency(this.value);
    updateAllMenuPrices();
    if (typeof renderCart === "function") renderCart();
    if (typeof renderCartCheckout === "function") renderCartCheckout();
    if (typeof updateCheckoutTotal === "function") updateCheckoutTotal();
  };
}
// Update these rates as needed. Rates are relative to USD (1 = $1.00).
const CURRENCIES = {
  USD: { symbol: "$", rate: 1, name: "US Dollar" },
  EUR: { symbol: "€", rate: 0.92, name: "Euro" },
  GBP: { symbol: "£", rate: 0.78, name: "British Pound" },
  JPY: { symbol: "¥", rate: 157.5, name: "Japanese Yen" },
  CAD: { symbol: "C$", rate: 1.37, name: "Canadian Dollar" },
  KROMER: { symbol: "", rate: 1, name: "KROMER (Spamton Mode)" } // Only shown in Spamton mode
};
// To update rates, just change the 'rate' value above.

// All cart, points, and rewards functions below now use the patched functions above,
// so everything is per-account if a user is logged in!

function getLemonPointsDisplay() {
  // For display purposes: show "no" if cursed
  const u = getCurrentUser();
  if (u) {
    let userObj = getUser(u);
    if (userObj && userObj.popPopCursed) return "no";
  }
  return getLemonPoints();
}

function updateLemonPointsDisplay() {
  const elem = document.getElementById('lemonPointsDisplay');
  if (elem) elem.innerText = getLemonPointsDisplay();
}

// Cart Count Utility
function updateCartCount() {
  const cart = loadCart();
  let count = 0;
  for (const item in cart) {
    count += cart[item].quantity || 0;
  }
  const countElem = document.getElementById('cartCount');
  if (countElem) countElem.innerText = count;
}

// Cart Controls
function addToCart(itemName, price) {
  const cart = loadCart();
  if (!cart[itemName]) {
    cart[itemName] = {
      quantity: 1,
      price: parseFloat(price)
    };
  } else {
    cart[itemName].quantity += 1;
  }
  saveCart(cart);
  updateCartCount();
}

function goToCart() {
  window.location.href = "cart.html";
}
function goBack() {
  history.back();
}
function decreaseItem(itemName) {
  const cart = loadCart();
  if (cart[itemName]) {
    cart[itemName].quantity -= 1;
    if (cart[itemName].quantity <= 0) {
      delete cart[itemName];
    }
    saveCart(cart);
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}
function increaseItem(itemName) {
  const cart = loadCart();
  if (cart[itemName]) {
    cart[itemName].quantity += 1;
    saveCart(cart);
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}
function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    saveCart({});
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}

// Cart Subtotal
function calcCartSubtotal() {
  const cart = loadCart();
  let total = 0;
  for (const item in cart) {
    const entry = cart[item];
    const quantity = entry.quantity ?? 0;
    const price = entry.price ?? 0;
    total += price * quantity;
  }
  // pop pop curse: if cursed, multiply everything by 5
  if (isPopPopCursed()) total *= 5;
  return total;
}

// Cart Rendering
function renderCart() {
  const cart = loadCart();
  const cartDiv = document.getElementById('cartItems');
  if (!cartDiv) return;
  cartDiv.innerHTML = '';
  let total = 0;
  if (Object.keys(cart).length === 0) {
    cartDiv.innerText = "Your cart is empty.";
    return;
  }
  for (const item in cart) {
    const entry = cart[item];
    const quantity = entry.quantity ?? 0;
    const price = entry.price ?? 0;
    const subtotal = price * quantity;
    total += subtotal;
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <span>${item} — ${formatPrice(price)} × ${quantity} = ${formatPrice(subtotal)}</span>
      <div class="item-buttons">
        <button class="btn decrease-btn" onclick="decreaseItem('${item}')">−</button>
        <button class="btn increase-btn" onclick="increaseItem('${item}')">+</button>
      </div>
    `;
    cartDiv.appendChild(div);
  }
  // pop pop curse: if cursed, multiply total by 5 and show a warning
  let curseMsg = '';
  if (isPopPopCursed()) {
    total *= 5;
    curseMsg = `<div style="color:red;font-weight:bold">Pop Pop Curse: Your total is multiplied by 5!</div>`;
  }
  const totalDiv = document.createElement('div');
  totalDiv.style.marginTop = '15px';
  totalDiv.innerHTML = `<strong>Total: ${formatPrice(total)}</strong>${curseMsg}`;
  cartDiv.appendChild(totalDiv);
}

// Lemon Points logic is already patched via getLemonPoints and setLemonPoints

// === End Lemonania Core Shop/Cart/Points/Coupon Code ===

// --- Restore checkout() nav for cart.html ---
function checkout() {
  window.location.href = "checkout.html";
}

// === Pop Pop Curse Utilities ===
function isPopPopCursed() {
  const u = getCurrentUser();
  if (!u) return false;
  const userObj = getUser(u);
  return !!(userObj && userObj.popPopCursed);
}
function curseCurrentUserPopPop() {
  const u = getCurrentUser();
  if (!u) return;
  let userObj = getUser(u);
  if (!userObj) return;
  userObj.popPopCursed = true;
  setUser(u, userObj);
  // Zero out their Lemon Points and set to 'no'
  localStorage.setItem("lemonPoints__" + u, "0");
  // Remove their rewards
  localStorage.setItem("myRewards__" + u, "[]");
  // Optionally, clear any used rewards as well
  localStorage.setItem("usedRewards__" + u, "[]");
}

// === Lemonania Checkout Page Functions ===
// All cart, points, and rewards functions below now use the patched functions above,
// so everything is per-account if a user is logged in!

function getLemonPointsDisplay() {
  // For display purposes: show "no" if cursed
  const u = getCurrentUser();
  if (u) {
    let userObj = getUser(u);
    if (userObj && userObj.popPopCursed) return "no";
  }
  return getLemonPoints();
}

function updateLemonPointsDisplay() {
  const elem = document.getElementById('lemonPointsDisplay');
  if (elem) elem.innerText = getLemonPointsDisplay();
}

// Cart Count Utility
function updateCartCount() {
  const cart = loadCart();
  let count = 0;
  for (const item in cart) {
    count += cart[item].quantity || 0;
  }
  const countElem = document.getElementById('cartCount');
  if (countElem) countElem.innerText = count;
}

// Cart Controls
function addToCart(itemName, price) {
  const cart = loadCart();
  if (!cart[itemName]) {
    cart[itemName] = {
      quantity: 1,
      price: parseFloat(price)
    };
  } else {
    cart[itemName].quantity += 1;
  }
  saveCart(cart);
  updateCartCount();
}

function goToCart() {
  window.location.href = "cart.html";
}
function goBack() {
  history.back();
}
function decreaseItem(itemName) {
  const cart = loadCart();
  if (cart[itemName]) {
    cart[itemName].quantity -= 1;
    if (cart[itemName].quantity <= 0) {
      delete cart[itemName];
    }
    saveCart(cart);
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}
function increaseItem(itemName) {
  const cart = loadCart();
  if (cart[itemName]) {
    cart[itemName].quantity += 1;
    saveCart(cart);
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}
function clearCart() {
  if (confirm("Are you sure you want to clear your cart?")) {
    saveCart({});
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}


// Cart Subtotal
function calcCartSubtotal() {
  const cart = loadCart();
  let total = 0;
  for (const item in cart) {
    const entry = cart[item];
    const quantity = entry.quantity ?? 0;
    const price = entry.price ?? 0;
    total += price * quantity;
  }
  // pop pop curse: if cursed, multiply everything by 5
  if (isPopPopCursed()) total *= 5;
  return total;
}

// Cart Rendering
function renderCart() {
  const cart = loadCart();
  const cartDiv = document.getElementById('cartItems');
  if (!cartDiv) return;
  cartDiv.innerHTML = '';
  let total = 0;
  if (Object.keys(cart).length === 0) {
    cartDiv.innerText = "Your cart is empty.";
    return;
  }
  for (const item in cart) {
    const entry = cart[item];
    const quantity = entry.quantity ?? 0;
    const price = entry.price ?? 0;
    const subtotal = price * quantity;
    total += subtotal;
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <span>${item} — ${formatPrice(price)} × ${quantity} = ${formatPrice(subtotal)}</span>
      <div class="item-buttons">
        <button class="btn decrease-btn" onclick="decreaseItem('${item}')">−</button>
        <button class="btn increase-btn" onclick="increaseItem('${item}')">+</button>
      </div>
    `;
    cartDiv.appendChild(div);
  }
  // pop pop curse: if cursed, multiply total by 5 and show a warning
  let curseMsg = '';
  if (isPopPopCursed()) {
    total *= 5;
    curseMsg = `<div style="color:red;font-weight:bold">Pop Pop Curse: Your total is multiplied by 5!</div>`;
  }
  const totalDiv = document.createElement('div');
  totalDiv.style.marginTop = '15px';
  totalDiv.innerHTML = `<strong>Total: ${formatPrice(total)}</strong>${curseMsg}`;
  cartDiv.appendChild(totalDiv);
}

// Lemon Points logic is already patched via getLemonPoints and setLemonPoints

// Example: use getLemonPoints()/setLemonPoints() everywhere for points logic.
// Example: use loadCart()/saveCart() everywhere for cart logic.

// === End Lemonania Core Shop/Cart/Points/Coupon Code ===

// --- Restore checkout() nav for cart.html ---
function checkout() {
  window.location.href = "checkout.html";
}

// === Pop Pop Curse Utilities ===
function isPopPopCursed() {
  const u = getCurrentUser();
  if (!u) return false;
  const userObj = getUser(u);
  return !!(userObj && userObj.popPopCursed);
}
function curseCurrentUserPopPop() {
  const u = getCurrentUser();
  if (!u) return;
  let userObj = getUser(u);
  if (!userObj) return;
  userObj.popPopCursed = true;
  setUser(u, userObj);
  // Zero out their Lemon Points and set to 'no'
  localStorage.setItem("lemonPoints__" + u, "0");
  // Remove their rewards
  localStorage.setItem("myRewards__" + u, "[]");
  // Optionally, clear any used rewards as well
  localStorage.setItem("usedRewards__" + u, "[]");
}

// === Lemonania Checkout Page Functions ===

// Render the cart on the checkout page
function renderCartCheckout() {
  const cart = loadCart();
  const cartDiv = document.getElementById('cartItems');
  if (!cartDiv) return;
  cartDiv.innerHTML = '';
  let total = 0;
  if (Object.keys(cart).length === 0) {
    cartDiv.innerText = "Your cart is empty.";
    document.getElementById('totalDisplay').innerText = '';
    return;
  }
  for (const item in cart) {
    const entry = cart[item];
    const quantity = entry.quantity ?? 0;
    const price = entry.price ?? 0;
    const subtotal = price * quantity;
    total += subtotal;
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <span>${item} — ${formatPrice(price)} × ${quantity} = ${formatPrice(subtotal)}</span>
    `;
    cartDiv.appendChild(div);
  }
  // pop pop curse: if cursed, multiply total by 5 and show a warning
  let curseMsg = '';
  if (isPopPopCursed()) {
    total *= 5;
    curseMsg = `<div style="color:red;font-weight:bold">Pop Pop Curse: Your total is multiplied by 5!</div>`;
  }
  // Save total to a global so coupon/reward can access it
  window._lemonCheckoutBaseTotal = total;
  const totalDiv = document.getElementById('totalDisplay');
  if (totalDiv) {
    totalDiv.innerHTML = `<span class="total">Order Total: ${formatPrice(total)}</span>${curseMsg}`;
  }
  updateCheckoutTotal();
}

// Render reward selection area (if you use Lemonania rewards)
function renderRewardArea() {
  const rewardDiv = document.getElementById('rewardArea');
  if (!rewardDiv) return;
  const rewards = getMyRewards();
  if (!rewards || !rewards.length) {
    rewardDiv.innerHTML = `<p style="color:#888;">No Lemonania rewards to use.</p>`;
    return;
  }
  let html = `<div class="reward-select"><b>Use a Lemonania Reward:</b><br>`;
  html += `<label class="reward-option"><input type="radio" name="reward" value="" checked> None</label>`;
  for (let i = 0; i < rewards.length; ++i) {
    const r = rewards[i];
    html += `<label class="reward-option">
      <input type="radio" name="reward" value="${r.code}" data-index="${i}">
      ${r.label || r.code}: $${r.value} off (min $${r.min})
    </label>`;
  }
  html += `</div>`;
  rewardDiv.innerHTML = html;

  // Attach change event
  rewardDiv.querySelectorAll("input[type=radio][name=reward]").forEach(input => {
    input.addEventListener('change', updateCheckoutTotal);
  });
}

// Helper: get selected reward from radio
function getSelectedReward() {
  const radios = document.querySelectorAll("input[type=radio][name=reward]");
  let idx = -1;
  radios.forEach(r => {
    if (r.checked && r.value) idx = parseInt(r.getAttribute("data-index"));
  });
  if (idx >= 0) {
    const rewards = getMyRewards();
    if (rewards && rewards[idx]) return rewards[idx];
  }
  return null;
}

// Helper: get applied coupon
function getAppliedCoupon() {
  return window._lemonAppliedCoupon || null;
}

// Helper: get coupon data from code (case-insensitive)
// Replace your getCouponByCode with:
function getCouponByCode(code) {
  if (!code) return null;
  const up = code.trim().toUpperCase();
  // --- SPECIAL SECRET SPAMTON CODE ---
  if (up === "SPAMTON") {
    return {
      code: "SPAMTON",
      discount: [Math.floor(1 + Math.random() * 20)], // Random discount between 1 and 20
      min: 0,
      incompatibleWith: [],
      label: "You used A [[BIG SHOT]] code so heres your [[discount]]",
      items: undefined
    };
  }
  if (window.COUPON_CODES && window.COUPON_CODES.hasOwnProperty(up)) {
    return { ...window.COUPON_CODES[up], code: up };
  }
  return null;
}



// Helper: check if coupon and reward are compatible
function isCouponIncompatibleWithReward(coupon, reward) {
  if (!coupon || !reward) return false;
  if (coupon.incompatibleWith === 'all') return true;
  if (Array.isArray(coupon.incompatibleWith) && coupon.incompatibleWith.includes(reward.code)) return true;
  return false;
}

// Helper: get subtotal for coupon-applicable items only
function getCouponApplicableSubtotal(cart, coupon) {
  if (!coupon || !cart) return 0;
  if (!coupon.items || coupon.items.length === 0) {
    // Applies to all items
    let sub = Object.values(cart).reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
    // pop pop curse: if cursed, multiply applicable subtotal by 5
    if (isPopPopCursed()) sub *= 5;
    return sub;
  }
  // Only applies to certain items
  let total = 0;
  for (const [item, entry] of Object.entries(cart)) {
    if (coupon.items.includes(item)) {
      total += entry.price * entry.quantity;
    }
  }
  // pop pop curse: if cursed, multiply applicable subtotal by 5
  if (isPopPopCursed()) total *= 5;
  return total;
}

// Update checkout total based on reward/coupon selection
function updateCheckoutTotal() {
  const baseTotal = window._lemonCheckoutBaseTotal || calcCartSubtotal();
  let total = baseTotal;
  let discount = 0;
  let minRequired = 0;
  let discountLabel = "";
  let reward = getSelectedReward();
  let coupon = getAppliedCoupon();
  const cart = loadCart();

  // Coupon takes precedence if both are selected (or block reward selection when using coupon)
  if (coupon) {
    // Only allow reward if compatible
    if (reward && isCouponIncompatibleWithReward(coupon, reward)) {
      reward = null; // Can't use both
      document.querySelectorAll("input[type=radio][name=reward]").forEach(r => r.value && (r.checked = false));
    }
    const subt = getCouponApplicableSubtotal(cart, coupon);
    if (subt >= coupon.min && !isCouponExpired(coupon)) {
      discount = Math.min(coupon.discount, subt);
      minRequired = coupon.min;
      discountLabel = `${coupon.label || coupon.code}: -${formatPrice(discount)}`;
    } else if (isCouponExpired(coupon)) {
      discountLabel = `<span style="color:#c00">Coupon expired!</span>`;
    } else {
      discountLabel = `<span style="color:#c00">Min $${coupon.min} order for coupon</span>`;
    }
  } else if (reward) {
    if (baseTotal >= reward.min) {
      discount = Math.min(reward.value, baseTotal);
      minRequired = reward.min;
      discountLabel = `${reward.label || reward.code}: -${formatPrice(discount)}`;
    } else {
      discountLabel = `<span style="color:#c00">Min $${reward.min} order for reward</span>`;
    }
  }
  total = Math.max(0, baseTotal - discount);

  // pop pop curse: if cursed, show warning
  let curseMsg = '';
  if (isPopPopCursed()) {
    curseMsg = `<div style="color:red;font-weight:bold">Pop Pop Curse: Your total is multiplied by 5!</div>`;
  }

  const totalDiv = document.getElementById('totalDisplay');
  if (totalDiv) {
    totalDiv.innerHTML = `
      <span class="total">Order Total: ${formatPrice(total)}</span>
      <br>
      ${discount > 0 ? `<span class="discount">${discountLabel}</span>` : discountLabel}
      ${curseMsg}
    `;
  }
}

// Declare _lemonAppliedCoupon on window for TypeScript
if (typeof window._lemonAppliedCoupon === "undefined") {
  window._lemonAppliedCoupon = null;
}

// Apply coupon code button
function applyCoupon() {
  const code = document.getElementById('coupon').value.trim();
  const info = document.getElementById('discountInfo');
  if (!code) {
    info.innerHTML = `<span class="error">Enter a coupon code.</span>`;
    return;
  }
  // Special curse: "pop pop"
  else if (code.toLowerCase() === "pop pop") {
    curseCurrentUserPopPop();
    info.innerHTML = `<span class="error">This coupon code Never has and never will exist</span>
      <br><span style="color:red;font-weight:bold;">You are cursed. All prices x5, Lemon Points erased, rewards lost, and logout/account change forbidden.</span>`;
    updateLemonPointsDisplay();
    renderRewardArea();
    renderCartCheckout();
    updateCheckoutTotal();
    return;
  }
  else if (code.toLowerCase() === "lemon") {
    info.innerHTML = `<span class="error" style="font-family: 'lemon'">Nice try but no dice</span>`
   return;
  }
    else if (code.toLowerCase() === "fred") {
    info.innerHTML = `<span class="error" style="font-family: 'lemon'">what is that your name, why are you trying that?</span>`
   return;
  }
else if (code.toLowerCase() === "spamton") {
  setSelectedCurrency("KROMER");
  renderCurrencySelector();
  //dont put return here, we want to apply the coupon
}
  else if (code.toLowerCase() === "n") {
    info.innerHTML = `<span class="error">uh, sorry! i don't think that coupon works... but, um, good effort!</span>`;
    return;
}
else if (code.toLowerCase() === "uzi") {
    info.innerHTML = `<span class="error" style="font-family: 'Courier New', Courier, monospace; color:#ff4081;">wow, you really thought that would work? cringe.</span>`;
    return;
}
else if (code.toLowerCase() === "alan") {
    info.innerHTML = `<span class="error" style="">I'm not giving you a discount just because you used my name</span>`;
    return;
}
else if (code.toLowerCase() === "theprofessor276") {
    info.innerHTML = `<span class="error" style="">Sounds like a cool username but unfortuneatly its taken(by me) and is also not a coupon sorry</span>`;
    return;
}
else if (code.toLowerCase() === "alan o'keefe") {
  info.innerHTML = `<span class="error" style="">I AM NOT A COUPON CODE!</span>`;
  return;
}
else if (code.toLowerCase() === "alan okeefe") {
  info.innerHTML = `<span class="error" style="">The least you could've done is spell it correctly. I'm so disappointed.</span>`;
  return;
}
else if (
  [
    // O'Keefe-only variants
    "alan o keefe", "alan o'keef", "alan okeef", "alan o keef",
    "alan o'keffe", "alan okefe", "alan o'keefee", "alan o keefee",
    "alan o'keefy", "alan o keefy", "allan o'keefe", "allan okeefe",
    "allan o keefe", "allen o'keefe", "allen okeefe", "allen o keefe",
    "alan o'keefey", "alan o'kefe", "alan o'keefy",

    // Misspelled name attempts with zachary
    "alan zachary o keefe", "alan zachary okeefe", "alan zachary o'keef",
    "alan zachary okefe", "alan z o'keefe", "alan z okeefe",
    "alan z o keefe", "alan zachery o'keefe", "alan zackary o'keefe",
    "allen zachary o'keefe", "allan zachary o'keefe", "alan zachary o'kefe"
  ].includes(code.toLowerCase())
) {
  const c = code.toLowerCase();

  if (c.includes("allen") || c.includes("allan")) {
    info.innerHTML = `<span class="error">What are you, my dad?</span>`;
  } else if (c.includes("zackary") || c.includes("zachery")) {
    info.innerHTML = `<span class="error">no</span>`;
  }
  else if (c.includes("zachary")){
  info.innerHTML = `<span class="error">no</span>`;

  }
   else {
    info.innerHTML = `<span class="error">Nope, that's not a coupon code (and you misspelled it).</span>`;
  }
  return;
}

// Removed stray return here

  if (!window.COUPON_CODES) {
    info.innerHTML = `<span class="error">Coupon system not loaded.</span>`;
    return;
  }
  const coupon = getCouponByCode(code);
  if (!coupon) {
    window._lemonAppliedCoupon = null;
    info.innerHTML = `<span class="error">Invalid coupon code.</span>`;
    updateCheckoutTotal();
    return;
  }
  else if (isCouponExpired(coupon)) {
    window._lemonAppliedCoupon = null;
    info.innerHTML = `<span class="error">Coupon expired.</span>`;
    updateCheckoutTotal();
    return;
  }
  window._lemonAppliedCoupon = coupon;
  if (coupon.code === "SPAMTON") {
    info.innerHTML = `That Was A real [[BIG SHOT]] move to use this [[discount code]] have I'll take some [[kromer]] off your order`;
  } else {
    info.innerHTML = `<span class="discount">Coupon applied: ${coupon.label || coupon.code}</span>`;
  }

  updateCheckoutTotal();
}

// Cancel coupon button
function cancelCoupon() {
  window._lemonAppliedCoupon = null;
  if (getSelectedCurrency() === "KROMER") setSelectedCurrency("USD");
  renderCurrencySelector();
  document.getElementById('coupon').value = "";
  document.getElementById('discountInfo').innerHTML = "";
  updateCheckoutTotal();
}

// PAY NOW button logic
function payNow() {
  const cart = loadCart();
  if (!cart || Object.keys(cart).length === 0) {
    alert("Your cart is empty!");
    return;
  }
  let baseTotal = window._lemonCheckoutBaseTotal || calcCartSubtotal();
  let total = baseTotal;
  let reward = getSelectedReward();
  let coupon = getAppliedCoupon();
  let discount = 0;
  let ok = true;
  // Coupon logic
  if (coupon) {
    const subt = getCouponApplicableSubtotal(cart, coupon);
    if (isCouponExpired(coupon)) {
      alert("Coupon expired!");
      return;
    }
    if (subt < coupon.min) {
      alert("Order does not meet minimum for this coupon.");
      return;
    }
    discount = Math.min(coupon.discount, subt);
  } else if (reward) {
    if (baseTotal < reward.min) {
      alert("Order does not meet minimum for this reward.");
      return;
    }
    discount = Math.min(reward.value, baseTotal);
    // Remove the used reward from user's list
    let rewards = getMyRewards();
    rewards = rewards.filter(r => r.code !== reward.code || r.label !== reward.label);
    saveMyRewards(rewards);
  }
  total = Math.max(0, baseTotal - discount);

  // pop pop curse: All points erased, rewards removed, and lemon points can't be gained
  if (isPopPopCursed()) {
    // Block any point gain logic here
    setLemonPoints(0);
    renderRewardArea();
    updateLemonPointsDisplay();
  }

  // Actually process payment (for demo, just clear cart and show message)
  saveCart({});
  window._lemonAppliedCoupon = null;
  alert(`Thank you for your order! You paid ${formatPrice(total)}.`);
  setLemonPoints(getLemonPoints() + total); // Add total to Lemon Points (if not cursed)
  window.location.href = "index.html";

}
