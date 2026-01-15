export const NoticeView = ({ notice, onDismiss }) => {
  return (
    <div className={`notice notice--${notice.type}`}>
      <p className="notice__text">{notice.message}</p>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
        Fechar
      </button>
    </div>
  );
};
