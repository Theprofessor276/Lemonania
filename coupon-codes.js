// coupon-codes.js
// List of non-Lemon Points coupon codes and their properties

// Structure: code, { discount, min, incompatibleWith (array of reward codes or 'all'), label/desc }

const COUPON_CODES = {
  "SUMMER5": {
    discount: 5,
    min: 25,
    incompatibleWith: 'all', // Incompatible with all Lemon Points rewards
    label: "$5 off (SUMMER5) - min $25"
  },
  "BIGLEMON": {
    discount: 12,
    min: 50,
    incompatibleWith: 'all',
    label: "$12 off (BIGLEMON) - min $50"
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