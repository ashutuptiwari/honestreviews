import { useState, useCallback } from 'react';

export interface DialogState {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

const initialState: DialogState = {
  isOpen: false,
  type: 'alert',
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
};

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>(initialState);

  const alert = useCallback((title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'alert',
        title,
        message,
        confirmText: 'OK',
        onConfirm: () => {
          setDialog(initialState);
          resolve();
        },
      });
    });
  }, []);

  const confirm = useCallback((title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        onConfirm: () => {
          setDialog(initialState);
          resolve(true);
        },
        onCancel: () => {
          setDialog(initialState);
          resolve(false);
        },
      });
    });
  }, []);

  const close = useCallback(() => {
    setDialog(initialState);
  }, []);

  return {
    dialog,
    alert,
    confirm,
    close,
  };
}
