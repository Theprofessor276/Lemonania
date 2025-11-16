import { getBankBalance } from './debug.js';

const user = getCurrentUser();
const balance = getBankBalance(user);
document.getElementById('balance').innerHTML = `$${balance.toFixed(2)}`;
// boo