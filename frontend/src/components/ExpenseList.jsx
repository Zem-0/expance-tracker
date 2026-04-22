import { ListChecks, SlidersHorizontal, ArrowDownUp, Receipt, Trash2 } from 'lucide-react';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Utilities', 'Other'];

function fmt(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExpenseList({ expenses, filteredTotal, loading, category, sort, onCategoryChange, onSortChange, onDeleteClick }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon icon-green"><ListChecks size={17} /></div>
          Expenses
          {!loading && (
            <span className="entry-count">
              {expenses.filter(e => !e._pending).length} {expenses.filter(e => !e._pending).length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
      </div>

      <div className="controls-bar">
        <div className="control-group">
          <label htmlFor="filter-cat" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <SlidersHorizontal size={11} /> Filter
          </label>
          <div className="input-wrap">
            <span className="input-icon"><SlidersHorizontal size={14} /></span>
            <select id="filter-cat" value={category} onChange={e => onCategoryChange(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="control-group">
          <label htmlFor="sort-sel" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowDownUp size={11} /> Sort
          </label>
          <div className="input-wrap">
            <span className="input-icon"><ArrowDownUp size={14} /></span>
            <select id="sort-sel" value={sort} onChange={e => onSortChange(e.target.value)}>
              <option value="">Recently added</option>
              <option value="date_desc">Date (newest first)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="table-wrap">
          <table><tbody>
            <tr className="loading-row"><td colSpan={5}>Loading expenses…</td></tr>
          </tbody></table>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <Receipt size={40} />
          <p>No expenses found{category ? ` in "${category}"` : ''}.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className={e._pending ? 'row-pending' : ''}>
                    <td className="date-cell">{fmtDate(e.date)}</td>
                    <td className="cat-cell">
                      <span className={`badge badge-${e.category}`}>{e.category}</span>
                    </td>
                    <td className="desc-cell">
                      {e.description || <span style={{ color: 'var(--text-light)' }}>—</span>}
                    </td>
                    <td className="amount-cell">{fmt(e.amount)}</td>
                    <td className="action-cell">
                      {!e._pending && (
                        <button
                          className="btn-delete"
                          onClick={() => onDeleteClick(e)}
                          aria-label="Delete expense"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {e._pending && <span className="saving-dot" title="Saving…" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="total-bar">
            <span className="total-label">{category ? `${category} total` : 'Total'}</span>
            <span className="total-value">{fmt(filteredTotal)}</span>
          </div>
        </>
      )}
    </div>
  );
}
