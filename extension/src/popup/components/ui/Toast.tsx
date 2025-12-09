import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <Check size={16} className="text-green-600" />,
  error: <X size={16} className="text-red-600" />,
  info: <AlertCircle size={16} className="text-blue-600" />,
};

const bgMap: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-md border shadow-lg transition-all duration-200 ${
        bgMap[type]
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      role="status"
      aria-live="polite"
    >
      {iconMap[type]}
      <span className="text-sm text-black font-medium">{message}</span>
    </div>
  );
};
