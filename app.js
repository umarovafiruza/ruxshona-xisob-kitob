/**
 * ============================================================================
 * Xarajatlar Hisoblagichi (Expense Tracker) - Vanilla JavaScript
 * Neo-brutalism UI & Full State Management
 * ============================================================================
 */

// Standart birlamchi kategoriyalar
const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Oziq-ovqat', icon: '🍔', color: '#F59E0B' },
  { id: 'transport', name: 'Transport', icon: '🚕', color: '#3B82F6' },
  { id: 'home', name: 'Uy/Kommunal', icon: '🏠', color: '#10B981' },
  { id: 'entertainment', name: 'Ko‘ngilochar', icon: '🎮', color: '#8B5CF6' },
  { id: 'health', name: 'Sog‘liq', icon: '💊', color: '#EF4444' },
  { id: 'education', name: 'Ta\'lim', icon: '📚', color: '#06B6D4' },
  { id: 'other', name: 'Boshqa', icon: '📦', color: '#6B7280' }
];

// Dastur holati (State)
const state = {
  expenses: [],
  categories: [],
  monthlyBudget: 3500000, // Standart oylik byudjet: 3 500 000 UZS
  filters: {
    search: '',
    category: 'all',
    period: 'month'
  },
  chart: null
};

// Oylarning o'zbekcha nomlari
const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
];

/* ============================================================================
   1. YORDAMCHI FUNKSIYALAR VA FORMATLASH
   ============================================================================ */

/**
 * Raqamni probellar bilan so'm formatiga keltiradi (masalan: 1 250 000 UZS)
 */
function formatMoney(amount) {
  const num = Number(amount) || 0;
  return num.toLocaleString('uz-UZ') + ' UZS';
}

/**
 * Sanani chiroyli o'zbekcha ko'rinishga keltiradi (masalan: 28-Sentabr, 2026)
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const year = parts[0];
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${day}-${MONTH_NAMES[month] || ''}, ${year}`;
}

/**
 * Bugungi sanani YYYY-MM-DD ko'rinishida qaytaradi
 */
function getTodayString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Sananing bugungi kunga to'g'ri kelishini tekshiradi
 */
function isToday(dateString) {
  return dateString === getTodayString();
}

/**
 * Sananing joriy haftaga to'g'ri kelishini tekshiradi
 */
function isThisWeek(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  // Haftaning boshlanish sanasi (Dushanba)
  const day = now.getDay() || 7; // Yakshanbani 7 deb olamiz
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return d >= monday && d <= sunday;
}

/**
 * Sananing joriy oyga to'g'ri kelishini tekshiradi
 */
function isThisMonth(dateString) {
  if (!dateString) return false;
  const parts = dateString.split('-');
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  return parts[0] === currentYear && parts[1] === currentMonth;
}

/**
 * ID orqali kategoriya obyektini topadi
 */
function getCategoryById(catId) {
  return state.categories.find(c => c.id === catId) || {
    id: 'unknown',
    name: 'Boshqa',
    icon: '📦',
    color: '#6B7280'
  };
}

/**
 * Toast bildirishnomasini ko'rsatish
 */
let toastTimeout = null;
function showToast(message, type = 'success') {
  const toastEl = document.getElementById('toastNotification');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  if (!toastEl || !msgEl || !iconEl) return;

  msgEl.textContent = message;

  if (type === 'success') {
    iconEl.textContent = '✓';
    iconEl.style.backgroundColor = '#34D399';
  } else if (type === 'warning') {
    iconEl.textContent = '!';
    iconEl.style.backgroundColor = '#FBBF24';
  } else if (type === 'error') {
    iconEl.textContent = '✕';
    iconEl.style.backgroundColor = '#FB7185';
  } else {
    iconEl.textContent = 'ℹ';
    iconEl.style.backgroundColor = '#FFE600';
  }

  // Ko'rsatish
  toastEl.classList.remove('opacity-0', '-translate-y-24', 'pointer-events-none');
  toastEl.classList.add('opacity-100', 'translate-y-0');

  if (toastTimeout) clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toastEl.classList.add('opacity-0', '-translate-y-24', 'pointer-events-none');
    toastEl.classList.remove('opacity-100', 'translate-y-0');
  }, 3000);
}

/* ============================================================================
   2. LOCAL STORAGE BILAN ISHLASH
   ============================================================================ */

function loadStateFromStorage() {
  try {
    // 1. Kategoriyalarni yuklash
    const savedCategories = localStorage.getItem('expense_categories');
    if (savedCategories) {
      state.categories = JSON.parse(savedCategories);
    } else {
      state.categories = [...DEFAULT_CATEGORIES];
      localStorage.setItem('expense_categories', JSON.stringify(state.categories));
    }

    // 2. Xarajatlarni yuklash
    const savedExpenses = localStorage.getItem('expense_records');
    if (savedExpenses) {
      state.expenses = JSON.parse(savedExpenses);
    } else {
      state.expenses = [];
    }

    // 3. Oylik byudjetni yuklash
    const savedBudget = localStorage.getItem('expense_monthly_budget');
    if (savedBudget !== null) {
      state.monthlyBudget = Number(savedBudget);
    } else {
      state.monthlyBudget = 3500000;
      localStorage.setItem('expense_monthly_budget', String(state.monthlyBudget));
    }
  } catch (error) {
    console.error('LocalStorage dan yuklashda xatolik:', error);
    state.categories = [...DEFAULT_CATEGORIES];
    state.expenses = [];
    state.monthlyBudget = 3500000;
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem('expense_records', JSON.stringify(state.expenses));
    localStorage.setItem('expense_categories', JSON.stringify(state.categories));
    localStorage.setItem('expense_monthly_budget', String(state.monthlyBudget));
  } catch (error) {
    console.error('LocalStorage ga saqlashda xatolik:', error);
  }
}

