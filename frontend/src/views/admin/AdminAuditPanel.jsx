import { formatDateTime } from "../format";

export const AdminAuditPanel = ({
  events,
  loading,
  page,
  totalPages,
  total,
  search,
  onSearchChange,
  onPageChange,
  onRefresh,
}) => {
  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    onPageChange(0);
    onRefresh?.();
  };

  return (
    <section className="panel panel--audit">
      <h2 className="panel__title">Auditoria</h2>
      <p className="panel__subtitle">Historico textual de acoes realizadas pelos usuarios.</p>

      <form className="audit-toolbar" onSubmit={handleSearchSubmit}>
        <div className="field audit-toolbar__field">
          <label>Buscar</label>
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Usuario, acao ou detalhe..."
            maxLength={120}
          />
        </div>
        <button className="btn btn--ghost" type="submit" disabled={loading}>
          Filtrar
        </button>
      </form>

      {loading ? (
        <div className="list-empty">Carregando auditoria...</div>
      ) : events.length === 0 ? (
        <div className="list-empty">Nenhum evento de auditoria encontrado.</div>
      ) : (
        <ul className="audit-list">
          {events.map((item) => (
            <li key={item.id} className="audit-item">
              <p className="audit-line">
                <span className="mono">{formatDateTime(item.criadoEm)}</span>
                {" - "}
                <strong>{item.usuario}</strong>
                {" ("}
                {item.tipoConta}
                {") - "}
                {item.acao}
                {item.referenciaTipo && item.referenciaId
                  ? ` [${item.referenciaTipo} ${item.referenciaId}]`
                  : ""}
              </p>
              <p className="audit-detail">{item.detalhe}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="list-navigation">
        <p className="list-meta">
          {total} registro(s) · Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages}
        </p>
        <div className="actions actions--end">
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => onRefresh?.()} disabled={loading}>
            Atualizar
          </button>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrevious || loading}
          >
            Anterior
          </button>
          <button
            className="btn btn--ghost btn--sm"
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext || loading}
          >
            Proxima
          </button>
        </div>
      </div>
    </section>
  );
};

