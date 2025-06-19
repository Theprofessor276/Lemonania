// Robust Lemonania shop.js: Cart, Lemon Points, and click sounds

// --- Lemon Points Utilities ---
// Always clamp to zero, never allow negative points!
function getLemonPoints() {
  return Math.max(0, parseInt(localStorage.getItem('lemonPoints') || '0', 10));
}
function setLemonPoints(points) {
  localStorage.setItem('lemonPoints', String(Math.max(0, Math.floor(points))));
}
function addLemonPoints(amount) {
  setLemonPoints(getLemonPoints() + Math.max(0, Math.floor(amount)));
}
function spendLemonPoints(amount) {
  let current = getLemonPoints();
  let spend = Math.max(0, Math.floor(amount));
  if (current >= spend) {
    setLemonPoints(current - spend);
    return true;
  }
  // Not enough points, do not allow
  return false;
}
function updateLemonPointsDisplay() {
  const elem = document.getElementById('lemonPointsDisplay');
  if (elem) elem.innerText = getLemonPoints();
}

// --- Cart LocalStorage Utilities ---
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || {};
  } catch {
    return {};
  }
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// --- Cart Count Utility ---
function updateCartCount() {
  const cart = loadCart();
  let count = 0;
  for (const item in cart) {
    count += cart[item].quantity || 0;
  }
  const countElem = document.getElementById('cartCount');
  if (countElem) countElem.innerText = count;
}

// --- Add to Cart (for shop) ---
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

// --- Go to Cart ---
function goToCart() {
  window.location.href = "cart.html";
}

// --- Go Back (for cart page) ---
function goBack() {
  history.back();
}

// --- Decrease Item in Cart (for cart page) ---
function decreaseItem(itemName) {
  playClick();
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

// --- Clear Cart (for cart page) ---
function clearCart() {
  playClick();
  if (confirm("Are you sure you want to clear your cart?")) {
    localStorage.removeItem('cart');
    if (typeof renderCart === "function") renderCart();
    updateCartCount();
  }
}

// --- Format Price Utility ---
function formatPrice(num) {
  return (typeof num === 'number' && !isNaN(num)) ? num.toFixed(2) : '0.00';
}

// --- Render cart for checkout page ---
function renderCartCheckout() {
  const cart = loadCart();
  const cartDiv = document.getElementById('cartItems');
  if (!cartDiv) return;
  cartDiv.innerHTML = '';
  let total = 0;

  if (Object.keys(cart).length === 0) {
    cartDiv.innerText = "Your cart is empty.";
    updateLemonPointsDisplay();
    updateTotalDisplay(0);
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
    `;
    cartDiv.appendChild(div);
  }
  updateLemonPointsDisplay();
  updateTotalDisplay(total);
}

// --- Update total display with Lemon Points logic ---
let lemonPointsApplied = 0;
function updateTotalDisplay(subtotal) {
  let discount = lemonPointsApplied * 5;
  let total = Math.max(0, subtotal - discount);
  let info = `Total: $${formatPrice(total)}`;
  if (lemonPointsApplied > 0) {
    info += ` <span style="color:green;">(${lemonPointsApplied * 100} Lemon Points applied, -$${discount.toFixed(2)})</span>`;
  }
  const totalElem = document.getElementById('totalDisplay');
  if (totalElem) totalElem.innerHTML = info;
}

// --- Render Cart (for cart page) ---
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
      </div>
    `;
    cartDiv.appendChild(div);
  }

  const totalDiv = document.createElement('div');
  totalDiv.style.marginTop = '15px';
  totalDiv.innerHTML = `<strong>Total: $${formatPrice(total)}</strong>`;
  cartDiv.appendChild(totalDiv);
}

// --- Checkout (for cart page) ---
function checkout() {
  playClick();
  window.location.href = "checkout.html";
}

// --- Lemon Points: Apply at checkout ---
function applyLemonPoints() {
  const subtotal = calcCartSubtotal();
  const maxUsableChunks = Math.min(Math.floor(getLemonPoints() / 100), Math.floor(subtotal / 5));
  if (maxUsableChunks === 0) {
    alert("You don't have enough Lemon Points (need at least 100), or your subtotal is too low.");
    return;
  }
  lemonPointsApplied = maxUsableChunks;
  updateTotalDisplay(subtotal);
  updateLemonPointsDisplay();
  const infoElem = document.getElementById('pointsInfo');
  if (infoElem)
    infoElem.innerHTML =
      `<span style="color:green;">Applied ${maxUsableChunks * 100} Lemon Points for $${(maxUsableChunks * 5).toFixed(2)} off.</span>`;
}
function cancelLemonPoints() {
  lemonPointsApplied = 0;
  updateTotalDisplay(calcCartSubtotal());
  const infoElem = document.getElementById('pointsInfo');
  if (infoElem) infoElem.innerHTML = '';
}

// --- Cart subtotal helper ---
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

// --- Pay Now (checkout) ---
function payNow() {
  playClick();
  const subtotal = calcCartSubtotal();
  let discount = lemonPointsApplied * 5;
  let total = Math.max(0, subtotal - discount);

  // Award Lemon Points: 1 per $1 spent (before discount)
  const pointsEarned = Math.floor(subtotal);
  addLemonPoints(pointsEarned);

  // Spend Lemon Points if used
  if (lemonPointsApplied > 0) {
    // Only spend if user has enough (should be true if applyLemonPoints is used!)
    spendLemonPoints(lemonPointsApplied * 100);
  }

  // Clear cart, reset points used
  localStorage.removeItem('cart');
  lemonPointsApplied = 0;
  updateCartCount();
  updateLemonPointsDisplay();

  alert(`Thank you for your order!\nYou earned ${pointsEarned} Lemon Points! 🍋`);
  window.location.href = "index.html";
}

// --- Coupon code stubs (not used with Lemon Points for now, but preserved for extensibility) ---
function applyCoupon() {
  alert("Coupon codes are not yet supported. Try Lemon Points!");
}
function cancelCoupon() {
  // No-op for now
}

// --- Click sound (optional, for fun) ---
const clickPaths = [
  "kenney_interface-sounds/Audio/click_001.ogg",
  "kenney_interface-sounds/Audio/click_002.ogg",
  "kenney_interface-sounds/Audio/click_003.ogg",
  "kenney_interface-sounds/Audio/click_004.ogg",
  "kenney_interface-sounds/Audio/click_005.ogg"
];
function playClick() {
  const player = document.getElementById("clickPlayer");
  if (!player) return;
  const randomSound = clickPaths[Math.floor(Math.random() * clickPaths.length)];
  player.src = randomSound;
  player.currentTime = 0;
  player.play();
}

// --- On page load helpers for Lemon Points in header ---
document.addEventListener("DOMContentLoaded", function() {
  updateCartCount();
  updateLemonPointsDisplay();
});