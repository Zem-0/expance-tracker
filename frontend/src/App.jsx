import { useCallback, useEffect, useRef, useState } from 'react';
import { Wallet } from 'lucide-react';
import { API_BASE } from './api.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import CategorySummary from './components/CategorySummary.jsx';
import Toast from './components/Toast.jsx';

function fmt(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function App() {
  const [expenses,    setExpenses]    = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(null);
  const [category,    setCategory]    = useState('');
  const [sort,        setSort]        = useState('date_desc');
  const [toast,       setToast]       = useState(null); // { message, expense }

  const abortRef      = useRef(null);
  const deleteTimerRef = useRef(null);
  const deletingRef   = useRef(null); // expense being held for undo

  // ── Fetch ───────────────────────────────────────
  const fetchExpenses = useCallback(async (opts = {}) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      const cat = 'category' in opts ? opts.category : category;
      const srt = 'sort'     in opts ? opts.sort     : sort;
      if (cat) params.set('category', cat);
      if (srt) params.set('sort', srt);

      const [filtered, all] = await Promise.all([
        fetch(`${API_BASE}/expenses?${params}`, { signal: ctrl.signal }).then(r => {
          if (!r.ok) throw new Error(`Server error ${r.status}`);
          return r.json();
        }),
        fetch(`${API_BASE}/expenses`, { signal: ctrl.signal }).then(r => r.json()),
      ]);
      setExpenses(filtered);
      setAllExpenses(all);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setFetchError(err.message);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Optimistic add ──────────────────────────────
  function handleOptimisticAdd(tempId, partialExpense) {
    const pending = { ...partialExpense, id: tempId, _pending: true };
    setExpenses(prev => [pending, ...prev]);
    setAllExpenses(prev => [pending, ...prev]);
  }

  function handleAddConfirmed(tempId, serverExpense) {
    const replace = prev => prev.map(e => e.id === tempId ? serverExpense : e);
    setExpenses(replace);
    setAllExpenses(replace);
  }

  function handleAddFailed(tempId) {
    const remove = prev => prev.filter(e => e.id !== tempId);
    setExpenses(remove);
    setAllExpenses(remove);
  }

  // ── Delete with undo ────────────────────────────
  function commitPendingDelete() {
    if (!deletingRef.current) return;
    const id = deletingRef.current.id;
    fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' }).catch(() => {
      // If the delete API fails, quietly restore
      restoreDeleted();
    });
    deletingRef.current = null;
  }

  function restoreDeleted() {
    if (!deletingRef.current) return;
    const restored = deletingRef.current;
    setExpenses(prev => [restored, ...prev.filter(e => e.id !== restored.id)]);
    setAllExpenses(prev => [restored, ...prev.filter(e => e.id !== restored.id)]);
  }

  function handleDeleteClick(expense) {
    // Commit any already-pending delete before starting a new one
    if (deletingRef.current) {
      clearTimeout(deleteTimerRef.current);
      commitPendingDelete();
    }

    // Optimistically remove from UI
    setExpenses(prev => prev.filter(e => e.id !== expense.id));
    setAllExpenses(prev => prev.filter(e => e.id !== expense.id));

    deletingRef.current = expense;
    setToast({ message: `Deleted ₹${expense.amount.toLocaleString('en-IN')} · ${expense.category}` });

    deleteTimerRef.current = setTimeout(() => {
      commitPendingDelete();
      setToast(null);
    }, 3000);
  }

  function handleUndo() {
    clearTimeout(deleteTimerRef.current);
    restoreDeleted();
    deletingRef.current = null;
    setToast(null);
  }

  function handleDismissToast() {
    clearTimeout(deleteTimerRef.current);
    commitPendingDelete();
    setToast(null);
  }

  // ── Filter / sort ───────────────────────────────
  function handleCategoryChange(v) {
    setCategory(v);
    fetchExpenses({ category: v });
  }
  function handleSortChange(v) {
    setSort(v);
    fetchExpenses({ sort: v });
  }

  const grandTotal    = allExpenses.filter(e => !e._pending).reduce((s, e) => s + Number(e.amount), 0);
  const filteredTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <div className="header-icon"><Wallet size={22} color="#fff" /></div>
            <div>
              <div className="header-title">Expense Tracker</div>
              <div className="header-sub">Track every rupee, every day</div>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <div className="stat-pill-label">Total Entries</div>
              <div className="stat-pill-value">{allExpenses.filter(e => !e._pending).length}</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-label">Total Spent</div>
              <div className="stat-pill-value">{fmt(grandTotal)}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <ExpenseForm
          onOptimisticAdd={handleOptimisticAdd}
          onConfirmed={handleAddConfirmed}
          onFailed={handleAddFailed}
        />

        {fetchError && (
          <div className="fetch-error">
            Could not load expenses: {fetchError}
          </div>
        )}

        <ExpenseList
          expenses={expenses}
          filteredTotal={filteredTotal}
          loading={loading}
          category={category}
          sort={sort}
          onCategoryChange={handleCategoryChange}
          onSortChange={handleSortChange}
          onDeleteClick={handleDeleteClick}
        />

        <CategorySummary expenses={allExpenses.filter(e => !e._pending)} />
      </main>

      {toast && (
        <Toast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}
    </div>
  );
}
