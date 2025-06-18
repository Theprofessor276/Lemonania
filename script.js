// shop.js: Shared script for cart functionality and click sounds

// 🔊 Paths to click sounds
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