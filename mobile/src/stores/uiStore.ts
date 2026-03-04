import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  toasts: Toast[];
  modals: Record<string, boolean>;

  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  modals: {},

  showToast: (toast) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 3000);
  },

  hideToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  openModal: (key) => {
    set((state) => ({ modals: { ...state.modals, [key]: true } }));
  },

  closeModal: (key) => {
    set((state) => ({ modals: { ...state.modals, [key]: false } }));
  },
}));
