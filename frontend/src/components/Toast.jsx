import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

const DURATION = 3000;

export default function Toast({ message, onUndo, onDismiss }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100);
      setProgress(pct);
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="toast">
      <span className="toast-msg">{message}</span>
      <button className="toast-undo" onClick={onUndo}>
        <RotateCcw size={13} /> Undo
      </button>
      <button className="toast-close" onClick={onDismiss}>
        <X size={13} />
      </button>
      <div className="toast-bar" style={{ width: `${progress}%` }} />
    </div>
  );
}