/* ============================================================================
   3. UI RENDER QILISH (DASHBOARD, RO'YXAT, DIAGRAMMA)
   ============================================================================ */

/**
 * Kategoriyalar dropdown ro'yxatlarini yangilash
 */
function renderCategorySelects() {
  const expenseCatSelect = document.getElementById('expenseCategory');
  const filterCatSelect = document.getElementById('filterCategory');
  const editCatSelect = document.getElementById('editExpenseCategory');

  if (expenseCatSelect) {
    const currentVal = expenseCatSelect.value;
    expenseCatSelect.innerHTML = state.categories
      .map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`)
      .join('');
    if (currentVal && state.categories.some(c => c.id === currentVal)) {
      expenseCatSelect.value = currentVal;
    }
  }

  if (filterCatSelect) {
    const currentFilter = state.filters.category;
    filterCatSelect.innerHTML = `
      <option value="all">Barcha kategoriyalar</option>
      ${state.categories.map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`).join('')}
    `;
    filterCatSelect.value = currentFilter;
  }

  if (editCatSelect) {
    editCatSelect.innerHTML = state.categories
      .map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`)
      .join('');
  }

  const categoryCountDisplay = document.getElementById('categoryCountDisplay');
  if (categoryCountDisplay) {
    categoryCountDisplay.textContent = `${state.categories.length} ta`;
  }
}

/**
 * Yuqori statistika va Byudjet progress barini yangilash
 */
function renderDashboard() {
  const totalExpenseDisplay = document.getElementById('totalExpenseDisplay');
  const transactionCountDisplay = document.getElementById('transactionCountDisplay');
  const budgetSpentDisplay = document.getElementById('budgetSpentDisplay');
  const budgetLimitDisplay = document.getElementById('budgetLimitDisplay');
  const budgetRemainingDisplay = document.getElementById('budgetRemainingDisplay');
  const budgetProgressBar = document.getElementById('budgetProgressBar');
  const budgetPercentText = document.getElementById('budgetPercentText');
  const budgetAlertBanner = document.getElementById('budgetAlertBanner');
  const budgetAlertIcon = document.getElementById('budgetAlertIcon');
  const budgetAlertText = document.getElementById('budgetAlertText');

  const todayExpenseDisplay = document.getElementById('todayExpenseDisplay');
  const weekExpenseDisplay = document.getElementById('weekExpenseDisplay');
  const monthExpenseDisplay = document.getElementById('monthExpenseDisplay');
  const budgetMonthLabel = document.getElementById('budgetMonthLabel');

  // Umumiy jami xarajat
  const totalAmount = state.expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  if (totalExpenseDisplay) totalExpenseDisplay.textContent = formatMoney(totalAmount);
  if (transactionCountDisplay) transactionCountDisplay.textContent = `${state.expenses.length} ta`;

  // Bugungi, bu haftalik va shu oylik
  let todayTotal = 0;
  let weekTotal = 0;
  let monthTotal = 0;

  state.expenses.forEach(item => {
    const amt = Number(item.amount) || 0;
    if (isToday(item.date)) todayTotal += amt;
    if (isThisWeek(item.date)) weekTotal += amt;
    if (isThisMonth(item.date)) monthTotal += amt;
  });

  if (todayExpenseDisplay) todayExpenseDisplay.textContent = formatMoney(todayTotal);
  if (weekExpenseDisplay) weekExpenseDisplay.textContent = formatMoney(weekTotal);
  if (monthExpenseDisplay) monthExpenseDisplay.textContent = formatMoney(monthTotal);

  // Joriy oy nomi ko'rsatish
  const currentMonthIndex = new Date().getMonth();
  if (budgetMonthLabel) {
    budgetMonthLabel.textContent = `${MONTH_NAMES[currentMonthIndex]} oyi uchun`;
  }

  // Oylik Byudjet hisoblash
  const budget = state.monthlyBudget || 0;
  if (budgetLimitDisplay) budgetLimitDisplay.textContent = formatMoney(budget);
  if (budgetSpentDisplay) budgetSpentDisplay.textContent = formatMoney(monthTotal);

  const remaining = budget - monthTotal;
  const remainingWrapper = document.getElementById('budgetRemainingWrapper');

  if (remaining >= 0) {
    if (budgetRemainingDisplay) {
      budgetRemainingDisplay.textContent = formatMoney(remaining);
      budgetRemainingDisplay.className = 'text-sm sm:text-base font-black text-emerald-700';
    }
  } else {
    if (budgetRemainingDisplay) {
      budgetRemainingDisplay.textContent = `-${formatMoney(Math.abs(remaining))}`;
      budgetRemainingDisplay.className = 'text-sm sm:text-base font-black text-red-600';
    }
  }

  // Progress bar va ogohlantirishlar
  let percent = 0;
  if (budget > 0) {
    percent = Math.round((monthTotal / budget) * 100);
  }

  const cappedWidth = Math.min(percent, 100);

  if (budgetProgressBar) {
    budgetProgressBar.style.width = `${cappedWidth}%`;

    // Ranglar va ogohlantirishlar logikasi (Talab bo'yicha: 80% sariq, 100% qizil)
    if (percent < 80) {
      budgetProgressBar.style.backgroundColor = '#10B981'; // Yashil
      if (budgetAlertBanner) budgetAlertBanner.classList.add('hidden');
    } else if (percent >= 80 && percent <= 100) {
      budgetProgressBar.style.backgroundColor = '#F59E0B'; // Sariq
      if (budgetAlertBanner) {
        budgetAlertBanner.classList.remove('hidden');
        budgetAlertBanner.className = 'mt-2 p-2 border-2 border-black rounded text-xs font-black flex items-center gap-2 bg-[#FEF3C7] text-amber-900';
        budgetAlertIcon.className = 'fa-solid fa-triangle-exclamation text-amber-700';
        budgetAlertText.textContent = `Ogohlantirish! Oylik byudjetning ${percent}% qismi sarflandi. Tejamkorlikka e'tibor bering.`;
      }
    } else {
      budgetProgressBar.style.backgroundColor = '#EF4444'; // Qizil
      if (budgetAlertBanner) {
        budgetAlertBanner.classList.remove('hidden');
        budgetAlertBanner.className = 'mt-2 p-2 border-2 border-black rounded text-xs font-black flex items-center gap-2 bg-[#FEE2E2] text-red-900';
        budgetAlertIcon.className = 'fa-solid fa-circle-exclamation text-red-700 text-sm animate-pulse';
        budgetAlertText.textContent = `DIQQAT! Oylik byudjet ${percent}% ga yetdi (${formatMoney(Math.abs(remaining))} ortiqcha sarflandi)!`;
      }
    }
  }

  if (budgetPercentText) {
    budgetPercentText.textContent = `${percent}%`;
  }
}

