      // --- HEADER LOADER ---
      fetch('header.html')
        .then(r => r.text())
        .then(html => {
          document.getElementById('lemonania-header').innerHTML = html;
          if (typeof updateLemonPointsDisplay === "function") updateLemonPointsDisplay();
        });

      // --- Debug Account System Helpers ---
      function getAllUsers() {
        try { return JSON.parse(localStorage.getItem("lemonUsers")) || {}; } catch { return {}; }
      }
      function saveAllUsers(users) { localStorage.setItem("lemonUsers", JSON.stringify(users)); }
      function getUser(username) {
        const users = getAllUsers();
        return users[username] || null;
      }
      function setUser(username, userObj) {
        const users = getAllUsers();
        users[username] = userObj;
        saveAllUsers(users);
      }
      // getCurrentUser/setCurrentUser provided by the main script (script.js)

      // --- Debug Quick Register (Skip Verification Option) ---
      function debugQuickRegister() {
        const username = document.getElementById('debugRegUsername').value.trim();
        const email = document.getElementById('debugRegEmail').value.trim();
        const password = document.getElementById('debugRegPassword').value;
        const skipVerify = document.getElementById('debugSkipVerify').checked;
        const msg = document.getElementById('debugRegMsg');
        msg.textContent = '';
        // Pop Pop forbidden names check (redirect to error if matched)
        const forbiddenNames = [/pop[\s_]?pop/i];
        if (forbiddenNames.some(re => re.test(username))) {
          window.location.href = "error.html?reason=poppop";
          return;
        }
        if (!username || !email || !password) { msg.innerHTML = '<span class="debug-error">Fill all fields.</span>'; return; }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) { msg.innerHTML = '<span class="debug-error">Username: letters, numbers, _ only.</span>'; return; }
        if (username.length < 3 || username.length > 24) { msg.innerHTML = '<span class="debug-error">Username: 3-24 chars.</span>'; return; }
        let users = getAllUsers();
        if (users[username]) { msg.innerHTML = '<span class="debug-error">Username already exists.</span>'; return; }
        if (Object.values(users).some(u => u.email === email)) { msg.innerHTML = '<span class="debug-error">Email already used.</span>'; return; }
        let code = Math.floor(100000 + Math.random()*900000).toString();
        if (skipVerify) {
          users[username] = { email, password, verified: true, code: undefined, pfp: null };
          saveAllUsers(users);
          setCurrentUser(username);
          msg.innerHTML = '<span class="debug-success">Account created (no email verification needed) and logged in!</span>';
          showDebugUserStatus();
          showUserDebug();
          return;
        }
        users[username] = { email, password, verified:false, code, pfp:null };
        saveAllUsers(users);
        setCurrentUser(username);
        msg.innerHTML = '<span class="debug-success">Account created (verification required, but not sent in debug).</span>';
        showDebugUserStatus();
        showUserDebug();
      }

      // --- Show current user and curse status ---
      function showDebugUserStatus() {
        let out = '';
        let tools = '';
        const u = getCurrentUser();
        if (u) {
          const obj = getUser(u);
          out += `<b>Current User:</b> <code>${u}</code>`;
          if (obj && obj.popPopCursed) {
            out += ' <span class="curse-warning">POPP POP CURSE ACTIVE!</span>';
            tools += `<button class="debug-btn" onclick="uncurseCurrentUser()">Remove Pop Pop Curse from this user</button>`;
          } else {
            out += ' <span class="un-cursed">Not Cursed</span>';
            tools += `<button class="debug-btn" onclick="curseCurrentUserPopPop()">Apply Pop Pop Curse to this user</button>`;
          }
        } else {
          out = '<i>None (not logged in)</i>';
        }
        document.getElementById('debugStatus-user').innerHTML = out;
        document.getElementById('curse-tools').innerHTML = tools;
      }

      function uncurseCurrentUser() {
        const u = getCurrentUser();
        if (!u) return;
        let obj = getUser(u);
        if (obj && obj.popPopCursed) {
          delete obj.popPopCursed;
          setUser(u, obj);
          localStorage.setItem('lemonPoints__' + u, "0");
          showDebugUserStatus();
          showUserDebug();
          alert("Pop Pop Curse removed! User can now earn Lemon Points and logout.");
        }
      }
      function curseCurrentUserPopPop() {
        const u = getCurrentUser();
        if (!u) return;
        let userObj = getUser(u);
        if (!userObj) return;
        userObj.popPopCursed = true;
        setUser(u, userObj);
        localStorage.setItem("lemonPoints__" + u, "0");
        localStorage.setItem("myRewards__" + u, "[]");
        localStorage.setItem("usedRewards__" + u, "[]");
        showDebugUserStatus();
        showUserDebug();
        alert("Pop Pop Curse applied! User cannot logout, all prices x5, Lemon Points erased, and no rewards.");
      }

      // --- List all users, show curse/verify/password status ---
      function showUserDebug() {
        const all = getAllUsers();
        let html = '';
        if (!Object.keys(all).length) {
          html = '<i>No users found in storage.</i>';
        } else {
          html = '<ul class="user-list">';
          for (const uname in all) {
            const u = all[uname];
            const bal = parseFloat(localStorage.getItem('lemonBank__' + uname) || '0').toFixed(2);
            const pts = parseInt(localStorage.getItem('lemonPoints__' + uname) || '0', 10);
            html += `<li><b>${uname}</b> - email: <code>${u.email}</code> - verified: <code>${!!u.verified}</code> - balance: <code>$${bal}</code> - lemonPoints: <code>${pts}</code>`;
            if (u.popPopCursed) html += ' <span class="curse-warning">CURSED</span>';
            else html += ' <span class="un-cursed">Not Cursed</span>';
            html += `<br>Password: <code>${u.password}</code>`;
            html += '</li>';
          }
          html += '</ul>';
        }
        document.getElementById('userDebug').innerHTML = html;
      }

      // --- Lemon Points ---
      function setLemonPointsDebug() {
        let u = getCurrentUser();
        let v = parseInt(document.getElementById('setLemonPointsInput').value, 10);
        if (isNaN(v) || v < 0) v = 0;
        // Use canonical setters so UI updates properly
        try {
          if (typeof window.getLemonPoints === 'function' && typeof window.setLemonPoints === 'function') {
            const userObj = getUser(getCurrentUser());
            if (userObj && userObj.popPopCursed) {
              window.setLemonPoints(0);
              document.getElementById('debugStatus-lemon').innerText = 'User is cursed. Lemon Points locked at 0.';
              if (typeof updateLemonPointsDisplay === 'function') updateLemonPointsDisplay();
              return;
            }
            window.setLemonPoints(v);
          } else {
            // fallback
            const u = getCurrentUser();
            if (u) localStorage.setItem("lemonPoints__" + u, String(Math.max(0, Math.floor(v))));
            else localStorage.setItem("lemonPoints", String(Math.max(0, Math.floor(v))));
          }
        } catch (e) {
          // fallback write
          const u = getCurrentUser();
          if (u) localStorage.setItem("lemonPoints__" + u, String(Math.max(0, Math.floor(v))));
          else localStorage.setItem("lemonPoints", String(Math.max(0, Math.floor(v))));
        }
        document.getElementById('debugStatus-lemon').innerText = 'Lemon Points set to ' + v;
        if (typeof updateLemonPointsDisplay === 'function') updateLemonPointsDisplay();
      }
      function addLemonPointsDebug(amt) {
        const u = getCurrentUser();
        let pts;
        try {
          if (typeof window.getLemonPoints === 'function' && typeof window.setLemonPoints === 'function') {
            const current = getLemonPoints();
            const userObj = getUser(getCurrentUser());
            if (userObj && userObj.popPopCursed) {
              window.setLemonPoints(0);
              document.getElementById('debugStatus-lemon').innerText = 'User is cursed. Lemon Points locked at 0.';
              if (typeof updateLemonPointsDisplay === 'function') updateLemonPointsDisplay();
              return;
            }
            const newVal = Math.max(0, current + amt);
            window.setLemonPoints(newVal);
            pts = newVal;
          } else {
            if (u) {
              pts = parseInt(localStorage.getItem("lemonPoints__" + u) || '0',10);
              pts += amt;
              if (pts < 0) pts = 0;
              localStorage.setItem("lemonPoints__" + u, String(pts));
            } else {
              pts = parseInt(localStorage.getItem("lemonPoints") || '0',10);
              pts += amt;
              if (pts < 0) pts = 0;
              localStorage.setItem("lemonPoints", String(pts));
            }
          }
        } catch (e) {
          // fallback behavior
          if (u) {
            pts = parseInt(localStorage.getItem("lemonPoints__" + u) || '0',10);
            pts += amt;
            if (pts < 0) pts = 0;
            localStorage.setItem("lemonPoints__" + u, String(pts));
          } else {
            pts = parseInt(localStorage.getItem("lemonPoints") || '0',10);
            pts += amt;
            if (pts < 0) pts = 0;
            localStorage.setItem("lemonPoints", String(pts));
          }
        }
        document.getElementById('debugStatus-lemon').innerText = 'Lemon Points changed by ' + amt + ', now ' + pts;
        if (typeof updateLemonPointsDisplay === 'function') updateLemonPointsDisplay();
      }
      function zeroLemonPoints() {
        try {
          if (typeof window.setLemonPoints === 'function') window.setLemonPoints(0);
          else setLemonPointsDebug(0);
        } catch (e) { setLemonPointsDebug(0); }
        document.getElementById('debugStatus-lemon').innerText = 'Lemon Points set to 0.';
        if (typeof updateLemonPointsDisplay === 'function') updateLemonPointsDisplay();
      }

      // --- Cart ---
      function fillCart() {
        const u = getCurrentUser();
        const testCart = {
          "Giant Lemon": { quantity: 3, price: 14.99 },
          "Lemon Lemonaid": { quantity: 2, price: 3.99 },
          "Quantum Lemon": { quantity: 1, price: 14.99 },
          "Invisible Lemon": { quantity: 4, price: 6.99 }
        };
        if (u)
          localStorage.setItem('cart__' + u, JSON.stringify(testCart));
        else
          localStorage.setItem('cart', JSON.stringify(testCart));
        document.getElementById('debug-cart-table').innerHTML = '<b>Cart filled with test data.</b>';
      }
      function clearCartDebug() {
        const u = getCurrentUser();
        if (u)
          localStorage.removeItem('cart__' + u);
        else
          localStorage.removeItem('cart');
        document.getElementById('debug-cart-table').innerHTML = '<b>Cart cleared.</b>';
      }
      function showCartDebug() {
        const u = getCurrentUser();
        let cart;
        try { cart = JSON.parse(localStorage.getItem(u ? 'cart__' + u : 'cart')) || {}; } catch { cart = {}; }
        if (!cart || Object.keys(cart).length === 0) {
          document.getElementById('debug-cart-table').innerHTML = 'Cart is empty.';
          return;
        }
        let html = '<table class="debug-table"><tr><th>Item</th><th>Qty</th><th>Price</th></tr>';
        for (const k in cart) {
          html += `<tr><td>${k}</td><td>${cart[k].quantity}</td><td>$${cart[k].price.toFixed(2)}</td></tr>`;
        }
        html += '</table>';
        document.getElementById('debug-cart-table').innerHTML = html;
      }

      // --- Rewards ---
      function giveTestRewards() {
        const u = getCurrentUser();
        const rewards = [
          { code: 'SOUR5', value: 5, min: 20, label: '$5 Off Reward' },
          { code: 'ZEST10', value: 10, min: 40, label: '$10 Off Reward' },
          { code: 'LEMONANIA15', value: 15, min: 60, label: '$15 Off Reward' }
        ];
        if (u)
          localStorage.setItem('myRewards__' + u, JSON.stringify(rewards));
        else
          localStorage.setItem('myRewards', JSON.stringify(rewards));
        document.getElementById('debug-rewards-table').innerHTML = '<b>Test rewards granted.</b>';
      }
      // --- Bank debug helpers ---
      function dbgSetBank() {
        const u = document.getElementById('dbgBankUser').value.trim();
        const a = parseFloat(document.getElementById('dbgBankAmt').value) || 0;
        if (!u) { document.getElementById('debug-bank-result').innerText = 'Enter username'; return; }
        try {
          if (typeof window.setBankBalance === 'function') {
            window.setBankBalance(u, +(a).toFixed(2));
          } else {
            localStorage.setItem('lemonBank__' + u, Number(a).toFixed(2));
          }
        } catch (e) { localStorage.setItem('lemonBank__' + u, Number(a).toFixed(2)); }
        document.getElementById('debug-bank-result').innerText = `Set ${u} balance to ${a}`;
        try { if (typeof renderBankBalance === 'function') renderBankBalance(); } catch(e){}
      }
      function dbgAddBank() {
        const u = document.getElementById('dbgBankUser').value.trim();
        const a = parseFloat(document.getElementById('dbgBankAmt').value) || 0;
        if (!u) { document.getElementById('debug-bank-result').innerText = 'Enter username'; return; }
        try {
          const cur = (typeof window.getBankBalance === 'function') ? window.getBankBalance(u) : parseFloat(localStorage.getItem('lemonBank__' + u) || '0');
          const nw = +(cur + a).toFixed(2);
          if (typeof window.setBankBalance === 'function') window.setBankBalance(u, nw);
          else localStorage.setItem('lemonBank__' + u, Number(nw).toFixed(2));
          document.getElementById('debug-bank-result').innerText = `Added ${a} to ${u}. New ${ nw.toFixed(2) }`;
        } catch (e) {
          const cur = parseFloat(localStorage.getItem('lemonBank__' + u) || '0');
          localStorage.setItem('lemonBank__' + u, Number(cur + a).toFixed(2));
          document.getElementById('debug-bank-result').innerText = `Added ${a} to ${u}. New ${ (cur+a).toFixed(2) }`;
        }
        try { if (typeof renderBankBalance === 'function') renderBankBalance(); } catch(e){}
      }
      function dbgSubBank() {
        const u = document.getElementById('dbgBankUser').value.trim();
        const a = parseFloat(document.getElementById('dbgBankAmt').value) || 0;
        if (!u) { document.getElementById('debug-bank-result').innerText = 'Enter username'; return; }
        try {
          const cur = (typeof window.getBankBalance === 'function') ? window.getBankBalance(u) : parseFloat(localStorage.getItem('lemonBank__' + u) || '0');
          const nw = +(cur - a).toFixed(2);
          if (typeof window.setBankBalance === 'function') window.setBankBalance(u, nw);
          else localStorage.setItem('lemonBank__' + u, Number(nw).toFixed(2));
          document.getElementById('debug-bank-result').innerText = `Subtracted ${a} from ${u}. New ${ nw.toFixed(2) }`;
        } catch (e) {
          const cur = parseFloat(localStorage.getItem('lemonBank__' + u) || '0');
          localStorage.setItem('lemonBank__' + u, Number(cur - a).toFixed(2));
          document.getElementById('debug-bank-result').innerText = `Subtracted ${a} from ${u}. New ${ (cur-a).toFixed(2) }`;
        }
        try { if (typeof renderBankBalance === 'function') renderBankBalance(); } catch(e){}
      }
      function showUserStocksDebug() {
        const u = getCurrentUser();
        if (!u) { document.getElementById('debug-stock-output').innerText = 'Not signed in'; return; }
        const pf = JSON.parse(localStorage.getItem('lemonStockPf__' + u) || '{}');
        document.getElementById('debug-stock-output').innerText = JSON.stringify(pf, null, 2);
      }
      function clearRewards() {
        const u = getCurrentUser();
        if (u)
          localStorage.removeItem('myRewards__' + u);
        else
          localStorage.removeItem('myRewards');
        document.getElementById('debug-rewards-table').innerHTML = '<b>All rewards cleared.</b>';
      }
      function showRewards() {
        const u = getCurrentUser();
        let rewards;
        try { rewards = JSON.parse(localStorage.getItem(u ? 'myRewards__' + u : 'myRewards')) || []; } catch { rewards = []; }
        if (!rewards.length) {
          document.getElementById('debug-rewards-table').innerHTML = 'No rewards found.';
          return;
        }
        let html = '<table class="debug-table"><tr><th>Code</th><th>Value</th><th>Min</th><th>Label</th></tr>';
        for (const r of rewards) {
          html += `<tr><td>${r.code}</td><td>$${r.value}</td><td>$${r.min}</td><td>${r.label || ''}</td></tr>`;
        }
        html += '</table>';
        document.getElementById('debug-rewards-table').innerHTML = html;
      }

      // --- Coupons ---
      function setTestCoupon(code) {
        alert('To test coupons, please use the checkout page and enter the code: ' + code);
        document.getElementById('debugStatus-coupon').innerText = 'Test coupon "' + code + '" to be used on checkout page.';
      }
      function clearCoupon() {
        alert('Clear coupon feature is available on the checkout page.');
        document.getElementById('debugStatus-coupon').innerText = 'Coupon cleared (if supported by page).';
      }

      // --- Used Rewards ---
      function clearUsedRewards() {
        const u = getCurrentUser();
        if (u)
          localStorage.removeItem('usedRewards__' + u);
        else
          localStorage.removeItem('usedRewards');
        document.getElementById('debug-used-rewards-table').innerHTML = '<b>All used rewards cleared.</b>';
      }
      function showUsedRewards() {
        const u = getCurrentUser();
        let used;
        try { used = JSON.parse(localStorage.getItem(u ? 'usedRewards__' + u : 'usedRewards')) || []; } catch { used = []; }
        if (!used.length) {
          document.getElementById('debug-used-rewards-table').innerHTML = 'No used rewards found.';
          return;
        }
        let html = '<table class="debug-table"><tr><th>Code</th><th>Value</th><th>Min</th><th>Label</th><th>Used At</th></tr>';
        for (const r of used) {
          html += `<tr><td>${r.code}</td><td>$${r.value}</td><td>$${r.min}</td><td>${r.label || ''}</td><td>${r.usedAt || ''}</td></tr>`;
        }
        html += '</table>';
        document.getElementById('debug-used-rewards-table').innerHTML = html;
      }

      // --- Show all localStorage ---
      function showAllLocalStorage() {
        let html = '<table class="debug-table"><tr><th>Key</th><th>Value</th></tr>';
        for (let i = 0; i < localStorage.length; ++i) {
          const k = localStorage.key(i);
          let v = localStorage.getItem(k);
          if (v && v.length > 200) v = v.substr(0, 200) + '...';
          html += `<tr><td>${k}</td><td>${v}</td></tr>`;
        }
        html += '</table>';
        document.getElementById('debug-all-storage').innerHTML = html;
      }
      // --- Clear All Local Storage ---
      function clearLocalStorageAll() {
        if (confirm("Are you sure you want to clear ALL localStorage data? This cannot be undone.")) {
          localStorage.clear();
          alert("All localStorage cleared.");
          showAllLocalStorage();
          showUserDebug();
          showDebugUserStatus();
          document.getElementById('debug-cart-table').innerHTML = '';
          document.getElementById('debug-rewards-table').innerHTML = '';
          document.getElementById('debug-used-rewards-table').innerHTML = '';
          document.getElementById('debugStatus-lemon').innerText = '';
          document.getElementById('debugStatus-coupon').innerText = '';
        }
      }

      document.addEventListener("DOMContentLoaded", function() {
        showDebugUserStatus();
        showUserDebug();
      });
      export function getBankBalance(username) {
         const balance = localStorage.getItem('lemonBank__' + username);
         return balance ? parseFloat(balance) : 0;
}
