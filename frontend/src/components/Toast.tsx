// 🍞 src/components/Toast.tsx - Modern Toast Component with Icons and Progress
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '../context/ToastContext';
import styles from './Toast.module.css';

interface ToastProps {
  toast: ToastType;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const decrement = (100 / toast.duration!) * 50; // Update every 50ms
          const newProgress = prev - decrement;
          return newProgress > 0 ? newProgress : 0;
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [toast.duration]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.type]}`}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      layout
    >
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>{getIcon()}</div>
        <div className={styles.toastMessage}>{toast.message}</div>
        {toast.dismissible && (
          <button
            className={styles.toastClose}
            onClick={onClose}
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {toast.duration && toast.duration > 0 && (
        <div className={styles.toastProgressBar}>
          <motion.div
            className={styles.toastProgress}
            style={{ width: `${progress}%` }}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function ToastContainer({ toasts, onRemove }: {
  toasts: ToastType[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className={styles.toastContainer}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
