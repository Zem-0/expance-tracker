import { PieChart } from 'lucide-react';

function fmt(amount) {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CategorySummary({ expenses }) {
  if (!expenses.length) return null;

  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className="card-title-icon icon-violet">
            <PieChart size={17} />
          </div>
          Spending by Category
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {sorted.length} {sorted.length === 1 ? 'category' : 'categories'}
        </span>
      </div>
      <div className="card-body">
        <div className="summary-grid">
          {sorted.map(([cat, amount]) => {
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div className="summary-row" key={cat}>
                <div className="summary-badge-wrap">
                  <span className={`badge badge-${cat}`}>{cat}</span>
                </div>
                <div className="bar-track">
                  <div
                    className={`bar-fill bar-${cat}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="summary-pct">{pct.toFixed(0)}%</div>
                <div className="summary-amount">{fmt(amount)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
