import { useCallback, useState } from "react";

const buildConfig = (config) => ({
  title: config?.title || "Confirmar",
  message: config?.message || "",
  confirmLabel: config?.confirmLabel || "Confirmar",
  cancelLabel: config?.cancelLabel || "Cancelar",
  intent: config?.intent || "danger",
  onConfirm: config?.onConfirm,
});

export const useConfirmDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const openConfirm = useCallback((config) => {
    setConfirmDialog(buildConfig(config));
  }, []);

  const closeConfirm = useCallback(() => {
    if (confirmLoading) return;
    setConfirmDialog(null);
  }, [confirmLoading]);

  const resetConfirm = useCallback(() => {
    setConfirmDialog(null);
    setConfirmLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog?.onConfirm) {
      setConfirmDialog(null);
      return;
    }
    setConfirmLoading(true);
    try {
      await confirmDialog.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  return {
    confirmDialog,
    confirmLoading,
    openConfirm,
    closeConfirm,
    handleConfirm,
    resetConfirm,
  };
};
