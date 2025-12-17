import React from 'react';
import type { DialogState } from '@/hooks/useDialog';

interface DialogProps {
  dialog: DialogState;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Dialog: React.FC<DialogProps> = ({ dialog, onConfirm, onCancel }) => {
  if (!dialog.isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-light-surface dark:bg-dark-surface rounded-lg shadow-lg max-w-sm w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-light-border dark:border-dark-border">
            <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
              {dialog.title}
            </h2>
          </div>

          {/* Message */}
          <div className="px-6 py-4">
            <p className="text-light-text-secondary dark:text-dark-text-secondary whitespace-pre-wrap">
              {dialog.message}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-light-border dark:border-dark-border flex gap-3 justify-end">
            {dialog.type === 'confirm' && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-md border border-light-border dark:border-dark-border text-light-text dark:text-dark-text hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
              >
                {dialog.cancelText || 'Cancel'}
              </button>
            )}

            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                dialog.type === 'alert'
                  ? 'bg-light-primary dark:bg-dark-primary text-white hover:opacity-90'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {dialog.confirmText || 'OK'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
