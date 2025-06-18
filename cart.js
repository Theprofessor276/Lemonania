// Utility: Set cookie with path=/
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// Utility: Get cookie by name
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\\[\\]\\/\\+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Calculate cart item count (sum of all quantities)
function getCartCount() {
  let cart = {};
  try { cart = JSON.parse(getCookie('fakeCart') || '{}'); } catch {}
  let count = 0;
  for (let k in cart) count += cart[k].qty;
  return count;
}

// Update the cart badge
function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = getCartCount();
}

// Add item to cart (stored as a JSON object in the "fakeCart" cookie)
function addToCart(item) {
  let cart = {};
  try { cart = JSON.parse(getCookie('fakeCart') || '{}'); } catch {}
  if (cart[item.id]) {
    cart[item.id].qty += 1;
  } else {
    cart[item.id] = { name: item.name, price: item.price, qty: 1 };
  }
  setCookie('fakeCart', JSON.stringify(cart));
  updateCartBadge();
  alert(`${item.name} added to cart!`);
}

// Setup listeners & badge
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.order[data-item]').forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault(); // Prevent any navigation
      const item = JSON.parse(this.getAttribute('data-item'));
      addToCart(item);
    });
  });
  updateCartBadge();
});