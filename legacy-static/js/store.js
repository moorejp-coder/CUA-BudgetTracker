// Data layer: categories, transactions, budgets persisted to localStorage.
const Store = (() => {
  const KEY = "budgetTracker.v1";

  const DEFAULT_CATEGORIES = [
    { id: "cat-salary",     name: "Salary",        type: "income",  color: "#1fa971" },
    { id: "cat-freelance",  name: "Freelance",     type: "income",  color: "#2fb8a8" },
    { id: "cat-other-inc",  name: "Other Income",  type: "income",  color: "#6fcf97" },
    { id: "cat-groceries",  name: "Groceries",     type: "expense", color: "#e2554e" },
    { id: "cat-dining",     name: "Dining Out",    type: "expense", color: "#e8863d" },
    { id: "cat-transport",  name: "Transportation",type: "expense", color: "#e0b03d" },
    { id: "cat-housing",    name: "Housing",       type: "expense", color: "#5b8def" },
    { id: "cat-utilities",  name: "Utilities",     type: "expense", color: "#7a6de0" },
    { id: "cat-entertainment", name: "Entertainment", type: "expense", color: "#c15fd0" },
    { id: "cat-health",     name: "Health",        type: "expense", color: "#e05f8f" },
    { id: "cat-shopping",   name: "Shopping",      type: "expense", color: "#4dabf7" },
    { id: "cat-other-exp",  name: "Other",         type: "expense", color: "#9aa1ae" },
  ];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Failed to load budget data", e);
    }
    return { categories: DEFAULT_CATEGORIES, transactions: [], budgets: {} };
  }

  let data = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    // Categories
    getCategories() { return data.categories; },
    getCategory(id) { return data.categories.find(c => c.id === id); },
    addCategory({ name, type, color }) {
      const cat = { id: uid("cat"), name, type, color };
      data.categories.push(cat);
      save();
      return cat;
    },
    deleteCategory(id) {
      data.categories = data.categories.filter(c => c.id !== id);
      data.transactions = data.transactions.filter(t => t.categoryId !== id);
      delete data.budgets[id];
      save();
    },

    // Transactions
    getTransactions() { return data.transactions; },
    addTransaction({ amount, description, categoryId, type, date }) {
      const txn = { id: uid("txn"), amount, description, categoryId, type, date };
      data.transactions.push(txn);
      save();
      return txn;
    },
    updateTransaction(id, updates) {
      const txn = data.transactions.find(t => t.id === id);
      if (txn) Object.assign(txn, updates);
      save();
      return txn;
    },
    deleteTransaction(id) {
      data.transactions = data.transactions.filter(t => t.id !== id);
      save();
    },

    // Budgets: { [categoryId]: monthlyLimit }
    getBudgets() { return data.budgets; },
    setBudget(categoryId, amount) {
      if (amount > 0) data.budgets[categoryId] = amount;
      else delete data.budgets[categoryId];
      save();
    },

    // Import/export
    exportJSON() { return JSON.stringify(data, null, 2); },
    importJSON(json) {
      const parsed = JSON.parse(json);
      if (!parsed.categories || !parsed.transactions) throw new Error("Invalid file");
      if (!parsed.budgets) parsed.budgets = {};
      data = parsed;
      save();
    },
  };
})();
