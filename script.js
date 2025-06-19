// === Lemonania Account System Additions Start ===

// --- Constants & Utility ---
const LS_KEY_USERS = "lemonUsers"; // { username: {email, verified, pfp, ...} }
const LS_KEY_CURRENT = "lemonCurrentUser";

// --- EmailJS Config ---
const EMAILJS_SERVICE = "service_3uepw1g";
const EMAILJS_TEMPLATE = "template_bjwslao";
const EMAILJS_PUBLIC_KEY = "MPEttrKFI6fFs8iNx";
const EMAILJS_TEMPLATE_VERIFIED = "template_1zqrydx";

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
      <button type="button" onclick="registerUser()">Register</button>
      <button type="button" onclick="loginUser()">Login</button>
      <div id="accountMsg"></div>
    </form>`;
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
      <button class="logout-btn" onclick="logoutUser()">Log Out</button>
      <div class="account-area">
        <h3>Lemon Stats</h3>
        <ul>
          <li>Lemon Points: <b>${getLemonPoints()}</b></li>
          <li>Rewards: <b>${getMyRewards().length}</b></li>
          <li>Cart Items: <b>${getUserCartCount(user)}</b></li>
        </ul>
      </div>
      <div id="accountMsg"></div>
    `;
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
window.logoutUser = function() {
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
document.addEventListener("DOMContentLoaded", function() {
  patchGlobalFunctionsForAccounts();
  if (typeof renderAccountArea === "function" && document.getElementById('accountArea')) renderAccountArea();
});

// === End Lemonania Account System Additions ===

// === Begin Lemonania Core Shop/Cart/Points/Coupon Code ===

// All cart, points, and rewards functions below now use the patched functions above,
// so everything is per-account if a user is logged in!

function updateLemonPointsDisplay() {
  const elem = document.getElementById('lemonPointsDisplay');
  if (elem) elem.innerText = getLemonPoints();
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
function formatPrice(num) {
  return (typeof num === 'number' && !isNaN(num)) ? num.toFixed(2) : '0.00';
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
      <span>${item} — $${formatPrice(price)} × ${quantity} = $${formatPrice(subtotal)}</span>
      <div class="item-buttons">
        <button class="btn decrease-btn" onclick="decreaseItem('${item}')">−</button>
        <button class="btn increase-btn" onclick="increaseItem('${item}')">+</button>
      </div>
    `;
    cartDiv.appendChild(div);
  }
  const totalDiv = document.createElement('div');
  totalDiv.style.marginTop = '15px';
  totalDiv.innerHTML = `<strong>Total: $${formatPrice(total)}</strong>`;
  cartDiv.appendChild(totalDiv);
}

// Lemon Points logic is already patched via getLemonPoints and setLemonPoints

// Example: use getLemonPoints()/setLemonPoints() everywhere for points logic.
// Example: use loadCart()/saveCart() everywhere for cart logic.

// === End Lemonania Core Shop/Cart/Points/Coupon Code ===