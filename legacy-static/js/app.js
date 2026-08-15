(() => {
  const state = {
    view: "dashboard",
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    editingTxnId: null,
    txnType: "expense",
    filters: { search: "", categoryId: "", type: "" },
  };

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const fmtMoney = n => "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtMonth = d => d.toLocaleString(undefined, { month: "long", year: "numeric" });
  const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const isInMonth = (dateStr, monthDate) => dateStr.slice(0, 7) === monthKey(monthDate);

  // ---------- Navigation ----------
  function switchView(view) {
    state.view = view;
    $$(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    $$(".view").forEach(el => el.classList.toggle("active", el.id === "view-" + view));
    renderAll();
  }

  $$(".nav-item").forEach(el => el.addEventListener("click", () => switchView(el.dataset.view)));

  $("#prevMonth").addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
    renderAll();
  });
  $("#nextMonth").addEventListener("click", () => {
    state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
    renderAll();
  });

  // ---------- Category helpers ----------
  function categoryOptions(select, type) {
    select.innerHTML = "";
    Store.getCategories()
      .filter(c => !type || c.type === type)
      .forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
  }

  function populateFilterCategory() {
    const select = $("#filterCategory");
    const current = select.value;
    select.innerHTML = '<option value="">All Categories</option>';
    Store.getCategories().forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
    select.value = current;
  }

  // ---------- Transaction Modal ----------
  const txnModal = $("#txnModal");
  const txnForm = $("#txnForm");

  function openTxnModal(txn) {
    state.editingTxnId = txn ? txn.id : null;
    $("#txnModalTitle").textContent = txn ? "Edit Transaction" : "Add Transaction";
    state.txnType = txn ? txn.type : "expense";
    setTypeToggle(state.txnType);
    categoryOptions($("#txnCategory"), state.txnType);

    $("#txnAmount").value = txn ? txn.amount : "";
    $("#txnDesc").value = txn ? txn.description : "";
    $("#txnDate").value = txn ? txn.date : new Date().toISOString().slice(0, 10);
    if (txn) $("#txnCategory").value = txn.categoryId;

    txnModal.hidden = false;
    $("#txnAmount").focus();
  }

  function closeTxnModal() {
    txnModal.hidden = true;
    txnForm.reset();
    state.editingTxnId = null;
  }

  function setTypeToggle(type) {
    state.txnType = type;
    $$(".toggle-btn").forEach(b => b.classList.toggle("active", b.dataset.type === type));
    categoryOptions($("#txnCategory"), type);
  }

  $$(".toggle-btn").forEach(btn => btn.addEventListener("click", () => setTypeToggle(btn.dataset.type)));

  $("#addTxnBtn").addEventListener("click", () => openTxnModal(null));
  $("#txnCancelBtn").addEventListener("click", closeTxnModal);
  txnModal.addEventListener("click", e => { if (e.target === txnModal) closeTxnModal(); });

  txnForm.addEventListener("submit", e => {
    e.preventDefault();
    const payload = {
      amount: parseFloat($("#txnAmount").value),
      description: $("#txnDesc").value.trim(),
      categoryId: $("#txnCategory").value,
      type: state.txnType,
      date: $("#txnDate").value,
    };
    if (!payload.amount || !payload.description || !payload.categoryId || !payload.date) return;

    if (state.editingTxnId) {
      Store.updateTransaction(state.editingTxnId, payload);
    } else {
      Store.addTransaction(payload);
    }
    closeTxnModal();
    renderAll();
  });

  // ---------- Category Modal ----------
  const categoryModal = $("#categoryModal");
  const categoryForm = $("#categoryForm");

  $("#addCategoryBtn").addEventListener("click", () => { categoryModal.hidden = false; });
  $("#categoryCancelBtn").addEventListener("click", () => { categoryModal.hidden = true; categoryForm.reset(); });
  categoryModal.addEventListener("click", e => { if (e.target === categoryModal) { categoryModal.hidden = true; categoryForm.reset(); } });

  categoryForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#categoryName").value.trim();
    const type = $("#categoryType").value;
    const color = $("#categoryColor").value;
    if (!name) return;
    Store.addCategory({ name, type, color });
    categoryModal.hidden = true;
    categoryForm.reset();
    renderAll();
  });

  // ---------- Filters ----------
  $("#searchInput").addEventListener("input", e => { state.filters.search = e.target.value.toLowerCase(); renderTransactionsView(); });
  $("#filterCategory").addEventListener("change", e => { state.filters.categoryId = e.target.value; renderTransactionsView(); });
  $("#filterType").addEventListener("change", e => { state.filters.type = e.target.value; renderTransactionsView(); });

  // ---------- Export / Import ----------
  $("#exportBtn").addEventListener("click", () => {
    const blob = new Blob([Store.exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#importFile").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        Store.importJSON(reader.result);
        renderAll();
      } catch (err) {
        alert("Could not import file: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ---------- Rendering ----------
  function txnRowMarkup(txn, categoriesById) {
    const cat = categoriesById[txn.categoryId];
    const color = cat ? cat.color : "#9aa1ae";
    const catName = cat ? cat.name : "Uncategorized";
    return { color, catName };
  }

  function renderDashboard() {
    const categories = Store.getCategories();
    const categoriesById = Object.fromEntries(categories.map(c => [c.id, c]));
    const monthTxns = Store.getTransactions().filter(t => isInMonth(t.date, state.currentMonth));

    const income = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    $("#sumIncome").textContent = fmtMoney(income);
    $("#sumExpense").textContent = fmtMoney(expense);
    const net = income - expense;
    const netEl = $("#sumNet");
    netEl.textContent = (net < 0 ? "-" : "") + fmtMoney(net);
    netEl.style.color = net < 0 ? "var(--expense)" : "var(--income)";

    // Category donut (expenses)
    const byCat = {};
    monthTxns.filter(t => t.type === "expense").forEach(t => {
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
    });
    const slices = Object.entries(byCat)
      .map(([catId, value]) => ({ catId, value, color: (categoriesById[catId] || {}).color || "#9aa1ae", name: (categoriesById[catId] || {}).name || "Other" }))
      .sort((a, b) => b.value - a.value);

    Charts.drawDonut($("#categoryChart"), slices);

    const legend = $("#categoryLegend");
    legend.innerHTML = "";
    slices.forEach(s => {
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = `<span class="legend-swatch" style="background:${s.color}"></span>${s.name} — ${fmtMoney(s.value)}`;
      legend.appendChild(item);
    });

    // Trend chart: last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      months.push(new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - i, 1));
    }
    const labels = months.map(d => d.toLocaleString(undefined, { month: "short" }));
    const incomeSeries = months.map(d => Store.getTransactions().filter(t => t.type === "income" && isInMonth(t.date, d)).reduce((s, t) => s + t.amount, 0));
    const expenseSeries = months.map(d => Store.getTransactions().filter(t => t.type === "expense" && isInMonth(t.date, d)).reduce((s, t) => s + t.amount, 0));
    Charts.drawGroupedBars($("#trendChart"), labels, incomeSeries, expenseSeries, "#1fa971", "#e2554e");

    // Recent transactions
    const recent = [...monthTxns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    const recentEl = $("#recentTxns");
    recentEl.innerHTML = "";
    if (recent.length === 0) {
      recentEl.innerHTML = '<div class="empty-state">No transactions this month yet.</div>';
    }
    recent.forEach(txn => {
      const { color, catName } = txnRowMarkup(txn, categoriesById);
      const row = document.createElement("div");
      row.className = "txn-row";
      row.innerHTML = `
        <div class="txn-main">
          <span class="cat-dot" style="background:${color}"></span>
          <div>
            <div class="txn-desc">${escapeHTML(txn.description)}</div>
            <div class="txn-meta">${catName} · ${txn.date}</div>
          </div>
        </div>
        <div class="txn-amount ${txn.type}">${txn.type === "income" ? "+" : "-"}${fmtMoney(txn.amount)}</div>
      `;
      recentEl.appendChild(row);
    });
  }

  function renderTransactionsView() {
    const categories = Store.getCategories();
    const categoriesById = Object.fromEntries(categories.map(c => [c.id, c]));
    let txns = Store.getTransactions().filter(t => isInMonth(t.date, state.currentMonth));

    if (state.filters.search) {
      txns = txns.filter(t => t.description.toLowerCase().includes(state.filters.search));
    }
    if (state.filters.categoryId) {
      txns = txns.filter(t => t.categoryId === state.filters.categoryId);
    }
    if (state.filters.type) {
      txns = txns.filter(t => t.type === state.filters.type);
    }
    txns = [...txns].sort((a, b) => b.date.localeCompare(a.date));

    const tbody = $("#txnTableBody");
    tbody.innerHTML = "";
    $("#txnEmptyState").hidden = txns.length !== 0;

    txns.forEach(txn => {
      const cat = categoriesById[txn.categoryId];
      const color = cat ? cat.color : "#9aa1ae";
      const catName = cat ? cat.name : "Uncategorized";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${txn.date}</td>
        <td>${escapeHTML(txn.description)}</td>
        <td><span class="badge" style="color:${color}"><span class="cat-dot" style="background:${color}"></span>${catName}</span></td>
        <td>${txn.type === "income" ? "Income" : "Expense"}</td>
        <td class="right txn-amount ${txn.type}">${txn.type === "income" ? "+" : "-"}${fmtMoney(txn.amount)}</td>
        <td>
          <div class="row-actions">
            <button data-action="edit" data-id="${txn.id}">Edit</button>
            <button data-action="delete" data-id="${txn.id}">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const txn = Store.getTransactions().find(t => t.id === btn.dataset.id);
        if (txn) openTxnModal(txn);
      });
    });
    tbody.querySelectorAll('button[data-action="delete"]').forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this transaction?")) {
          Store.deleteTransaction(btn.dataset.id);
          renderAll();
        }
      });
    });
  }

  function renderCategoriesView() {
    const grid = $("#categoryGrid");
    grid.innerHTML = "";
    Store.getCategories().forEach(cat => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.innerHTML = `
        <div class="category-card-info">
          <span class="category-swatch" style="background:${cat.color}"></span>
          <div>
            <div class="category-name">${escapeHTML(cat.name)}</div>
            <div class="category-type">${cat.type === "income" ? "Income" : "Expense"}</div>
          </div>
        </div>
        <button class="category-delete" title="Delete category" data-id="${cat.id}">&times;</button>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".category-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Delete this category? Transactions in it will also be removed.")) {
          Store.deleteCategory(btn.dataset.id);
          renderAll();
        }
      });
    });
  }

  function renderBudgetsView() {
    const list = $("#budgetList");
    list.innerHTML = "";
    const budgets = Store.getBudgets();
    const monthTxns = Store.getTransactions().filter(t => t.type === "expense" && isInMonth(t.date, state.currentMonth));

    Store.getCategories().filter(c => c.type === "expense").forEach(cat => {
      const spent = monthTxns.filter(t => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
      const limit = budgets[cat.id] || 0;
      const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
      const over = limit > 0 && spent > limit;

      const row = document.createElement("div");
      row.className = "budget-row";
      row.innerHTML = `
        <div class="budget-row-top">
          <span class="cat-name"><span class="cat-dot" style="background:${cat.color}"></span>${escapeHTML(cat.name)}</span>
          <span>
            <input type="number" class="budget-input" min="0" step="1" placeholder="No limit" value="${limit || ""}" data-id="${cat.id}">
          </span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%; background:${over ? "var(--expense)" : cat.color}"></div></div>
        <div class="budget-sub">${fmtMoney(spent)} spent${limit ? " of " + fmtMoney(limit) : ""}${over ? " — over budget" : ""}</div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll(".budget-input").forEach(input => {
      input.addEventListener("change", () => {
        Store.setBudget(input.dataset.id, parseFloat(input.value) || 0);
        renderBudgetsView();
      });
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderAll() {
    $("#currentMonthLabel").textContent = fmtMonth(state.currentMonth);
    populateFilterCategory();
    if (state.view === "dashboard") renderDashboard();
    if (state.view === "transactions") renderTransactionsView();
    if (state.view === "categories") renderCategoriesView();
    if (state.view === "budgets") renderBudgetsView();
  }

  window.addEventListener("resize", () => { if (state.view === "dashboard") renderDashboard(); });

  renderAll();
})();