/**
 * Filtrlangan xarajatlar ro'yxatini hisoblash
 */
function getFilteredExpenses() {
  return state.expenses.filter(item => {
    // 1. Qidiruv filtri (nomi yoki izohi)
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase().trim();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const cat = getCategoryById(item.category);
      const matchCat = cat.name.toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }

    // 2. Kategoriya filtri
    if (state.filters.category !== 'all') {
      if (item.category !== state.filters.category) return false;
    }

    // 3. Davr filtri
    if (state.filters.period === 'today') {
      return isToday(item.date);
    } else if (state.filters.period === 'week') {
      return isThisWeek(item.date);
    } else if (state.filters.period === 'month') {
      return isThisMonth(item.date);
    }

    return true; // 'all'
  });
}

/**
 * Xarajatlar ro'yxatini render qilish
 */
function renderExpenseList() {
  const listContainer = document.getElementById('expenseList');
  const emptyState = document.getElementById('emptyListState');
  const filteredCountBadge = document.getElementById('filteredCountBadge');
  const filteredTotalDisplay = document.getElementById('filteredTotalDisplay');

  if (!listContainer) return;

  const filtered = getFilteredExpenses();

  // Sana bo'yicha tartiblash (eng yangi sanalar yuqorida)
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt);

  if (filteredCountBadge) {
    filteredCountBadge.textContent = `${filtered.length} ta xarajat`;
  }

  const filteredTotal = filtered.reduce((acc, curr) => acc + Number(curr.amount), 0);
  if (filteredTotalDisplay) {
    filteredTotalDisplay.textContent = formatMoney(filteredTotal);
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  listContainer.innerHTML = filtered.map(item => {
    const cat = getCategoryById(item.category);
    return `
      <div class="expense-item neo-box-sm p-3.5 bg-white flex items-center justify-between gap-3 group" data-id="${item.id}">
        <!-- Chap taraf: Kategoriya ikonka va nomi/sanasi -->
        <div class="flex items-center gap-3 min-w-0">
          <div 
            class="w-10 h-10 rounded-md border-2 border-black flex items-center justify-center text-lg flex-shrink-0 shadow-[2px_2px_0px_#000]"
            style="background-color: ${cat.color};"
          >
            ${cat.icon}
          </div>
          <div class="min-w-0">
            <h4 class="text-sm font-black text-black truncate tracking-tight" title="${escapeHtml(item.title)}">
              ${escapeHtml(item.title)}
            </h4>
            <div class="flex items-center gap-2 text-[11px] font-bold text-gray-500 mt-0.5">
              <span class="inline-block px-1.5 py-0.2 rounded border border-black/40 text-[10px] text-black" style="background-color: ${cat.color}25;">
                ${cat.name}
              </span>
              <span>•</span>
              <span class="text-gray-600">${formatDate(item.date)}</span>
            </div>
          </div>
        </div>

        <!-- O'ng taraf: Summa va Amallar (Edit, Delete) -->
        <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span class="text-sm sm:text-base font-black text-red-600 tracking-tight whitespace-nowrap">
            -${formatMoney(item.amount)}
          </span>

          <div class="flex items-center gap-1">
            <button 
              class="btn-edit-item w-8 h-8 rounded border-2 border-black bg-yellow-300 hover:bg-yellow-400 flex items-center justify-center text-xs font-bold transition-transform active:scale-95 shadow-[1px_1px_0px_#000]"
              data-id="${item.id}"
              title="Tahrirlash"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
            <button 
              class="btn-delete-item w-8 h-8 rounded border-2 border-black bg-rose-300 hover:bg-rose-400 flex items-center justify-center text-xs font-bold transition-transform active:scale-95 shadow-[1px_1px_0px_#000]"
              data-id="${item.id}"
              title="O'chirish"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * XSS xavfsizligi uchun HTML qochirish
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Interaktiv Chart.js diagrammasini chizish
 */
function renderChart() {
  const canvas = document.getElementById('categoryChart');
  const emptyState = document.getElementById('chartEmptyState');
  const breakdownList = document.getElementById('categoryBreakdownList');
  const chartContainer = document.getElementById('chartContainer');

  if (!canvas) return;

  // Joriy filtr bo'yicha yoki umumiy xarajatlar taqsimotini hisoblash
  // Foydalanuvchiga qulay bo'lishi uchun xarajatlar tahlili oylik yoki barcha bo'yicha guruhlanadi
  const expensesToAnalyze = state.expenses;

  if (expensesToAnalyze.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (chartContainer) chartContainer.classList.add('hidden');
    if (breakdownList) breakdownList.innerHTML = '';
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (chartContainer) chartContainer.classList.remove('hidden');

  // Kategoriyalar bo'yicha jamlash
  const categoryTotals = {};
  let overallTotal = 0;

  expensesToAnalyze.forEach(item => {
    const amt = Number(item.amount) || 0;
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + amt;
    overallTotal += amt;
  });

  const labels = [];
  const data = [];
  const backgroundColors = [];
  const breakdownData = [];

  Object.entries(categoryTotals).forEach(([catId, sum]) => {
    if (sum > 0) {
      const cat = getCategoryById(catId);
      labels.push(`${cat.icon} ${cat.name}`);
      data.push(sum);
      backgroundColors.push(cat.color);
      const percentage = overallTotal > 0 ? ((sum / overallTotal) * 100).toFixed(1) : 0;
      breakdownData.push({
        cat,
        sum,
        percentage
      });
    }
  });

  // Eng ko'p xarajat qilinganini tepaga chiqarish
  breakdownData.sort((a, b) => b.sum - a.sum);

  // Breakdown ro'yxatini render qilish
  if (breakdownList) {
    breakdownList.innerHTML = breakdownData.map(item => `
      <div class="flex items-center justify-between text-xs font-bold p-1.5 hover:bg-gray-50 rounded border border-transparent hover:border-black/20 transition-colors">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full border border-black flex-shrink-0" style="background-color: ${item.cat.color};"></span>
          <span class="text-black">${item.cat.icon} ${item.cat.name}</span>
        </div>
        <div class="text-right">
          <span class="text-black font-black">${formatMoney(item.sum)}</span>
          <span class="text-gray-500 text-[11px] ml-1">(${item.percentage}%)</span>
        </div>
      </div>
    `).join('');
  }

  // Diagrammani qayta chizish yoki yangilash
  if (state.chart) {
    state.chart.data.labels = labels;
    state.chart.data.datasets[0].data = data;
    state.chart.data.datasets[0].backgroundColor = backgroundColors;
    state.chart.update();
  } else {
    const ctx = canvas.getContext('2d');
    state.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 2.5,
          borderColor: '#000000',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false // Pastdagi chiroyli neo-brutalism breakdown ro'yxati orqali ko'rsatiladi
          },
          tooltip: {
            backgroundColor: '#000000',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            bodyFont: {
              weight: 'bold'
            },
            padding: 10,
            cornerRadius: 4,
            callbacks: {
              label: function(context) {
                const value = context.raw || 0;
                const pct = overallTotal > 0 ? ((value / overallTotal) * 100).toFixed(1) : 0;
                return ` ${formatMoney(value)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '62%'
      }
    });
  }
}

