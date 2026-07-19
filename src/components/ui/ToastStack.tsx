import { useGolf } from '../../context/GolfContext';
import { CloseIcon } from '../layout/Icons';

export function ToastStack() {
  const { toasts, dismissToast } = useGolf();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <strong>{t.title}</strong>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
          >
            <CloseIcon />
          </button>
          <p>{t.message}</p>
        </div>
      ))}
    </div>
  );
}
