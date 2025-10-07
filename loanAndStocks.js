// Loan application modal wiring
document.addEventListener('DOMContentLoaded', function(){
  const depositBtn = document.getElementById('depositBtn');
  const modal = document.getElementById('loanAppModal');
  const cancel = document.getElementById('cancelLoanApp');
  const submit = document.getElementById('submitLoanApp');
  const result = document.getElementById('loanAppResult');

  function showModal() {
    // prefill amount from input
    const a = document.getElementById('depositAmount');
    document.getElementById('appAmount').value = a ? a.value : '';
    // show credit score
    const user = getCurrentUser();
    if (user) {
      const score = getCreditScore(user);
      result.innerHTML = `<div style="margin-bottom:0.6em">Your credit score: <strong>${score}</strong></div>`;
    } else {
      result.innerHTML = '<div style="color:crimson">Please sign in to apply.</div>';
    }
    modal.style.display = 'flex';
  }
  function hideModal(){ modal.style.display = 'none'; }

  depositBtn.addEventListener('click', function(){ showModal(); });
  cancel.addEventListener('click', hideModal);

  submit.addEventListener('click', function(){
    const user = getCurrentUser();
    if (!user) { result.innerHTML = '<div style="color:crimson">Sign in first.</div>'; return; }
    const application = {
      amount: +(document.getElementById('appAmount').value || 0),
      termMonths: parseInt(document.getElementById('appTerm').value || '1',10),
      income: +(document.getElementById('appIncome').value || 0),
      expenses: +(document.getElementById('appExpenses').value || 0),
      employmentYears: +(document.getElementById('appEmployment').value || 0),
      purpose: document.getElementById('appPurpose').value || ''
    };
    const evalRes = evaluateLoanApplication(user, application);
    if (!evalRes.approved) {
      result.innerHTML = `<div style="color:#c00">Application declined. Credit score: ${evalRes.score}. Max allowed (estimate): ${formatPrice(evalRes.maxAllowed)}</div>`;
      // optionally reduce score slightly on rejection
      setTimeout(()=>{ try { adjustCreditOnLate(user, null, 0); } catch(e){} }, 200);
      return;
    }
    // Approved - show details and ask for confirmation
    result.innerHTML = `<div style="color:green">Approved (score ${evalRes.score}). Max allowed: ${formatPrice(evalRes.maxAllowed)}. <button id="confirmLoanNow">Confirm and Accept Loan</button></div>`;
    document.getElementById('confirmLoanNow').addEventListener('click', function(){
      // create loan for min(application.amount, evalRes.maxAllowed)
      const amt = Math.min(application.amount, evalRes.maxAllowed);
      const loan = createLoan(user, amt, Math.max(1, application.termMonths*30));
      result.innerHTML = `<div style="color:green">Loan created: ${formatPrice(loan.principal)} — You owe ${formatPrice(loan.totalOwed)}. <button id="closeAppOk">Close</button></div>`;
      document.getElementById('closeAppOk').addEventListener('click', function(){ hideModal(); renderBank(); renderMarket(); });
      // small positive bump to credit for accepted loan and principal receipt
      try { adjustCreditOnRepayment(user, loan.id, 0); } catch(e){}
    });
  });
});

// === Lemonania Fancy Stock Market ===

// list of stocks (name, ticker, drift)
const STOCKS = [
  { sym: "AAPL", name: "Apple Inc.", base: 180, drift: 0 },
  { sym: "TSLA", name: "Tesla Motors", base: 250, drift: 0 },
  { sym: "AMZN", name: "Amazon", base: 130, drift: 0 },
  { sym: "MSFT", name: "Microsoft", base: 310, drift: 0 },
  { sym: "GOOG", name: "Alphabet", base: 140, drift: 0 },
  { sym: "NFTZ", name: "NFT Fund", base: 50, drift: -0.5 } // always decays
];

const stockHistory = {}; // {sym:[...]}
const stockBoosts = {}; // NFTZ temporary boost