/**
 * Dashboarddagi eng so'nggi xarajatlar qisqa ro'yxatini render qilish
 */
function renderRecentMiniList() {
  const container = document.getElementById('recentExpenseMiniList');
  if (!container) return;

  if (state.expenses.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-xs font-bold text-gray-500">
        Hozircha xarajatlar kiritilmagan.
      </div>
    `;
    return;
  }

  const recent = [...state.expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.createdAt - a.createdAt)
    .slice(0, 4);

  container.innerHTML = recent.map(item => {
    const cat = getCategoryById(item.category);
    return `
      <div class="flex items-center justify-between p-2 rounded border border-black/20 hover:border-black transition-all bg-gray-50 text-xs">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-7 h-7 rounded border border-black flex items-center justify-center text-xs flex-shrink-0" style="background-color: ${cat.color};">
            ${cat.icon}
          </span>
          <div class="min-w-0">
            <p class="font-black text-black truncate">${escapeHtml(item.title)}</p>
            <p class="text-[10px] text-gray-500">${formatDate(item.date)}</p>
          </div>
        </div>
        <span class="font-black text-red-600 whitespace-nowrap ml-2">
          -${formatMoney(item.amount)}
        </span>
      </div>
    `;
  }).join('');
}

/**
 * Limit va Byudjet sahifasini (tabBudget) to'liq yangilash
 */
function renderBudgetPage() {
  const pageLimitDisplay = document.getElementById('pageBudgetLimitDisplay');
  const pageSpentDisplay = document.getElementById('pageBudgetSpentDisplay');
  const pageRemainingDisplay = document.getElementById('pageBudgetRemainingDisplay');
  const pageProgressBar = document.getElementById('pageBudgetProgressBar');
  const pagePercentText = document.getElementById('pageBudgetPercentText');
  const pageAlertBanner = document.getElementById('pageBudgetAlertBanner');
  const pageAlertIcon = document.getElementById('pageBudgetAlertIcon');
  const pageAlertText = document.getElementById('pageBudgetAlertText');
  const pageDailyBudgetDisplay = document.getElementById('pageDailyBudgetDisplay');
  const pageDaysRemainingText = document.getElementById('pageDaysRemainingText');
  const pageMonthBadge = document.getElementById('pageBudgetMonthBadge');
  const pageMonthlyBudgetInput = document.getElementById('pageMonthlyBudgetInput');
  const pageBudgetFormatPreview = document.getElementById('pageBudgetFormatPreview');

  // Joriy oy xarajatlari
  let monthTotal = 0;
  state.expenses.forEach(item => {
    if (isThisMonth(item.date)) {
      monthTotal += Number(item.amount) || 0;
    }
  });

  const budget = state.monthlyBudget || 0;
  const remaining = budget - monthTotal;

  if (pageLimitDisplay) pageLimitDisplay.textContent = formatMoney(budget);
  if (pageSpentDisplay) pageSpentDisplay.textContent = formatMoney(monthTotal);

  if (pageRemainingDisplay) {
    if (remaining >= 0) {
      pageRemainingDisplay.textContent = formatMoney(remaining);
      pageRemainingDisplay.className = 'text-xs sm:text-sm font-black text-emerald-700';
    } else {
      pageRemainingDisplay.textContent = `-${formatMoney(Math.abs(remaining))}`;
      pageRemainingDisplay.className = 'text-xs sm:text-sm font-black text-red-600';
    }
  }

  // Progress bar va foiz
  let percent = 0;
  if (budget > 0) {
    percent = Math.round((monthTotal / budget) * 100);
  }
  const cappedWidth = Math.min(percent, 100);

  if (pageProgressBar) {
    pageProgressBar.style.width = `${cappedWidth}%`;
    if (percent < 80) {
      pageProgressBar.style.backgroundColor = '#10B981';
      if (pageAlertBanner) {
        pageAlertBanner.className = 'p-3 border-2 border-black rounded text-xs font-black flex items-center gap-2 bg-emerald-100 text-emerald-900 shadow-[2px_2px_0px_#000]';
        if (pageAlertIcon) pageAlertIcon.className = 'fa-solid fa-circle-check text-emerald-700 text-base';
        if (pageAlertText) pageAlertText.textContent = 'Byudjet xavfsiz holatda! Rejadan chiqilmadi.';
      }
    } else if (percent >= 80 && percent <= 100) {
      pageProgressBar.style.backgroundColor = '#F59E0B';
      if (pageAlertBanner) {
        pageAlertBanner.className = 'p-3 border-2 border-black rounded text-xs font-black flex items-center gap-2 bg-amber-100 text-amber-900 shadow-[2px_2px_0px_#000]';
        if (pageAlertIcon) pageAlertIcon.className = 'fa-solid fa-triangle-exclamation text-amber-700 text-base';
        if (pageAlertText) pageAlertText.textContent = `Ogohlantirish! Oylik limitning ${percent}% qismi sarflandi.`;
      }
    } else {
      pageProgressBar.style.backgroundColor = '#EF4444';
      if (pageAlertBanner) {
        pageAlertBanner.className = 'p-3 border-2 border-black rounded text-xs font-black flex items-center gap-2 bg-red-100 text-red-900 shadow-[2px_2px_0px_#000]';
        if (pageAlertIcon) pageAlertIcon.className = 'fa-solid fa-circle-exclamation text-red-700 text-base animate-pulse';
        if (pageAlertText) pageAlertText.textContent = `DIQQAT! Limit ${percent}% ga yetdi (${formatMoney(Math.abs(remaining))} ortiqcha sarflandi)!`;
      }
    }
  }

  if (pagePercentText) {
    pagePercentText.textContent = `${percent}%`;
  }

  // Aqlli kunlik sarf hisoblash
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(daysInMonth - currentDay + 1, 1);

  if (pageMonthBadge) {
    pageMonthBadge.textContent = `${MONTH_NAMES[month]}, ${daysInMonth} kun`;
  }

  const dailyBudget = remaining > 0 ? Math.round(remaining / daysRemaining) : 0;
  if (pageDailyBudgetDisplay) {
    pageDailyBudgetDisplay.textContent = `${formatMoney(dailyBudget)} / kun`;
  }
  if (pageDaysRemainingText) {
    pageDaysRemainingText.textContent = `Oy yakunigacha: ${daysRemaining} kun qoldi`;
  }

  // Inputga qiymat yuklash
  if (pageMonthlyBudgetInput && !pageMonthlyBudgetInput.value) {
    pageMonthlyBudgetInput.value = state.monthlyBudget;
  }
  if (pageBudgetFormatPreview && state.monthlyBudget > 0) {
    pageBudgetFormatPreview.textContent = `Hozirgi limit: ${state.monthlyBudget.toLocaleString('uz-UZ')} UZS`;
  }
}

/**
 * Barcha UI qismlarini bittalab to'liq yangilash
 */
function updateAllViews() {
  renderCategorySelects();
  renderDashboard();
  renderExpenseList();
  renderRecentMiniList();
  renderBudgetPage();
  renderChart();
}

/* ============================================================================
   4. MODAL OYNALAR LOGIKASI
   ============================================================================ */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

/* ============================================================================
   5. CSV EKSPORT (EXCEL BILAN TO'LIQ MOS, UTF-8 BOM BILAN)
   ============================================================================ */

function exportExpensesToCSV() {
  if (state.expenses.length === 0) {
    showToast('Eksport qilish uchun xarajatlar mavjud emas!', 'warning');
    return;
  }

  // UTF-8 BOM (Byte Order Mark) Excel dasturi o'zbek harflarini buzmasdan to'g'ri ko'rsatishi uchun
  let csvContent = '\uFEFF';
  
  // CSV Sarlavhalari
  csvContent += 'T/r,Nomi / Izohi,Kategoriya,Sana,Summa (UZS)\r\n';

  // Saralangan xarajatlar
  const sorted = [...state.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach((item, index) => {
    const cat = getCategoryById(item.category);
    // CSV da probellar va qo'shtirnoqlardan qochish
    const titleEscaped = `"${(item.title || '').replace(/"/g, '""')}"`;
    const catEscaped = `"${cat.icon} ${cat.name}"`;
    const dateFormatted = item.date;
    const amountVal = item.amount;

    csvContent += `${index + 1},${titleEscaped},${catEscaped},${dateFormatted},${amountVal}\r\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = getTodayString();
  link.setAttribute('download', `xarajatlar_hisoboti_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Xarajatlar hisoboti CSV formatida yuklab olindi!', 'success');
}

