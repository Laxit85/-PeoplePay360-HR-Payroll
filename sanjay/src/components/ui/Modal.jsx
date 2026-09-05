import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidth} glass-modal rounded-[var(--radius-md)] overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-300 scale-100 scroll-reveal`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-strong/60 bg-surface/40 backdrop-blur-md">
          <h3 className="text-lg font-bold font-display text-ink-900 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-primary-600 rounded-pill shadow-gold" />
            <span>{title}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-sm text-ink-400 hover:text-ink-900 hover:bg-surface-muted transition-colors focus-visible:outline-none cursor-pointer border border-transparent hover:border-border"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-strong/60 bg-surface-sunken/60 backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
