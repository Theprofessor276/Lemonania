import { getBankBalance } from './debug.js';

const user = getCurrentUser();
const balance = getBankBalance(user);
console.log(`Balance for ${user}: $${balance.toFixed(2)}`);