/* ============================================================================
   6. DEMO MA'LUMOTLARNI YUKLASH
   ============================================================================ */

function loadDemoData() {
  const today = getTodayString();
  const d = new Date();
  
  const formatDateOffset = (daysAgo) => {
    const target = new Date(d);
    target.setDate(target.getDate() - daysAgo);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const demoExpenses = [
    {
      id: 'demo-1',
      title: 'Haftalik oziq-ovqat xaridlari (Korzinka)',
      amount: 450000,
      category: 'food',
      date: today,
      createdAt: Date.now() - 10000
    },
    {
      id: 'demo-2',
      title: 'Taksi xarajatlari (Yandex Go)',
      amount: 35000,
      category: 'transport',
      date: today,
      createdAt: Date.now() - 20000
    },
    {
      id: 'demo-3',
      title: 'Kommunal to\'lovlar (Gaz va elektr)',
      amount: 280000,
      category: 'home',
      date: formatDateOffset(2),
      createdAt: Date.now() - 30000
    },
    {
      id: 'demo-4',
      title: 'Kino va do\'stlar bilan dam olish',
      amount: 140000,
      category: 'entertainment',
      date: formatDateOffset(4),
      createdAt: Date.now() - 40000
    },
    {
      id: 'demo-5',
      title: 'Dorixona (Vitaminlar va dori)',
      amount: 115000,
      category: 'health',
      date: formatDateOffset(7),
      createdAt: Date.now() - 50000
    },
    {
      id: 'demo-6',
      title: 'Dasturlash bo\'yicha yangi kitoblar',
      amount: 195000,
      category: 'education',
      date: formatDateOffset(12),
      createdAt: Date.now() - 60000
    },
    {
      id: 'demo-7',
      title: 'Tushlik qahvaxonada',
      amount: 65000,
      category: 'food',
      date: formatDateOffset(1),
      createdAt: Date.now() - 70000
    }
  ];

  state.expenses = demoExpenses;
  state.monthlyBudget = 3000000;
  saveStateToStorage();
  updateAllViews();
  showToast('Namunaviy (Demo) ma\'lumotlar muvaffaqiyatli yuklandi!', 'success');
}

/* ============================================================================
   7. HODISALARNI BIRIKTIRISH (EVENT LISTENERS)
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Ma'lumotlarni xotiradan yuklash
  loadStateFromStorage();

  // Birlamchi sana maydoniga bugungi sanani qo'yish
  const expenseDateInput = document.getElementById('expenseDate');
  if (expenseDateInput) {
    expenseDateInput.value = getTodayString();
  }

  // 2. Summa kiritilganda jonli chiroyli format ko'rsatish
  const expenseAmountInput = document.getElementById('expenseAmount');
  const formattedPreview = document.getElementById('formattedAmountPreview');
  if (expenseAmountInput && formattedPreview) {
    expenseAmountInput.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (val > 0) {
        formattedPreview.textContent = `Ko'rinishi: ${val.toLocaleString('uz-UZ')} UZS`;
      } else {
        formattedPreview.textContent = '';
      }
    });
  }

  // 3. Xarajat qo'shish formasi
  const expenseForm = document.getElementById('expenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const amountVal = parseFloat(document.getElementById('expenseAmount').value);
      const categoryVal = document.getElementById('expenseCategory').value;
      const dateVal = document.getElementById('expenseDate').value;
      const titleVal = document.getElementById('expenseTitle').value.trim();

      if (!amountVal || amountVal <= 0) {
        showToast('Iltimos, to\'g\'ri summa kiriting!', 'warning');
        return;
      }
      if (!titleVal) {
        showToast('Iltimos, xarajat nomini kiriting!', 'warning');
        return;
      }

      const newExpense = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        amount: amountVal,
        category: categoryVal,
        date: dateVal || getTodayString(),
        title: titleVal,
        createdAt: Date.now()
      };

      state.expenses.unshift(newExpense);
      saveStateToStorage();
      updateAllViews();

      // Formani tozalash
      expenseForm.reset();
      if (expenseDateInput) expenseDateInput.value = getTodayString();
      if (formattedPreview) formattedPreview.textContent = '';

      showToast('Yangi xarajat qo\'shildi!', 'success');

      // Asosiy tabga qaytish
      switchTab('tabDashboard');
    });
  }

  // 4. Qidiruv va Filtr hodisalari
  const searchInput = document.getElementById('searchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const filterCategory = document.getElementById('filterCategory');
  const filterPeriod = document.getElementById('filterPeriod');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.filters.search = e.target.value;
      if (btnClearSearch) {
        if (e.target.value.length > 0) {
          btnClearSearch.classList.remove('hidden');
        } else {
          btnClearSearch.classList.add('hidden');
        }
      }
      renderExpenseList();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.filters.search = '';
      btnClearSearch.classList.add('hidden');
      renderExpenseList();
    });
  }

  if (filterCategory) {
    filterCategory.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      renderExpenseList();
    });
  }

  if (filterPeriod) {
    filterPeriod.addEventListener('change', (e) => {
      state.filters.period = e.target.value;
      renderExpenseList();
    });
  }

  // 5. Ro'yxatdagi Edit va Delete tugmalarini bosish (Event delegation)
  const expenseList = document.getElementById('expenseList');
  if (expenseList) {
    expenseList.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.btn-delete-item');
      const editBtn = e.target.closest('.btn-edit-item');

      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const itemToDelete = state.expenses.find(item => item.id === id);
        if (itemToDelete) {
          const deleteTargetId = document.getElementById('deleteTargetId');
          const deleteTargetType = document.getElementById('deleteTargetType');
          const deleteModalTitle = document.getElementById('deleteModalTitle');
          const deleteModalMessage = document.getElementById('deleteModalMessage');

          if (deleteTargetId) deleteTargetId.value = id;
          if (deleteTargetType) deleteTargetType.value = 'single';
          if (deleteModalTitle) deleteModalTitle.textContent = "Xarajatni o'chirish";
          if (deleteModalMessage) {
            deleteModalMessage.innerHTML = `Haqiqatan ham "<strong class="text-black">${escapeHtml(itemToDelete.title)}</strong>" (${formatMoney(itemToDelete.amount)}) xarajatini o'chirmoqchimisiz?`;
          }
          openModal('deleteConfirmModal');
        }
      } else if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        const itemToEdit = state.expenses.find(item => item.id === id);
        if (itemToEdit) {
          document.getElementById('editExpenseId').value = itemToEdit.id;
          document.getElementById('editExpenseAmount').value = itemToEdit.amount;
          document.getElementById('editExpenseCategory').value = itemToEdit.category;
          document.getElementById('editExpenseDate').value = itemToEdit.date;
          document.getElementById('editExpenseTitle').value = itemToEdit.title;
          openModal('editExpenseModal');
        }
      }
    });
  }

  // 6. Xarajatni tahrirlash formasi submit
  const editExpenseForm = document.getElementById('editExpenseForm');
  if (editExpenseForm) {
    editExpenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('editExpenseId').value;
      const amountVal = parseFloat(document.getElementById('editExpenseAmount').value);
      const categoryVal = document.getElementById('editExpenseCategory').value;
      const dateVal = document.getElementById('editExpenseDate').value;
      const titleVal = document.getElementById('editExpenseTitle').value.trim();

      const itemIndex = state.expenses.findIndex(item => item.id === id);
      if (itemIndex > -1) {
        state.expenses[itemIndex] = {
          ...state.expenses[itemIndex],
          amount: amountVal,
          category: categoryVal,
          date: dateVal,
          title: titleVal
        };
        saveStateToStorage();
        updateAllViews();
        closeModal('editExpenseModal');
        showToast('Xarajat muvaffaqiyatli yangilandi!', 'success');
      }
    });
  }

  // Edit modalini yopish
  const btnCloseEditModal = document.getElementById('btnCloseEditModal');
  const btnCancelEditModal = document.getElementById('btnCancelEditModal');
  if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', () => closeModal('editExpenseModal'));
  if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', () => closeModal('editExpenseModal'));

  // 7. Yangi kategoriya qo'shish modal logikasi
  const btnOpenAddCat = document.getElementById('btnOpenAddCategoryModal');
  const btnCloseCategoryModal = document.getElementById('btnCloseCategoryModal');
  const btnCancelCategoryModal = document.getElementById('btnCancelCategoryModal');
  const categoryForm = document.getElementById('categoryForm');
  const newCategoryIcon = document.getElementById('newCategoryIcon');
  const newCategoryColor = document.getElementById('newCategoryColor');
  const colorPreviewBox = document.getElementById('colorPreviewBox');

  if (btnOpenAddCat) {
    btnOpenAddCat.addEventListener('click', () => {
      categoryForm.reset();
      newCategoryIcon.value = '☕';
      newCategoryColor.value = '#FFE600';
      if (colorPreviewBox) colorPreviewBox.style.backgroundColor = '#FFE600';
      openModal('categoryModal');
    });
  }
  if (btnCloseCategoryModal) btnCloseCategoryModal.addEventListener('click', () => closeModal('categoryModal'));
  if (btnCancelCategoryModal) btnCancelCategoryModal.addEventListener('click', () => closeModal('categoryModal'));

  // Kategoriya modalida emoji tanlash
  document.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.getAttribute('data-emoji');
      if (newCategoryIcon) newCategoryIcon.value = emoji;
    });
  });

  // Kategoriya modalida rang tanlash
  document.querySelectorAll('.color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (newCategoryColor) newCategoryColor.value = color;
      if (colorPreviewBox) colorPreviewBox.style.backgroundColor = color;
    });
  });

  // Kategoriya formasi submit
  if (categoryForm) {
    categoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newCategoryName').value.trim();
      const icon = newCategoryIcon.value || '✨';
      const color = newCategoryColor.value || '#FFE600';

      if (!name) {
        showToast('Iltimos, kategoriya nomini kiriting!', 'warning');
        return;
      }

      // Kategoriya ID generatsiya
      const newId = 'cat_' + Date.now();
      const newCategory = { id: newId, name, icon, color, isCustom: true };

      state.categories.push(newCategory);
      saveStateToStorage();
      renderCategorySelects();
      
      // Yangi qo'shilgan kategoriyani asosiy dropdown da tanlab qo'yish
      const expenseCategory = document.getElementById('expenseCategory');
      if (expenseCategory) expenseCategory.value = newId;

      closeModal('categoryModal');
      showToast(`"${name}" kategoriyasi muvaffaqiyatli qo'shildi!`, 'success');
    });
  }

  // 8. Oylik Byudjet modal logikasi
  const btnSetBudgetModal = document.getElementById('btnSetBudgetModal');
  const btnQuickEditBudget = document.getElementById('btnQuickEditBudget');
  // Limit sahifasidagi forma va presetlar
  const pageBudgetForm = document.getElementById('pageBudgetForm');
  const pageMonthlyBudgetInput = document.getElementById('pageMonthlyBudgetInput');
  const pageBudgetFormatPreview = document.getElementById('pageBudgetFormatPreview');

  if (pageMonthlyBudgetInput && pageBudgetFormatPreview) {
    pageMonthlyBudgetInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        pageBudgetFormatPreview.textContent = `Ko'rinishi: ${val.toLocaleString('uz-UZ')} UZS`;
      } else {
        pageBudgetFormatPreview.textContent = '';
      }
    });
  }

  // Tezkor preset tugmalari
  document.querySelectorAll('.btn-budget-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const amt = btn.getAttribute('data-amount');
      if (pageMonthlyBudgetInput) {
        pageMonthlyBudgetInput.value = amt;
        if (pageBudgetFormatPreview) {
          pageBudgetFormatPreview.textContent = `Ko'rinishi: ${Number(amt).toLocaleString('uz-UZ')} UZS`;
        }
      }
    });
  });

  if (pageBudgetForm) {
    pageBudgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newBudget = parseFloat(pageMonthlyBudgetInput.value);
      if (isNaN(newBudget) || newBudget < 0) {
        showToast('Iltimos, to\'g\'ri byudjet miqdorini kiriting!', 'warning');
        return;
      }

      state.monthlyBudget = newBudget;
      saveStateToStorage();
      updateAllViews();
      showToast('Oylik byudjet limiti muvaffaqiyatli saqlandi!', 'success');
    });
  }

  // Yuqori va Dashboarddagi Limit tugmalarini Limit sahifasiga yo'naltirish
  if (btnSetBudgetModal) {
    btnSetBudgetModal.addEventListener('click', () => switchTab('tabBudget'));
  }
  if (btnQuickEditBudget) {
    btnQuickEditBudget.addEventListener('click', () => switchTab('tabBudget'));
  }

  // 9. Yuqori navigatsiya tugmalari (CSV, Demo, Clear)
  const btnExportCSV = document.getElementById('btnExportCSV');
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', exportExpensesToCSV);
  }

  const btnLoadDemo = document.getElementById('btnLoadDemo');
  if (btnLoadDemo) {
    btnLoadDemo.addEventListener('click', () => {
      if (state.expenses.length > 0) {
        if (confirm('Namunaviy ma\'lumotlar yuklansa, mavjud xarajatlar demo bilan almashtiriladi. Davom etasizmi?')) {
          loadDemoData();
        }
      } else {
        loadDemoData();
      }
    });
  }

  const btnClearAll = document.getElementById('btnClearAll');
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
      if (state.expenses.length === 0) {
        showToast('Tozalash uchun hech qanday xarajat yo\'q.', 'info');
        return;
      }
      const deleteTargetId = document.getElementById('deleteTargetId');
      const deleteTargetType = document.getElementById('deleteTargetType');
      const deleteModalTitle = document.getElementById('deleteModalTitle');
      const deleteModalMessage = document.getElementById('deleteModalMessage');

      if (deleteTargetId) deleteTargetId.value = '';
      if (deleteTargetType) deleteTargetType.value = 'all';
      if (deleteModalTitle) deleteModalTitle.textContent = 'Barcha xarajatlarni tozalash';
      if (deleteModalMessage) {
        deleteModalMessage.innerHTML = 'Haqiqatan ham <strong class="text-red-600">barcha xarajatlar tarixini</strong> tozalab tashlamoqchimisiz? Ushbu amalni qaytarib bo\'lmaydi.';
      }
      openModal('deleteConfirmModal');
    });
  }

  // O'chirish modalidagi tugmalar hodisasi
  const btnConfirmDeleteAction = document.getElementById('btnConfirmDeleteAction');
  const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
  const btnCancelDeleteModal = document.getElementById('btnCancelDeleteModal');

  if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', () => closeModal('deleteConfirmModal'));
  if (btnCancelDeleteModal) btnCancelDeleteModal.addEventListener('click', () => closeModal('deleteConfirmModal'));

  if (btnConfirmDeleteAction) {
    btnConfirmDeleteAction.addEventListener('click', () => {
      const targetType = document.getElementById('deleteTargetType').value;
      const targetId = document.getElementById('deleteTargetId').value;

      if (targetType === 'single' && targetId) {
        state.expenses = state.expenses.filter(item => item.id !== targetId);
        saveStateToStorage();
        updateAllViews();
        closeModal('deleteConfirmModal');
        showToast('Xarajat o\'chirildi!', 'error');
      } else if (targetType === 'all') {
        state.expenses = [];
        saveStateToStorage();
        updateAllViews();
        closeModal('deleteConfirmModal');
        showToast('Barcha xarajatlar tozalandi.', 'error');
      }
    });
  }

  // ==========================================================================
  // 10. Mobil Tab Navigatsiya Logikasi (Bottom Navbar)
  // ==========================================================================
  function switchTab(tabId) {
    // Barcha tablarni yashirish
    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.add('hidden');
    });

    // Tanlangan tabni ochish
    const target = document.getElementById(tabId);
    if (target) {
      target.classList.remove('hidden');
    }

    // Pastki navbar tugmalarida active klassini yangilash
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Agar Tahlil tabiga o'tilsa, Chart.js ni qayta chizish
    if (tabId === 'tabAnalytics') {
      renderChart();
    }

    // Agar Limit tabiga o'tilsa, Limit sahifasini to'liq yangilash
    if (tabId === 'tabBudget') {
      renderBudgetPage();
      const budgetInput = document.getElementById('pageMonthlyBudgetInput');
      if (budgetInput) {
        budgetInput.value = state.monthlyBudget;
        const preview = document.getElementById('pageBudgetFormatPreview');
        if (preview && state.monthlyBudget > 0) {
          preview.textContent = `Hozirgi limit: ${state.monthlyBudget.toLocaleString('uz-UZ')} UZS`;
        }
        setTimeout(() => budgetInput.focus(), 150);
      }
    }

    // Agar Qo'shish tabiga o'tilsa, summa inputiga avtomatik fokus
    if (tabId === 'tabAdd') {
      const amountInput = document.getElementById('expenseAmount');
      if (amountInput) {
        setTimeout(() => amountInput.focus(), 150);
      }
    }

    // Yuqoriga silliq aylantirish
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Pastki navigatsiya tugmalari bosilishi
  document.querySelectorAll('.nav-tab-btn[data-tab], .nav-fab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = btn.getAttribute('data-tab');
      if (tabId) switchTab(tabId);
    });
  });

  // Dashboarddagi "Barchasi ➔" tugmasi
  const btnViewAllHistory = document.getElementById('btnViewAllHistoryFromDashboard');
  if (btnViewAllHistory) {
    btnViewAllHistory.addEventListener('click', () => switchTab('tabHistory'));
  }

  // Modallarni tashqi fonga bosganda yopish
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      e.target.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // ESC tugmasi bosilganda modallarni yopish
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['categoryModal', 'editExpenseModal', 'deleteConfirmModal'].forEach(closeModal);
    }
  });

  // Boshlang'ich UI render
  updateAllViews();
});
