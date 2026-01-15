import { useEffect, useId } from "react";

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  intent = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    intent === "danger" ? "btn btn--danger" : intent === "primary" ? "btn btn--primary" : "btn btn--ghost";

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
        <h3 className="modal__title" id={titleId}>
          {title}
        </h3>
        <p className="modal__message" id={messageId}>
          {message}
        </p>
        <div className="modal__actions">
          <button className="btn btn--ghost" type="button" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={confirmClass} type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
