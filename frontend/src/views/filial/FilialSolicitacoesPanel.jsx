import { formatCurrency, statusLabels } from "../format";

export const FilialSolicitacoesPanel = ({
  solicitacoes,
  solicitacoesTotal,
  selectedId,
  loading,
  search,
  sort,
  page,
  totalPages,
  onSelect,
  onPageChange,
  onSearchChange,
  onSortChange,
}) => {
  const hasSearch = search.trim().length > 0;
  const showListSkeleton = loading && solicitacoes.length === 0;
  const listCountLabel = `${solicitacoes.length} de ${solicitacoesTotal} solicitações`;
  const totalPagesSafe = Math.max(totalPages || 0, 1);
  const pageLabel = `Página ${Math.min(page + 1, totalPagesSafe)} de ${totalPagesSafe}`;
  const canGoPrevPage = page > 0;
  const canGoNextPage = totalPages > 0 && page + 1 < totalPages;
  const showPageNav = totalPages > 1;

  const handlePrevPage = () => {
    if (!canGoPrevPage) return;
    onPageChange(page - 1);
  };

  const handleNextPage = () => {
    if (!canGoNextPage) return;
    onPageChange(page + 1);
  };

  return (
    <section className="panel panel--list">
      <div className="panel__header">
        <div className="card-top">
          <h2 className="panel__title">Solicitações recentes</h2>
          <span className="small">{loading ? "Carregando..." : ""}</span>
        </div>
        <p className="panel__subtitle">Clique para ver detalhes.</p>

        <div className="field-grid">
          <div className="field">
            <label>Buscar</label>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Título, categoria ou fornecedor"
              aria-label="Buscar solicitações"
            />
          </div>
          <div className="field">
            <label>Ordenar</label>
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="RECENT">Mais recentes</option>
              <option value="OLD">Mais antigas</option>
              <option value="VALUE_DESC">Maior valor</option>
              <option value="VALUE_ASC">Menor valor</option>
              <option value="TITLE">Título A-Z</option>
            </select>
          </div>
        </div>
        <div className="list-meta">{listCountLabel}</div>
      </div>
      <div className="panel__content">
        {showListSkeleton ? (
          <div className="skeleton-stack">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`filial-list-skeleton-${index}`} className="skeleton-card">
                <div className="skeleton-line w-60" />
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-30" />
              </div>
            ))}
          </div>
        ) : solicitacoes.length === 0 ? (
          <div className="list-empty">
            {hasSearch ? "Nenhuma solicitação encontrada para a busca." : "Nenhuma solicitação cadastrada."}
          </div>
        ) : (
          <>
            <ul className="cards">
              {solicitacoes.map((item) => (
                <li
                  key={item.id}
                  className={`card-item ${item.id === selectedId ? "is-active" : ""}`}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={item.id === selectedId}
                >
                  <div className="card-top">
                    <h3 className="card-title">{item.titulo}</h3>
                    <span className={`status-pill status-pill--${item.status}`}>
                      {statusLabels[item.status]}
                    </span>
                  </div>
                  <div className="card-meta">{item.categoriaNome}</div>
                  <div className="card-meta mono">{formatCurrency(item.valorEstimado)}</div>
                </li>
              ))}
            </ul>
            {showPageNav && (
              <div className="list-navigation">
                <div className="list-meta">{pageLabel}</div>
                <div className="actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={handlePrevPage}
                    disabled={!canGoPrevPage || loading}
                  >
                    Página anterior
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    type="button"
                    onClick={handleNextPage}
                    disabled={!canGoNextPage || loading}
                  >
                    Próxima página
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
