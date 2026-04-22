import { useRef, useState } from 'react';
import { API_BASE } from '../api.js';
import { PlusCircle, IndianRupee, Tag, CalendarDays, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Utilities', 'Other'];

function newKey() { return crypto.randomUUID(); }

function formatAmount(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return raw;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExpenseForm({ onOptimisticAdd, onConfirmed, onFailed }) {
  const [fields, setFields]           = useState({ amount: '', category: '', description: '', date: '' });
  const [displayAmount, setDisplay]   = useState('');
  const [errors,  setErrors]          = useState({});
  const [status,  setStatus]          = useState(null);
  const [loading, setLoading]         = useState(false);
  const idempotencyKey = useRef(newKey());

  function set(name, value) {
    setFields(f => ({ ...f, [name]: value }));
    setErrors(e => ({ ...e, [name]: undefined }));
  }

  // ── Amount field ────────────────────────────────
  function handleAmountChange(e) {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    if (parts[1]?.length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
    setDisplay(val);
    set('amount', val);
  }

  function handleAmountBlur() {
    if (fields.amount && !isNaN(Number(fields.amount)) && Number(fields.amount) > 0) {
      setDisplay(formatAmount(fields.amount));
    }
  }

  function handleAmountFocus() {
    setDisplay(fields.amount); // show raw for editing
  }

  // ── Validation ──────────────────────────────────
  function validate() {
    const e = {};
    const amt = Number(fields.amount);
    if (!fields.amount || isNaN(amt) || amt <= 0) e.amount   = 'Enter a positive amount';
    if (!fields.category)                          e.category = 'Select a category';
    if (!fields.date)                              e.date     = 'Pick a date';
    return e;
  }

  // ── Submit ──────────────────────────────────────
  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const tempId = `temp-${crypto.randomUUID()}`;
    const partial = {
      amount:      Number(fields.amount),
      category:    fields.category,
      description: fields.description,
      date:        fields.date,
      created_at:  new Date().toISOString(),
    };

    // Show optimistic row immediately
    onOptimisticAdd(tempId, partial);

    setLoading(true);
    setStatus(null);

    // Reset form right away so the user can add another expense
    const snapshot = { ...fields };
    const keySnapshot = idempotencyKey.current;
    idempotencyKey.current = newKey();
    setFields({ amount: '', category: '', description: '', date: '' });
    setDisplay('');

    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...snapshot, idempotency_key: keySnapshot }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }
      const created = await res.json();
      onConfirmed(tempId, created);
      setStatus({ type: 'ok', msg: 'Added!' });
      setTimeout(() => setStatus(null), 2500);
    } catch (err) {
      onFailed(tempId);
      // Restore form so user doesn't lose their input
      setFields(snapshot);
      setDisplay(formatAmount(snapshot.amount));
      idempotencyKey.current = keySnapshot;
      setStatus({ type: 'err', msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon icon-indigo"><PlusCircle size={17} /></div>
          Add Expense
        </div>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="amount">Amount (₹)</label>
              <div className="input-wrap">
                <span className="input-icon"><IndianRupee size={15} /></span>
                <input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  onFocus={handleAmountFocus}
                  onBlur={handleAmountBlur}
                  className={errors.amount ? 'has-error' : ''}
                />
              </div>
              {errors.amount && <p className="err-text">{errors.amount}</p>}
            </div>

            <div className="field">
              <label htmlFor="category">Category</label>
              <div className="input-wrap">
                <span className="input-icon"><Tag size={15} /></span>
                <select
                  id="category"
                  value={fields.category}
                  onChange={e => set('category', e.target.value)}
                  className={errors.category ? 'has-error' : ''}
                >
                  <option value="">— select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {errors.category && <p className="err-text">{errors.category}</p>}
            </div>

            <div className="field">
              <label htmlFor="date">Date</label>
              <div className="input-wrap">
                <span className="input-icon"><CalendarDays size={15} /></span>
                <input
                  id="date"
                  type="date"
                  value={fields.date}
                  onChange={e => set('date', e.target.value)}
                  className={errors.date ? 'has-error' : ''}
                />
              </div>
              {errors.date && <p className="err-text">{errors.date}</p>}
            </div>

            <div className="field">
              <label htmlFor="description">Description</label>
              <div className="input-wrap">
                <span className="input-icon"><FileText size={15} /></span>
                <input
                  id="description"
                  type="text"
                  placeholder="Optional note"
                  value={fields.description}
                  onChange={e => set('description', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : <PlusCircle size={16} />}
              {loading ? 'Saving…' : 'Add Expense'}
            </button>
            {status && (
              <span className={`status-msg ${status.type === 'ok' ? 'status-ok' : 'status-err'}`}>
                {status.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {status.msg}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
