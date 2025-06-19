// Robust Lemonania shop.js: Cart, Lemon Points, Rewards, Coupons and click sounds

// --- Lemon Points Utilities ---
function getLemonPoints() {
  if (localStorage.getItem('popPopActive') === 'true') return null;
  return Math.max(0, parseInt(localStorage.getItem('lemonPoints') || '0', 10));
}
function setLemonPoints(points) {
  if (localStorage.getItem('popPopActive') === 'true') {
    localStorage.setItem('lemonPoints', 'no');
    updateLemonPointsDisplay();
    return;
  }
  localStorage.setItem('lemonPoints', String(Math.max(0, Math.floor(points))));
}
function addLemonPoints(amount) {
  if (localStorage.getItem('popPopActive') === 'true') {
    localStorage.setItem('lemonPoints', 'no');
    updateLemonPointsDisplay();
    return;
  }
  setLemonPoints(getLemonPoints() + Math.max(0, Math.floor(amount)));
}
function spendLemonPoints(amount) {
  if (localStorage.getItem('popPopActive') === 'true') {
    localStorage.setItem('lemonPoints', 'no');
    updateLemonPointsDisplay();
    return false;
  }
  let current = getLemonPoints();
  let spend = Math.max(0, Math.floor(amount));
  if (current >= spend) {
    setLemonPoints(current - spend);
    return true;
  }
  return false;
}
function updateLemonPointsDisplay() {
  const elem = document.getElementById('lemonPointsDisplay');
  if (elem) {
    if (localStorage.getItem('popPopActive') === 'true' || localStorage.getItem('lemonPoints') === 'no') {
      elem.innerText = 'no';
    } else {
      elem.innerText = getLemonPoints();
    }
  }
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
function calcCartSubtotal() {
  const cart = loadCart();
  let total = 0;
  for (const item in cart) {
    const entry = cart[item];
    const quantity = entry.quantity ?? 0;
    const price = entry.price ?? 0;
    total += price * quantity;
  }
  // If pop pop, add 50%
  if (localStorage.getItem('popPopActive') === 'true') {
    total *= 1.5;
  }
  return total;
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

// --- Add to Cart ---
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

// --- Lemonania Reward helpers ---
function getMyRewards() {
  try {
    return JSON.parse(localStorage.getItem('myRewards')) || [];
  } catch {
    return [];
  }
}
function saveMyRewards(rewards) {
  localStorage.setItem('myRewards', JSON.stringify(rewards));
}
function removeMyReward(index) {
  const rewards = getMyRewards();
  if (index >= 0 && index < rewards.length) {
    rewards.splice(index, 1);
    saveMyRewards(rewards);
  }
}

// --- State for checkout ---
let appliedRewardIndex = null;
let appliedReward = null;
let appliedCouponCode = null;
let appliedDiscount = 0;
let appliedMin = 0;

// --- Render cart for checkout page ---
function renderCartCheckout() {
  const cart = loadCart();
  const cartDiv = document.getElementById('cartItems');
  if (!cartDiv) return;
  cartDiv.innerHTML = '';
  let total = 0;
  if (Object.keys(cart).length === 0) {
    cartDiv.innerText = "Your cart is empty.";
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
    div.innerHTML = `<span>${item} — $${price.toFixed(2)} × ${quantity} = $${subtotal.toFixed(2)}</span>`;
    cartDiv.appendChild(div);
  }
  // Pop pop 50% notice
  if (localStorage.getItem('popPopActive') === 'true') {
    const popDiv = document.createElement('div');
    popDiv.style = "color:#b00;font-weight:bold;margin-top:1em;";
    popDiv.innerText = "Your total has been increased by 50% due to your coupon code choice.";
    cartDiv.appendChild(popDiv);
  }
  updateTotalDisplay(total);
}

// --- Render Lemonania rewards to select/use ---
function renderRewardArea() {
  const area = document.getElementById('rewardArea');
  if (!area) return;
  const rewards = getMyRewards();
  if (!rewards.length) {
    area.innerHTML = `<div class="reward-select"><b>No Lemonania rewards available.</b><br>
      <a href="coupons.html">Redeem Lemon Points for Rewards</a></div>`;
    return;
  }
  let subtotal = calcCartSubtotal();
  let options = rewards.map((r, i) => {
    let disabled = subtotal < r.min ? "disabled" : "";
    let checked = appliedRewardIndex === i ? "checked" : "";
    return `<label class="reward-option">
      <input type="radio" name="reward" value="${i}" ${checked} ${disabled} onchange="selectReward(${i})">
      ${r.label || r.code}: $${r.value} off (min $${r.min}) ${subtotal < r.min ? '<span style="color:#c00;">(need $' + r.min + ' in cart)</span>' : ''}
    </label>`;
  }).join('');
  area.innerHTML = `<div class="reward-select"><b>Use a Lemonania Reward:</b><br>${options}
    <button onclick="removeSelectedReward()" style="margin-top:0.8em;">Remove Reward</button></div>`;
}

// --- Handle reward select/deselect ---
function selectReward(idx) {
  const rewards = getMyRewards();
  let subtotal = calcCartSubtotal();
  if (rewards[idx] && subtotal >= rewards[idx].min) {
    appliedRewardIndex = idx;
    appliedReward = rewards[idx];
    appliedCouponCode = null;
    appliedDiscount = appliedReward.value;
    appliedMin = appliedReward.min;
  } else {
    // Don't apply if not eligible
    appliedRewardIndex = null;
    appliedReward = null;
    appliedDiscount = 0;
    appliedMin = 0;
  }
  renderRewardArea();
  updateTotalDisplay(calcCartSubtotal());
  const discountInfoElem = document.getElementById('discountInfo');
  if (discountInfoElem) discountInfoElem.innerHTML = '';
  const couponElem = document.getElementById('coupon');
  if (couponElem) couponElem.value = '';
}
function removeSelectedReward() {
  appliedRewardIndex = null;
  appliedReward = null;
  appliedDiscount = 0;
  appliedMin = 0;
  renderRewardArea();
  updateTotalDisplay(calcCartSubtotal());
}

// --- Coupon code logic ---
function applyCoupon() {
  const codeElem = document.getElementById('coupon');
  const code = codeElem ? codeElem.value.trim().toLowerCase() : '';
  const subtotal = calcCartSubtotal();
  const discountInfoElem = document.getElementById('discountInfo');

  if (code === "pop pop") {
    // Activate pop pop curse
    localStorage.setItem('popPopActive', 'true');
    localStorage.setItem('lemonPoints', 'no');
    updateLemonPointsDisplay();
    lemonPointsApplied = 0;
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="error">This coupon code Never has and never will exist</span>';
    renderCartCheckout();
    updateTotalDisplay(subtotal); // subtotal will now include 50% increase
    return;
  }

  if (localStorage.getItem('popPopActive') === 'true') {
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="error">No more coupons. You used "pop pop".</span>';
    renderCartCheckout();
    updateTotalDisplay(subtotal);
    return;
  }

  if (appliedRewardIndex !== null) {
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="error">Remove Lemonania reward to use a coupon code.</span>';
    return;
  }
  // Example coupons
  if (code === "summer5" && subtotal >= 25) {
    appliedCouponCode = code;
    appliedDiscount = 5;
    appliedMin = 25;
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="discount">SUMMER5 applied: $5 off!</span>';
  } else if (code === "biglemon" && subtotal >= 50) {
    appliedCouponCode = code;
    appliedDiscount = 12;
    appliedMin = 50;
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="discount">BIGLEMON applied: $12 off!</span>';
  } else {
    appliedCouponCode = null;
    appliedDiscount = 0;
    appliedMin = 0;
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="error">Invalid code or not enough in cart!</span>';
  }
  updateTotalDisplay(subtotal);
}
function cancelCoupon() {
  if (localStorage.getItem('popPopActive') === 'true') {
    const discountInfoElem = document.getElementById('discountInfo');
    if (discountInfoElem)
      discountInfoElem.innerHTML = '<span class="error">No coupon can help you now.</span>';
    return;
  }
  appliedCouponCode = null;
  appliedDiscount = 0;
  appliedMin = 0;
  const couponElem = document.getElementById('coupon');
  if (couponElem) couponElem.value = '';
  const discountInfoElem = document.getElementById('discountInfo');
  if (discountInfoElem) discountInfoElem.innerHTML = '';
  updateTotalDisplay(calcCartSubtotal());
}

// --- Update displayed total with reward/coupon ---
function updateTotalDisplay(subtotal) {
  // If pop pop, force price increase and no discounts
  if (localStorage.getItem('popPopActive') === 'true') {
    subtotal = subtotal; // Already 50% higher in calcCartSubtotal
    const totalElem = document.getElementById("totalDisplay");
    if (totalElem)
      totalElem.innerHTML = `Total: $${subtotal.toFixed(2)} <span class="error">(Pop Pop: +50%)</span>`;
    return;
  }

  let discount = (typeof appliedDiscount === "number" ? appliedDiscount : 0);
  let min = appliedMin || 0;
  let finalTotal = subtotal;
  let info = "";
  if (discount > 0 && subtotal >= min) {
    finalTotal = Math.max(0, subtotal - discount);
    info += ` <span class="discount">( -$${discount.toFixed(2)} )</span>`;
  }
  const totalElem = document.getElementById("totalDisplay");
  if (totalElem)
    totalElem.innerHTML = `Total: $${finalTotal.toFixed(2)}${info}`;
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

// --- Checkout (from cart page) ---
function checkout() {
  playClick();
  window.location.href = "checkout.html";
}

// --- Lemon Points: Apply at checkout (for cart-only flow, not rewards/coupons) ---
let lemonPointsApplied = 0;
function applyLemonPoints() {
  if (localStorage.getItem('popPopActive') === 'true') {
    const infoElem = document.getElementById('pointsInfo');
    if (infoElem)
      infoElem.innerHTML = `<span class="error">No Lemon Points for you.</span>`;
    updateLemonPointsDisplay();
    return;
  }
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

// --- Pay Now (checkout) -- now handles rewards/coupons/points
function payNow() {
  playClick && playClick();
  if (localStorage.getItem('popPopActive') === 'true') {
    // No Lemon Points, no discounts, 50% upcharge
    // Just clear cart, NO points awarded
    localStorage.removeItem('cart');
    lemonPointsApplied = 0;
    updateCartCount && updateCartCount();
    updateLemonPointsDisplay && updateLemonPointsDisplay();
    alert('Thank you for your order!\nYou get no Lemon Points.');
    window.location.href = "index.html";
    return;
  }
  const subtotal = calcCartSubtotal();
  let discount = 0;
  let usedReward = false;

  // Reward/coupon logic for checkout.html
  if (typeof appliedRewardIndex !== "undefined" && appliedRewardIndex !== null && typeof getMyRewards === "function") {
    // Using reward
    const rewards = getMyRewards();
    const reward = rewards && rewards[appliedRewardIndex];
    if (reward && subtotal >= (reward.min || 0)) {
      discount = reward.value;
      removeMyReward(appliedRewardIndex);
      usedReward = true;
      appliedRewardIndex = null;
      appliedReward = null;
    } else if (reward && subtotal < (reward.min || 0)) {
      alert("You do not have enough in your cart for this reward.");
      return;
    }
  } else if (typeof appliedCouponCode !== "undefined" && appliedCouponCode) {
    // Using coupon
    discount = appliedDiscount || 0;
    appliedCouponCode = null;
    appliedDiscount = 0;
    appliedMin = 0;
  } else if (typeof lemonPointsApplied !== "undefined" && lemonPointsApplied > 0) {
    // Lemon Points used in script.js context
    discount = lemonPointsApplied * 5;
    spendLemonPoints(lemonPointsApplied * 100);
    lemonPointsApplied = 0;
  }

  // Calculate final total
  let total = Math.max(0, subtotal - discount);

  // Award Lemon Points: 1 per $1 spent (before discount)
  const pointsEarned = Math.floor(subtotal);
  addLemonPoints(pointsEarned);

  // Reset states/coupon/reward
  appliedCouponCode = null;
  appliedDiscount = 0;
  appliedMin = 0;

  // Clear cart
  localStorage.removeItem('cart');
  updateCartCount && updateCartCount();
  updateLemonPointsDisplay && updateLemonPointsDisplay();

  alert(`Thank you for your order!\nYou earned ${pointsEarned} Lemon Points! 🍋`);
  window.location.href = "index.html";
}

// --- Coupon code stubs (not used with Lemon Points for now, but preserved for extensibility) ---
function applyCouponStub() {
  alert("Coupon codes are not yet supported. Try Lemon Points!");
}
function cancelCouponStub() {}

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

// --- Used Rewards Management (for coupons.html and other pages) ---
function getUsedRewards() {
  try {
    return JSON.parse(localStorage.getItem('usedRewards')) || [];
  } catch {
    return [];
  }
}
function saveUsedRewards(used) {
  localStorage.setItem('usedRewards', JSON.stringify(used));
}
function addUsedReward(reward) {
  const used = getUsedRewards();
  used.push({
    ...reward,
    usedAt: new Date().toISOString()
  });
  saveUsedRewards(used);
}
window.addUsedReward = addUsedReward;

// --- On page load helpers for Lemon Points in header ---
document.addEventListener("DOMContentLoaded", function() {
  updateCartCount();
  updateLemonPointsDisplay();
  // If popPopActive and lemonPoints is not 'no', force set
  if (localStorage.getItem('popPopActive') === 'true') {
    localStorage.setItem('lemonPoints', 'no');
    updateLemonPointsDisplay();
  }
});