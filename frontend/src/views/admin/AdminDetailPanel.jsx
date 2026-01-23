import { useEffect, useId, useState } from "react";
import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
  formatMoneyInput,
  historicoAcoes,
  historicoAtores,
  statusLabels,
} from "../format";

export const AdminDetailPanel = ({
  selected,
  isAprovadasTab,
  decisionForm,
  pedidoInfoForm,
  decisionLoading,
  pedidoInfoLoading,
  deleteLoading,
  attachments,
  attachmentsLoading,
  onUpdateDecisionForm,
  onUpdatePedidoInfoForm,
  onDecision,
  onPedidoInfo,
  onDeleteSolicitacao,
  onDownloadAttachment,
  onDeleteAttachment,
}) => {
  const canDecide = selected?.status === "PENDENTE";
  const isDecisionBusy = decisionLoading || pedidoInfoLoading || deleteLoading;
  const isPedidoInfoBusy = pedidoInfoLoading || decisionLoading || deleteLoading;
  const isDeleteBusy = deleteLoading || decisionLoading || pedidoInfoLoading;
  const history = selected?.historico || [];
  const canDeleteAttachment = selected?.status === "PENDENTE";
  const detailTitle = isAprovadasTab ? "Detalhes" : "Decisão";
  const detailSubtitle = isAprovadasTab ? "" : "Avalie e aprove ou reprove.";
  const leftColumnTitle = "Informações";
  const rightColumnTitle = "Itens e anexos";
  const [pedidoInfoOpen, setPedidoInfoOpen] = useState(false);
  const pedidoInfoTitleId = useId();
  const pedidoInfoDescId = useId();
  const pedidoInfoFieldId = useId();

  useEffect(() => {
    setPedidoInfoOpen(false);
  }, [selected?.id]);

  useEffect(() => {
    if (!pedidoInfoOpen) return;
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pedidoInfoLoading) {
          setPedidoInfoOpen(false);
          setPedidoInfoSubmitted(false);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pedidoInfoOpen, pedidoInfoLoading]);

  const handleOpenPedidoInfo = () => {
    setPedidoInfoOpen(true);
  };

  const handleClosePedidoInfo = () => {
    if (pedidoInfoLoading) return;
    setPedidoInfoOpen(false);
  };

  const handleConfirmPedidoInfo = async () => {
    const success = await onPedidoInfo();
    if (success) {
      setPedidoInfoOpen(false);
    }
  };

  return (
    <section className="panel panel--detail">
      <h2 className="panel__title">{detailTitle}</h2>
      {detailSubtitle && <p className="panel__subtitle">{detailSubtitle}</p>}

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
              <span className="detail-label">Solicitante</span>
              <span className="detail-value">{selected.solicitanteNome || "-"}</span>
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

          <div className="detail-columns">
            <div className="detail-column">
              <div className="section-title">{leftColumnTitle}</div>
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

              {!isAprovadasTab && (
                <div className="detail-block">
                  <span className="detail-label">Pedido de ajuste</span>
                  <p className="small">
                    Use esse campo quando precisar de mais detalhes da filial antes de decidir.
                  </p>
                  <div className="actions actions--end">
                    <button
                      className="btn btn--ghost"
                      type="button"
                      onClick={handleOpenPedidoInfo}
                      disabled={!canDecide || isPedidoInfoBusy}
                    >
                      {pedidoInfoLoading ? "Enviando..." : "Pedir ajuste"}
                    </button>
                  </div>
                </div>
              )}

              {!isAprovadasTab ? (
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
                        disabled={!canDecide || isDecisionBusy}
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>Comentário da decisão</label>
                    <textarea
                      value={decisionForm.comentario}
                      onChange={(event) => onUpdateDecisionForm({ comentario: event.target.value })}
                      maxLength={500}
                      disabled={!canDecide || isDecisionBusy}
                    />
                  </div>

                  <div className="action-bar action-bar--inline">
                    <div className="action-bar__group">
                      <button
                        className="btn btn--success"
                        type="button"
                        onClick={() => onDecision("APROVADO")}
                        disabled={!canDecide || isDecisionBusy}
                      >
                        Aprovar
                      </button>
                      <button
                        className="btn btn--danger"
                        type="button"
                        onClick={() => onDecision("REPROVADO")}
                        disabled={!canDecide || isDecisionBusy}
                      >
                        Reprovar
                      </button>
                    </div>
                    <div className="action-bar__group action-bar__group--end">
                      <button
                        className="btn btn--danger"
                        type="button"
                        onClick={onDeleteSolicitacao}
                        disabled={isDeleteBusy}
                      >
                        {deleteLoading ? "Excluindo..." : "Excluir solicitação"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="detail-block">
                  <span className="detail-label">Ações</span>
                  <div className="actions actions--end">
                    <button
                      className="btn btn--danger"
                      type="button"
                      onClick={onDeleteSolicitacao}
                      disabled={isDeleteBusy}
                    >
                      {deleteLoading ? "Excluindo..." : "Excluir solicitação"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-column">
              <div className="section-title">{rightColumnTitle}</div>
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
                          <span className="history-actor">
                            {historicoAtores[item.ator] || item.ator}
                          </span>
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
          </div>
        </div>
      )}

      {pedidoInfoOpen && !isAprovadasTab && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleClosePedidoInfo();
            }
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={pedidoInfoTitleId}
            aria-describedby={pedidoInfoDescId}
          >
            <h3 className="modal__title" id={pedidoInfoTitleId}>
              Solicitar ajustes
            </h3>
            <p className="modal__message" id={pedidoInfoDescId}>
              Descreva os ajustes necessários para a filial.
            </p>
            {selected?.titulo && <p className="small">Solicitação: {selected.titulo}</p>}
            <div className="field">
              <label htmlFor={pedidoInfoFieldId}>Motivo / Observações</label>
              <textarea
                id={pedidoInfoFieldId}
                value={pedidoInfoForm.comentario}
                onChange={(event) => onUpdatePedidoInfoForm({ comentario: event.target.value })}
                maxLength={500}
                disabled={!canDecide || isPedidoInfoBusy}
              />
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" type="button" onClick={handleClosePedidoInfo} disabled={isPedidoInfoBusy}>
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => void handleConfirmPedidoInfo()}
                disabled={!canDecide || isPedidoInfoBusy}
              >
                {pedidoInfoLoading ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