// random walk generator
function randomWalk(sym, base, drift = 0) {
  if (!stockHistory[sym]) {
    stockHistory[sym] = Array.from({ length: 60 }, () => base + Math.random() * 10 - 5);
  } else {
    let last = stockHistory[sym][stockHistory[sym].length - 1];
    let change = (Math.random() - 0.5) * 3 + drift;

    // add rare events (spikes/crashes)
    if (Math.random() < 0.02) change += (Math.random() - 0.5) * 50;

    // NFTZ decays unless boosted
    if (sym === "NFTZ") {
      if (stockBoosts[sym] && stockBoosts[sym] > 0) {
        change += 5;
        stockBoosts[sym] -= 1;
      }
    }

    const next = Math.max(0.01, last + change);
    stockHistory[sym].push(next);
    if (stockHistory[sym].length > 60) stockHistory[sym].shift();
  }
  return +stockHistory[sym][stockHistory[sym].length - 1].toFixed(2);
}

// draw chart lines
function drawChart(ctx, data) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data), min = Math.min(...data);
  const scaleX = w / (data.length - 1);
  const scaleY = h / (max - min || 1);
  ctx.beginPath();
  ctx.moveTo(0, h - (data[0] - min) * scaleY);
  for (let i = 1; i < data.length; i++) {
    ctx.lineTo(i * scaleX, h - (data[i] - min) * scaleY);
  }
  const rising = data[data.length - 1] > data[0];
  ctx.strokeStyle = rising ? "#00ff77" : "#ff4444";
  ctx.lineWidth = 2;
  ctx.shadowColor = rising ? "#00ff77" : "#ff4444";
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// main render
function renderMarket() {
  const wrapper = document.getElementById("marketTableWrapper");
  let html = `
  <table class="account-info-table">
    <tr><th>Symbol</th><th>Company</th><th>Price</th><th>Chart</th><th>Action</th></tr>
  `;
  for (const s of STOCKS) {
    const price = randomWalk(s.sym, s.base, s.drift);
    html += `
      <tr>
        <td>${s.sym}</td>
        <td>${s.name}</td>
        <td>${formatPrice(price)}</td>
        <td data-stock="${s.sym}"><canvas width="160" height="50"></canvas></td>
        <td>
          <button class="buyBtn" data-sym="${s.sym}">Buy</button>
          <button class="sellBtn" data-sym="${s.sym}">Sell</button>
        </td>
      </tr>`;
  }
  html += "</table>";
  wrapper.innerHTML = html;

  // draw all charts
  document.querySelectorAll("[data-stock] canvas").forEach(c => {
    const sym = c.parentElement.getAttribute("data-stock");
    const ctx = c.getContext("2d");
    drawChart(ctx, stockHistory[sym]);
  });

  // button logic
  wrapper.querySelectorAll(".buyBtn").forEach(btn => {
    btn.onclick = () => {
      const sym = btn.dataset.sym;
      const qty = parseInt(prompt("How many shares to buy?", "1") || 0, 10);
      if (!qty || qty <= 0) return;
      alert(`Bought ${qty} shares of ${sym}`);
      if (sym === "NFTZ") {
        stockBoosts[sym] = (stockBoosts[sym] || 0) + qty * 5;
      }
    };
  });
  wrapper.querySelectorAll(".sellBtn").forEach(btn => {
    btn.onclick = () => {
      const sym = btn.dataset.sym;
      const qty = parseInt(prompt("How many shares to sell?", "1") || 0, 10);
      if (!qty || qty <= 0) return;
      alert(`Sold ${qty} shares of ${sym}`);
    };
  });
}

// smooth auto-update
setInterval(renderMarket, 2000);
document.addEventListener("DOMContentLoaded", renderMarket);
document.addEventListener("DOMContentLoaded", function() {
      updateLemonPointsDisplay();
    });
    fetch('header.html')
      .then(r => r.text())
      .then(html => {
        document.getElementById('lemonania-header').innerHTML = html;
      });