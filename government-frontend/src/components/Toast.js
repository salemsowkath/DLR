import { store } from '../store.js';

export function renderToasts() {
  const { toasts } = store;
  if (!toasts || toasts.length === 0) return '';

  return `
    <div class="toast-container">
      ${toasts
        .map(
          (t) => `
        <div class="toast toast-${t.type}">
          <span>${t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
          <div>${t.message}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}
