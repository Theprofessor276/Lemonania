// === Lemonania Account System Additions Start ===

// --- Constants & Utility ---
const LS_KEY_USERS = "lemonUsers"; // { username: {email, verified, pfp, ...} }
const LS_KEY_CURRENT = "lemonCurrentUser";

// --- EmailJS Config (use your actual IDs!) ---
const EMAILJS_SERVICE = "service_3uepw1g";
const EMAILJS_TEMPLATE = "template_bjwslao";
const EMAILJS_PUBLIC_KEY = "MPEttrKFI6fFs8iNx";
// Add your new template ID for verified email below:
const EMAILJS_TEMPLATE_VERIFIED = "template_1zqrydx"; // <-- CHANGE THIS TO YOUR NEW TEMPLATE ID!

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY_USERS)) || {};
  } catch { return {}; }
}
function saveAllUsers(users) {
  localStorage.setItem(LS_KEY_USERS, JSON.stringify(users));
}
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

// --- Fake Email Verification using EmailJS ---
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
        'email': toEmail, // <-- FIXED: must match {{email}} in your template!
        'username': username,
        'passcode': code,
        'time': expiry
      }
    })
  }).then(r => r.ok ? cb(true) : cb(false))
    .catch(e => cb(false));
}

// --- Send Account Verified Email ---
function sendAccountVerifiedEmail(toEmail, username, cb) {
  fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE,
      template_id: EMAILJS_TEMPLATE_VERIFIED,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        'email': toEmail, // <-- FIXED: must match {{email}} in your template!
        'username': username
      }
    })
  })
  .then(r => r.ok ? cb(true) : cb(false))
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
      <button type="button" onclick="registerUser()">Register</button>
      <button type="button" onclick="loginUser()">Login</button>
      <div id="accountMsg"></div>
    </form>`;
  } else {
    const u = getUser(user);
    let pfp = u && u.pfp ? `<img src="${u.pfp}" class="pfp-img" alt="Profile Picture"><br>` : '';
    let emailStatus = u && u.verified
      ? `<span class="success">Verified</span>`
      : `<span class="error">Not Verified</span>
         <span class="fake-link" onclick="showVerifyPrompt()">[Verify Now]</span>
         <span class="fake-link" onclick="resendVerificationEmail()">[Resend]</span>`;
    if (!document.getElementById('accountArea')) return;
    document.getElementById('accountArea').innerHTML = `
      <h2>Your Lemonania Account</h2>
      <div style="text-align:center;">${pfp}
        <form onsubmit="return false" style="margin-bottom:1em;">
          <label for="pfpInput">Change Profile Picture:</label>
          <input type="file" id="pfpInput" accept="image/*" style="margin:0.5em auto 1em auto;" onchange="changePFP(event)">
        </form>
      </div>
      <table class="account-info-table">
        <tr><th>Username:</th><td>${user}</td></tr>
        <tr><th>Email:</th><td>${u.email}</td></tr>
        <tr><th>Email Status:</th><td id="emailStatus">${emailStatus}</td></tr>
      </table>
      <button onclick="logoutUser()">Log Out</button>
      <div class="account-area">
        <h3>Lemon Stats</h3>
        <ul>
          <li>Lemon Points: <b>${getUserPoints(user)}</b></li>
          <li>Rewards: <b>${getUserRewards(user).length}</b></li>
          <li>Cart Items: <b>${getUserCartCount(user)}</b></li>
        </ul>
      </div>
      <div id="accountMsg"></div>
    `;
  }
}

function getUserPoints(username) {
  return Number(localStorage.getItem("lemonPoints__" + username) || "0");
}
function getUserRewards(username) {
  try {
    return JSON.parse(localStorage.getItem("myRewards__" + username)) || [];
  } catch { return []; }
}
function getUserCartCount(username) {
  try {
    const cart = JSON.parse(localStorage.getItem("cart__" + username)) || {};
    let count = 0;
    for (const k in cart) count += cart[k].quantity || 0;
    return count;
  } catch { return 0; }
}

// --- Account Actions ---
window.registerUser = function() {
  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('accountMsg');
  if (!username || !email || !password) { msg.innerHTML = '<span class="error">Fill all fields.</span>'; return; }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) { msg.innerHTML = '<span class="error">Username letters, numbers, _ only.</span>'; return; }
  if (username.length < 3 || username.length > 24) { msg.innerHTML = '<span class="error">Username 3-24 chars.</span>'; return; }
  let users = getAllUsers();
  if (users[username]) { msg.innerHTML = '<span class="error">Username already exists.</span>'; return; }
  if (Object.values(users).some(u => u.email === email)) { msg.innerHTML = '<span class="error">Email already used.</span>'; return; }
  let code = Math.floor(100000 + Math.random()*900000).toString();
  users[username] = { email, password, verified:false, code, pfp:null };
  saveAllUsers(users);
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
  setCurrentUser(username);
  migrateUserDataToThisUser(username);
  // If not verified, make sure code exists and resend email automatically
  if (!u.verified) {
    if (!u.code) {
      u.code = Math.floor(100000 + Math.random()*900000).toString();
      setUser(username, u);
    }
    sendVerificationEmail(u.email, username, u.code, function(){});
  }
  renderAccountArea();
}

window.logoutUser = function() {
  setCurrentUser(null);
  renderAccountArea();
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
    // Send verified email!
    sendAccountVerifiedEmail(u.email, username, function(success) {
      // Optionally show feedback
    });
    msg.innerHTML = '<span class="success">Email verified! Logging in...</span>';
    setTimeout(() => renderAccountArea(), 800);
  } else {
    msg.innerHTML = '<span class="error">Incorrect code. Check your email.</span>';
  }
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
  };
  reader.readAsDataURL(file);
};

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

// --- Patch shop.js functions for per-account data ---
function patchGlobalFunctionsForAccounts() {
  const orig_loadCart = window.loadCart;
  window.loadCart = function() {
    const u = getCurrentUser();
    if (u) {
      try {
        return JSON.parse(localStorage.getItem("cart__" + u)) || {};
      } catch { return {}; }
    }
    return orig_loadCart ? orig_loadCart() : {};
  };
  const orig_saveCart = window.saveCart;
  window.saveCart = function(cart) {
    const u = getCurrentUser();
    if (u) {
      localStorage.setItem("cart__" + u, JSON.stringify(cart));
      return;
    }
    if (orig_saveCart) orig_saveCart(cart);
  };
  window.getLemonPoints = function() {
    const u = getCurrentUser();
    if (u) return Math.max(0, parseInt(localStorage.getItem("lemonPoints__" + u) || '0', 10));
    return Math.max(0, parseInt(localStorage.getItem("lemonPoints") || '0', 10));
  };
  window.setLemonPoints = function(points) {
    const u = getCurrentUser();
    if (u) localStorage.setItem("lemonPoints__" + u, String(Math.max(0, Math.floor(points))));
    else localStorage.setItem("lemonPoints", String(Math.max(0, Math.floor(points))));
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
window.resendVerificationEmail = function() {
  const username = getCurrentUser();
  if (!username) return;
  const user = getUser(username);
  if (!user) return;
  // Generate a new code and save it
  let code = Math.floor(100000 + Math.random()*900000).toString();
  user.code = code;
  setUser(username, user);
  // Send the email
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

// --- On DOMContentLoaded, patch functions and render account area if present ---
document.addEventListener("DOMContentLoaded", function() {
  patchGlobalFunctionsForAccounts();
  if (typeof renderAccountArea === "function" && document.getElementById('accountArea')) renderAccountArea();
});

// === Lemonania Account System Additions End ===

// === Begin Untouched Lemonania Core Shop/Cart/Points/Coupon Code ===

// ... (PASTE ALL REMAINING SHOP/CART/POINTS/COUPON CODE HERE AS IT ALREADY EXISTS IN YOUR script.js) ...

// === End Untouched Lemonania Core ===