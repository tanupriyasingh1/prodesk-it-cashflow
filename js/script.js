const salaryForm = document.getElementById("salaryForm");
const salaryInput = document.getElementById("salaryInput");
const salaryError = document.getElementById("salaryError");

const expenseForm = document.getElementById("expenseForm");
const expenseNameInput = document.getElementById("expenseName");
const expenseAmountInput = document.getElementById("expenseAmount");
const expenseError = document.getElementById("expenseError");

const totalSalaryEl = document.getElementById("totalSalary");
const totalExpensesEl = document.getElementById("totalExpenses");
const remainingBalanceEl = document.getElementById("remainingBalance");
const balanceRow = document.querySelector(".totals-row-balance");

const expenseRowsEl = document.getElementById("expenseRows");
const emptyNote = document.getElementById("emptyNote");

const warningBanner = document.getElementById("warningBanner");
const warningText = document.getElementById("warningText");

const currencySelect = document.getElementById("currencySelect");
const rateNote = document.getElementById("rateNote");
const salarySymbol = document.getElementById("salarySymbol");
const expenseSymbol = document.getElementById("expenseSymbol");

const downloadReportBtn = document.getElementById("downloadReport");

const STORAGE_KEY = "cashflowLedgerState";


let state = {
  salary: 0,
  expenses: [] // { id, name, amount }
};

let currentCurrency = "INR";
let fxRates = { INR: 1 }; // filled in from the API, base = INR
const currencySymbols = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

let pieChart = null;



function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.salary === "number" && Array.isArray(parsed.expenses)) {
      state = parsed;
    }
  } catch (err) {
    // if the saved data is somehow corrupted, just start fresh
    // rather than letting the whole app crash on load
    console.warn("Couldn't read saved ledger data, starting clean.", err);
  }
}



function totalExpenses() {
  return state.expenses.reduce((sum, item) => sum + item.amount, 0);
}

function remainingBalance() {
  return state.salary - totalExpenses();
}

function toDisplayAmount(inrAmount) {
  const rate = fxRates[currentCurrency] || 1;
  return inrAmount * rate;
}

const localeByCurrency = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB"
};

function formatMoney(inrAmount) {
  const converted = toDisplayAmount(inrAmount);
  const symbol = currencySymbols[currentCurrency] || "";
  // clamp -0.00 to 0.00, it happens with float rounding
  const clean = Object.is(converted, -0) ? 0 : converted;
  const locale = localeByCurrency[currentCurrency] || "en-IN";
  return `${symbol}${clean.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function showFieldError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideFieldError(el) {
  el.hidden = true;
  el.textContent = "";
}

let nextLocalId = 1;
function makeId() {
  return Date.now().toString(36) + "-" + nextLocalId++;
}



function renderTotals() {
  totalSalaryEl.textContent = formatMoney(state.salary);
  totalExpensesEl.textContent = formatMoney(totalExpenses());

  const balance = remainingBalance();
  remainingBalanceEl.textContent = formatMoney(balance);

 
  const isLow = state.salary > 0 && balance < state.salary * 0.1;

  balanceRow.classList.toggle("low", isLow);

  if (isLow) {
    warningBanner.hidden = false;
    warningText.textContent = balance < 0
      ? "You've gone over your salary. Balance is negative."
      : "Remaining balance has dropped below 10% of your salary.";
  } else {
    warningBanner.hidden = true;
  }
}

function renderRows(newestId) {
  expenseRowsEl.innerHTML = "";

  if (state.expenses.length === 0) {
    emptyNote.hidden = false;
  } else {
    emptyNote.hidden = true;
  }

  state.expenses.forEach((item, index) => {
    const tr = document.createElement("tr");
    if (item.id === newestId) tr.classList.add("entering");

    const lineTd = document.createElement("td");
    lineTd.className = "row-line";
    lineTd.textContent = String(index + 1).padStart(2, "0");

    const nameTd = document.createElement("td");
    nameTd.textContent = item.name;

    const amountTd = document.createElement("td");
    amountTd.className = "row-amount";
    amountTd.textContent = "-" + formatMoney(item.amount);

    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "row-delete";
    delBtn.setAttribute("aria-label", `Delete ${item.name}`);
    delBtn.innerHTML = "&#10005;"; // small x, reads like a strike-through mark
    delBtn.addEventListener("click", () => deleteExpense(item.id));
    actionTd.appendChild(delBtn);

    tr.append(lineTd, nameTd, amountTd, actionTd);
    expenseRowsEl.appendChild(tr);
  });
}

function renderAll(newestId) {
  renderTotals();
  renderRows(newestId);
  updateChart();
}



function updateChart() {
  const chartCanvas = document.getElementById("balanceChart");

  if (typeof Chart === "undefined") {
   
    if (chartCanvas && !chartCanvas.dataset.fallbackShown) {
      const fallback = document.createElement("p");
      fallback.className = "chart-caption";
      fallback.textContent = "Chart couldn't load — check your connection and refresh.";
      chartCanvas.replaceWith(fallback);
      chartCanvas.dataset.fallbackShown = "true";
    }
    return;
  }

  const expenses = totalExpenses();
  const balance = Math.max(remainingBalance(), 0); 

  const data = [balance, expenses];
  const hasAnyData = state.salary > 0 || expenses > 0;

  if (!pieChart) {
    const ctx = chartCanvas;
    pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Remaining balance", "Total expenses"],
        datasets: [{
          data: hasAnyData ? data : [1, 0],
          backgroundColor: ["#16332B", "#9B2C2C"],
          borderColor: "#F4EFE1",
          borderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { family: "IBM Plex Mono", size: 11 },
              color: "#4B5750",
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatMoney(ctx.raw)}`
            }
          }
        }
      }
    });
  } else {
    pieChart.data.datasets[0].data = hasAnyData ? data : [1, 0];
    pieChart.update();
  }
}



salaryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  hideFieldError(salaryError);

  const raw = salaryInput.value.trim();
  const value = parseFloat(raw);

  if (raw === "" || isNaN(value)) {
    showFieldError(salaryError, "Enter a salary amount before saving.");
    return;
  }

  if (value < 0) {
    showFieldError(salaryError, "Salary can't be negative.");
    return;
  }

  
  const rate = fxRates[currentCurrency] || 1;
  state.salary = value / rate;

  saveState();
  renderAll();
  salaryInput.value = "";
});



expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  hideFieldError(expenseError);

  const name = expenseNameInput.value.trim();
  const rawAmount = expenseAmountInput.value.trim();
  const amount = parseFloat(rawAmount);

  if (name === "" || rawAmount === "" || isNaN(amount)) {
    showFieldError(expenseError, "Fill in both the name and the amount.");
    return;
  }

  if (amount < 0) {
    showFieldError(expenseError, "Expense amount can't be negative.");
    return;
  }

  if (amount === 0) {
    showFieldError(expenseError, "That expense is zero — nothing to log.");
    return;
  }

  const rate = fxRates[currentCurrency] || 1;
  const newExpense = {
    id: makeId(),
    name,
    amount: amount / rate // store in INR
  };

  state.expenses.push(newExpense);
  saveState();
  renderAll(newExpense.id);

  expenseNameInput.value = "";
  expenseAmountInput.value = "";
  expenseNameInput.focus();
});

function deleteExpense(id) {
  state.expenses = state.expenses.filter((item) => item.id !== id);
  saveState();
  renderAll();
}



async function fetchRates() {
  rateNote.textContent = "Fetching live exchange rates…";

  try {
    const response = await fetch(
      "https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP"
    );
    if (!response.ok) throw new Error("Rate lookup failed");

    const data = await response.json();
    fxRates = { INR: 1, ...data.rates };
    rateNote.textContent = `Rates updated ${data.date} (base: INR).`;
  } catch (err) {
    // if the API is unreachable, fall back to INR-only and say so
    console.warn("Currency API unavailable, showing INR only.", err);
    fxRates = { INR: 1 };
    rateNote.textContent = "Live rates unavailable right now — showing INR.";
    currencySelect.value = "INR";
    currentCurrency = "INR";
  }
}

currencySelect.addEventListener("change", () => {
  currentCurrency = currencySelect.value;
  const symbol = currencySymbols[currentCurrency] || "";
  salarySymbol.textContent = symbol;
  expenseSymbol.textContent = symbol;
  renderAll();
});



downloadReportBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const marginX = 18;
  let y = 22;

  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text("Cash-Flow Ledger — Report", marginX, y);

  y += 6;
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);

  y += 12;
  doc.setFontSize(12);
  doc.text(`Total salary:       ${formatMoney(state.salary)}`, marginX, y);
  y += 7;
  doc.text(`Total expenses:     ${formatMoney(totalExpenses())}`, marginX, y);
  y += 7;
  doc.text(`Remaining balance:  ${formatMoney(remainingBalance())}`, marginX, y);

  y += 12;
  doc.setFont("courier", "bold");
  doc.text("Expenses", marginX, y);
  doc.setFont("courier", "normal");
  y += 7;

  if (state.expenses.length === 0) {
    doc.text("No expenses logged.", marginX, y);
  } else {
    state.expenses.forEach((item, index) => {
      if (y > 275) {
        doc.addPage();
        y = 22;
      }
      const line = `${String(index + 1).padStart(2, "0")}.  ${item.name}`;
      doc.text(line, marginX, y);
      doc.text(formatMoney(item.amount), 170, y, { align: "right" });
      y += 7;
    });
  }

  doc.save("cash-flow-report.pdf");
});



async function init() {
  loadState();
  await fetchRates();
  renderAll();

  
  salaryInput.value = "";
}

init();