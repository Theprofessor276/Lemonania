// Set a cookie with path=/
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days*24*60*60*1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

// Safe, regex-free version
function getCookie(name) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  return null;
}

// Get the total item count in the cart
function getCartCount() {
  let cart = {};
  try { cart = JSON.parse(getCookie('fakeCart') || '{}'); } catch {}
  let count = 0;
  for (let k in cart) count += cart[k].qty;
  return count;
}

// Update the badge number
function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = getCartCount();
}

// Add item to cart
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

// On every page load, update the badge and set up order buttons
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.order[data-item]').forEach(link => {
    link.addEventListener('click', function(event) {
      event.preventDefault();
      const item = JSON.parse(this.getAttribute('data-item'));
      addToCart(item);
    });
  });
  updateCartBadge();
});