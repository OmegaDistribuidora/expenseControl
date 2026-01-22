import { ArrowUpDown, Filter, Hash, ListChecks, ListFilter, Search } from "lucide-react";
import { formatCurrency, statusLabels } from "../format";

export const AdminSolicitacoesPanel = ({
  solicitacoes,
  solicitacoesTotal,
  loading,
  page,
  totalPages,
  selectedId,
  statusFilter,
  search,
  sort,
  isSolicitacoesTab,
  isAprovadasTab,
  onSelect,
  onPageChange,
  onStatusChange,
  onSearchChange,
  onSortChange,
}) => {
  const listTitle = isAprovadasTab ? "Solicitacoes aprovadas" : "Solicitacoes";
  const listSubtitle = isAprovadasTab
    ? "Consulte itens ja aprovados."
    : "Filtre e selecione para decidir.";
  const statusSummaryLabel = isAprovadasTab
    ? "Aprovadas"
    : statusFilter === "TODOS"
      ? "Todos"
      : statusLabels[statusFilter] || statusFilter;

  const hasSearch = search.trim().length > 0;
  const showListSkeleton = loading && solicitacoes.length === 0;
  const listCountLabel = `${solicitacoes.length} de ${solicitacoesTotal} solicitacoes`;
  const hasSolicitacoes = solicitacoes.length > 0;
  const selectedIndex = hasSolicitacoes
    ? solicitacoes.findIndex((item) => item.id === selectedId)
    : -1;
  const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const currentItem = hasSolicitacoes ? solicitacoes[currentIndex] : null;
  const canGoPrev = hasSolicitacoes && currentIndex > 0;
  const canGoNext = hasSolicitacoes && currentIndex < solicitacoes.length - 1;
  const positionLabel = hasSolicitacoes
    ? `${currentIndex + 1} de ${solicitacoes.length} solicitacoes`
    : "0 solicitacoes";
  const totalPagesSafe = Math.max(totalPages || 0, 1);
  const pageLabel = `Pagina ${Math.min(page + 1, totalPagesSafe)} de ${totalPagesSafe}`;
  const canGoPrevPage = page > 0;
  const canGoNextPage = totalPages > 0 && page + 1 < totalPages;
  const showItemNav = hasSolicitacoes && solicitacoes.length > 1;
  const showPageNav = totalPages > 1;

  const handlePrev = () => {
    if (!canGoPrev) return;
    onSelect(solicitacoes[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (!canGoNext) return;
    onSelect(solicitacoes[currentIndex + 1].id);
  };

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
      <div className="card-top">
        <h2 className="panel__title">{listTitle}</h2>
        <span className="small">{loading ? "Carregando..." : ""}</span>
      </div>
      <p className="panel__subtitle">{listSubtitle}</p>
      <div className="info-grid">
        <div className="info-bar">
          <span className="info-label">
            <ListFilter className="info-icon" aria-hidden="true" />
            Status
          </span>
          <span className="info-value">{statusSummaryLabel}</span>
        </div>
        <div className="info-bar">
          <span className="info-label">
            <Hash className="info-icon" aria-hidden="true" />
            Total
          </span>
          <span className="info-value">{solicitacoesTotal}</span>
        </div>
        <div className="info-bar">
          <span className="info-label">
            <ListChecks className="info-icon" aria-hidden="true" />
            Exibindo
          </span>
          <span className="info-value">{solicitacoes.length}</span>
        </div>
      </div>

      <div className="field">
        <div className="field-grid">
          {isSolicitacoesTab && (
            <div className="field">
              <label className="field-label">
                <Filter className="field-icon" aria-hidden="true" />
                Status
              </label>
              <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="PENDENTE_INFO">Aguardando info</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REPROVADO">Reprovado</option>
                <option value="TODOS">Todos</option>
              </select>
            </div>
          )}
          <div className="field">
            <label className="field-label">
              <Search className="field-icon" aria-hidden="true" />
              Buscar
            </label>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={isAprovadasTab ? "Titulo ou filial" : "Titulo, filial ou categoria"}
              aria-label="Buscar solicitacoes"
            />
          </div>
          <div className="field">
            <label className="field-label">
              <ArrowUpDown className="field-icon" aria-hidden="true" />
              Ordenar
            </label>
            <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
              <option value="RECENT">Mais recentes</option>
              <option value="OLD">Mais antigas</option>
              <option value="VALUE_DESC">Maior valor</option>
              <option value="VALUE_ASC">Menor valor</option>
              <option value="TITLE">Titulo A-Z</option>
            </select>
          </div>
        </div>
        <div className="list-meta">{listCountLabel}</div>
      </div>

      {showListSkeleton ? (
        <div className="skeleton-stack">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`admin-list-skeleton-${index}`} className="skeleton-card">
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-40" />
              <div className="skeleton-line w-30" />
            </div>
          ))}
        </div>
      ) : !currentItem ? (
        <div className="list-empty">
          {hasSearch ? "Nenhuma solicitacao encontrada para a busca." : "Nenhuma solicitacao no filtro."}
        </div>
      ) : (
        <>
          <ul className="cards cards--compact">
            <li
              key={currentItem.id}
              className={`card-item ${currentItem.id === selectedId ? "is-active" : ""}`}
              onClick={() => onSelect(currentItem.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(currentItem.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-pressed={currentItem.id === selectedId}
            >
              <div className="card-top">
                <h3 className="card-title">{currentItem.titulo}</h3>
                {!isAprovadasTab && (
                  <span className={`status-pill status-pill--${currentItem.status}`}>
                    {statusLabels[currentItem.status]}
                  </span>
                )}
              </div>
              <div className="card-meta">{currentItem.filial}</div>
              {!isAprovadasTab && (
                <div className="card-meta mono">{formatCurrency(currentItem.valorEstimado)}</div>
              )}
            </li>
          </ul>
          {showItemNav && (
            <div className="list-navigation">
              <div className="list-meta">{positionLabel}</div>
              <div className="actions">
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                >
                  Anterior
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                >
                  Proxima
                </button>
              </div>
            </div>
          )}
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
                  Pagina anterior
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  type="button"
                  onClick={handleNextPage}
                  disabled={!canGoNextPage || loading}
                >
                  Proxima pagina
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};
