import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} bg-[#121624] border border-[#C5A059]/40 rounded-xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(197,160,89,0.2)] transform transition-all duration-200 animate-in zoom-in-95`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262F4A] bg-[#161B2E]">
          <h3 className="text-lg font-bold font-display text-slate-100 flex items-center gap-2.5">
            <span className="w-1.5 h-4 bg-[#C5A059] rounded-full shadow-sm" />
            <span>{title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus-visible:outline-none cursor-pointer border border-transparent hover:border-slate-700"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-200">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#262F4A] bg-[#0E121E]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

