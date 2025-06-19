// coupon-codes.js
// List of non-Lemon Points coupon codes and their properties

// Structure: code, {
//   discount,
//   min,
//   incompatibleWith (array of reward codes or 'all'),
//   label/desc,
//   expires (UTC timestamp, optional),
//   items (array of item names, optional: coupon applies only to these items; default is all)
// }

const COUPON_CODES = {
  "SUMMER5": {
    discount: 5,
    min: 25,
    incompatibleWith: 'all', // Incompatible with all Lemon Points rewards
    label: "$5 off (SUMMER5) - min $25",
    expires: Date.UTC(2025, 7, 1), // August 1, 2025 (months are zero-based)
    items: undefined // Applies to all items if not set
  },
  "BIGLEMON": {
    discount: 12,
    min: 50,
    incompatibleWith: 'all',
    label: "$12 off (BIGLEMON) - min $50",
    // No expires (never expires)
    items: undefined // Applies to all items if not set
  },
  "DRINKS10": {
    discount: 10,
    min: 15,
    incompatibleWith: [],
    label: "$10 off drinks (DRINKS10, min $15, on beverages only)",
    expires: Date.UTC(2027, 0, 1), // January 1, 2027
    items: ["Lemon Lemonaid"] // Only applies to these items
  },
    "TEST": {
    discount: 100,
    min: 1,
    incompatibleWith: [],
        label: "$10 off drinks (DRINKS10, min $15, on beverages only)",
    expires: Date.UTC(2023, 0, 1), // January 1, 2024
    items: undefined // Only applies to these items
  }
  // Add more coupons here as needed, using the same structure
};

// Optionally: expose a function to fetch by code (case-insensitive)
function getCouponByCode(code) {
  if (!code) return null;
  const up = code.trim().toUpperCase();
  if (COUPON_CODES.hasOwnProperty(up)) {
    return { ...COUPON_CODES[up], code: up };
  }
  return null;
}

// Helper for compatibility checks
function isCouponIncompatibleWithReward(coupon, reward) {
  if (!coupon || !reward) return false;
  // 'all' means incompatible with any Lemon Points reward
  if (coupon.incompatibleWith === 'all') return true;
  if (Array.isArray(coupon.incompatibleWith) && coupon.incompatibleWith.includes(reward.code)) return true;
  return false;
}

// Helper: check if a coupon is expired
function isCouponExpired(coupon) {
  if (!coupon.expires) return false; // No expiration = never expires
  return Date.now() > coupon.expires;
}

// Helper: get subtotal for coupon-applicable items only
function getCouponApplicableSubtotal(cart, coupon) {
  if (!coupon || !cart) return 0;
  if (!coupon.items || coupon.items.length === 0) {
    // Applies to all items
    return Object.values(cart).reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
  }
  // Only applies to certain items
  let total = 0;
  for (const [item, entry] of Object.entries(cart)) {
    if (coupon.items.includes(item)) {
      total += entry.price * entry.quantity;
    }
  }
  return total;
}