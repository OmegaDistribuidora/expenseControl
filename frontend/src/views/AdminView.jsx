import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
  formatMoneyInput,
  historicoAcoes,
  historicoAtores,
  statusLabels,
} from "./format";

export const AdminView = ({
  categories,
  solicitacoes,
  solicitacoesTotal,
  selectedId,
  selected,
  statusFilter,
  categoryForm,
  decisionForm,
  pedidoInfoForm,
  loading,
  attachments,
  attachmentsLoading,
  search,
  sort,
  onSelect,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onUpdateCategoryForm,
  onCreateCategory,
  onUpdateDecisionForm,
  onUpdatePedidoInfoForm,
  onDecision,
  onPedidoInfo,
  onDeleteSolicitacao,
  onDownloadAttachment,
  onDeleteAttachment,
}) => {
  const canDecide = selected?.status === "PENDENTE";
  const history = selected?.historico || [];
  const canDeleteAttachment = selected?.status === "PENDENTE";
  const hasSearch = search.trim().length > 0;
  const showListSkeleton = loading && solicitacoes.length === 0;
  const listCountLabel = `${solicitacoes.length} de ${solicitacoesTotal} solicitações`;

  return (
    <main className="layout">
      <section className="panel panel--form">
        <h2 className="panel__title">Categorias</h2>
        <p className="panel__subtitle">Gerencie categorias da empresa.</p>

        <form onSubmit={onCreateCategory}>
          <div className="field">
            <label>Nome</label>
            <input
              value={categoryForm.nome}
              onChange={(event) => onUpdateCategoryForm({ nome: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Descrição</label>
            <input
              value={categoryForm.descricao}
              onChange={(event) => onUpdateCategoryForm({ descricao: event.target.value })}
            />
          </div>
          <button className="btn btn--primary" type="submit">
            Criar categoria
          </button>
        </form>

        <div className="section-title">Lista de categorias</div>
        {categories.length === 0 ? (
          <div className="list-empty">Nenhuma categoria.</div>
        ) : (
          <ul className="cards">
            {categories.map((cat) => (
              <li key={cat.id} className="card-item card-item--static">
                <div className="card-top">
                  <h3 className="card-title">{cat.nome}</h3>
                  <span className="badge">{cat.ativa ? "Ativa" : "Inativa"}</span>
                </div>
                <p className="card-meta">{cat.descricao || "-"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel panel--list">
        <div className="card-top">
          <h2 className="panel__title">Solicitações</h2>
          <span className="small">{loading ? "Carregando..." : ""}</span>
        </div>
        <p className="panel__subtitle">Filtre e selecione para decidir.</p>

        <div className="field">
          <div className="field-grid">
            <div className="field">
              <label>Status</label>
              <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
                <option value="PENDENTE">Pendente</option>
                <option value="PENDENTE_INFO">Aguardando info</option>
                <option value="APROVADO">Aprovado</option>
                <option value="REPROVADO">Reprovado</option>
                <option value="TODOS">Todos</option>
              </select>
            </div>
            <div className="field">
              <label>Buscar</label>
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Título, filial ou categoria"
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
        ) : solicitacoes.length === 0 ? (
          <div className="list-empty">
            {hasSearch ? "Nenhuma solicitação encontrada para a busca." : "Nenhuma solicitação no filtro."}
          </div>
        ) : (
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
                <div className="card-meta">{item.filial}</div>
                <div className="card-meta mono">{formatCurrency(item.valorEstimado)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel panel--detail">
        <h2 className="panel__title">Decisão</h2>
        <p className="panel__subtitle">Avalie e aprove ou reprove.</p>

        {!selected ? (
          <div className="list-empty">Selecione uma solicitação.</div>
        ) : (
          <div className="detail-card">
            <div className="detail-header">
              <div>
                <p className="kicker">{selected.categoriaNome}</p>
                <h3 className="detail-title">{selected.titulo}</h3>
                <p className="detail-subtitle">{selected.descricao}</p>
              </div>
              <span className={`status-pill status-pill--${selected.status}`}>
                {statusLabels[selected.status]}
              </span>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Filial</span>
                <span className="detail-value">{selected.filial}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Categoria</span>
                <span className="detail-value">{selected.categoriaNome}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Valor estimado</span>
                <span className="detail-value mono">{formatCurrency(selected.valorEstimado)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Valor aprovado</span>
                <span className="detail-value mono">{formatCurrency(selected.valorAprovado)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Fornecedor</span>
                <span className="detail-value">{selected.fornecedor || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Forma de pagamento</span>
                <span className="detail-value">{selected.formaPagamento || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Enviado em</span>
                <span className="detail-value mono">{formatDateTime(selected.enviadoEm)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Decidido em</span>
                <span className="detail-value mono">{formatDateTime(selected.decididoEm)}</span>
              </div>
            </div>

            <div className="detail-block">
              <span className="detail-label">Onde vai ser usado</span>
              <p>{selected.ondeVaiSerUsado || "-"}</p>
            </div>

            <div className="detail-block">
              <span className="detail-label">Observações</span>
              <p>{selected.observacoes || "-"}</p>
            </div>

            {selected.comentarioDecisao && (
              <div className="detail-block">
                <span className="detail-label">Comentário atual</span>
                <p>{selected.comentarioDecisao}</p>
              </div>
            )}

            <div className="detail-block">
              <span className="detail-label">Pedido de ajuste</span>
              <p className="small">
                Use esse campo quando precisar de mais detalhes da filial antes de decidir.
              </p>
              <div className="field">
                <label>Comentário para a filial</label>
                <textarea
                  value={pedidoInfoForm.comentario}
                  onChange={(event) => onUpdatePedidoInfoForm({ comentario: event.target.value })}
                  disabled={!canDecide}
                />
              </div>
              <div className="actions actions--end">
                <button className="btn btn--ghost" type="button" onClick={onPedidoInfo} disabled={!canDecide}>
                  Pedir ajuste
                </button>
              </div>
            </div>

            <div className="detail-block detail-block--decision">
              <span className="detail-label">Decisão</span>
              <div className="field">
                <label>Valor aprovado</label>
                <div className="money-field">
                  <span className="money-prefix">R$</span>
                  <input
                    className="input-money"
                    type="text"
                    inputMode="decimal"
                    value={decisionForm.valorAprovado ?? ""}
                    onChange={(event) => onUpdateDecisionForm({ valorAprovado: event.target.value })}
                    onBlur={(event) =>
                      onUpdateDecisionForm({ valorAprovado: formatMoneyInput(event.target.value) })
                    }
                    disabled={!canDecide}
                  />
                </div>
              </div>

              <div className="field">
                <label>Comentário da decisão</label>
                <textarea
                  value={decisionForm.comentario}
                  onChange={(event) => onUpdateDecisionForm({ comentario: event.target.value })}
                  disabled={!canDecide}
                />
              </div>

              <div className="action-bar action-bar--inline">
                <div className="action-bar__group">
                  <button
                    className="btn btn--success"
                    type="button"
                    onClick={() => onDecision("APROVADO")}
                    disabled={!canDecide}
                  >
                    Aprovar
                  </button>
                  <button
                    className="btn btn--danger"
                    type="button"
                    onClick={() => onDecision("REPROVADO")}
                    disabled={!canDecide}
                  >
                    Reprovar
                  </button>
                </div>
                <div className="action-bar__group action-bar__group--end">
                  <button className="btn btn--danger" type="button" onClick={onDeleteSolicitacao}>
                    Excluir solicitação
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <span className="detail-label">Itens da solicitação</span>
              {selected.linhas.length === 0 ? (
                <p className="small">Sem itens adicionados ainda.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Valor do item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.linhas.map((linha) => (
                      <tr key={linha.id || linha.descricao}>
                        <td>{linha.descricao}</td>
                        <td className="mono">{formatCurrency(linha.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="detail-block">
              <span className="detail-label">Anexos</span>
              {attachmentsLoading ? (
                <div className="skeleton-table">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={`admin-attach-skeleton-${index}`} className="skeleton-row">
                      <span className="skeleton-line w-35" />
                      <span className="skeleton-line w-15" />
                      <span className="skeleton-line w-25" />
                      <span className="skeleton-line w-20" />
                    </div>
                  ))}
                </div>
              ) : attachments.length === 0 ? (
                <p className="small">Nenhum anexo enviado.</p>
              ) : (
                <table className="table table--attachments">
                  <thead>
                    <tr>
                      <th>Arquivo</th>
                      <th>Tamanho</th>
                      <th>Enviado por</th>
                      <th>Data</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachments.map((item) => (
                      <tr key={item.id}>
                        <td className="file-name">{item.originalName}</td>
                        <td className="mono file-meta">{formatFileSize(item.size)}</td>
                        <td className="file-meta">{item.uploadedBy}</td>
                        <td className="mono file-meta">{formatDateTime(item.createdAt)}</td>
                        <td className="table-actions">
                          <div className="actions actions--end attachment-actions">
                            <button
                              className="btn btn--ghost btn--sm"
                              type="button"
                              onClick={() => onDownloadAttachment(item)}
                            >
                              Baixar
                            </button>
                            {canDeleteAttachment && (
                              <button
                                className="btn btn--danger btn--sm"
                                type="button"
                                onClick={() => onDeleteAttachment(item.id, selected.id)}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="detail-block">
              <span className="detail-label">Histórico</span>
              {history.length === 0 ? (
                <p className="small">Sem registros no histórico.</p>
              ) : (
                <div className="history">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-meta">
                        <span className="history-actor">{historicoAtores[item.ator] || item.ator}</span>
                        <span className="history-action">
                          {historicoAcoes[item.acao] || item.acao}
                        </span>
                        <span className="mono">{formatDateTime(item.criadoEm)}</span>
                      </div>
                      {item.comentario && <p className="history-comment">{item.comentario}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
