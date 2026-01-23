import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
  historicoAcoes,
  historicoAtores,
  statusLabels,
} from "../format";
import { FileDropzone } from "./FileDropzone.jsx";

export const FilialDetailPanel = ({
  selected,
  attachments,
  attachmentsLoading,
  attachmentsUploading,
  saving,
  onStartReenvio,
  onUploadAttachments,
  onDownloadAttachment,
  onDeleteAttachment,
}) => {
  const history = selected?.historico || [];
  const maxAttachments = 5;
  const existingCount = attachments.length;
  const canEditAttachments = selected?.status === "PENDENTE";
  const canAttachMoreExisting = canEditAttachments && existingCount < maxAttachments;
  const isSubmitting = Boolean(saving);
  const detailUploadSummary = attachmentsUploading
    ? "Enviando anexos..."
    : `${existingCount}/${maxAttachments} anexos enviados`;

  return (
    <section className="panel panel--detail">
      <div className="panel__header">
        <h2 className="panel__title">Detalhes</h2>
        <p className="panel__subtitle">Status e aprovação da solicitação.</p>
      </div>
      <div className="panel__content">
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
                <span className="detail-label">Solicitante</span>
                <span className="detail-value">{selected.solicitanteNome || "-"}</span>
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
              <span className="detail-label">Pedido de ajuste</span>
              {selected.status === "PENDENTE_INFO" ? (
                <>
                  <p>{selected.comentarioDecisao || "Sem comentário do admin."}</p>
                  <div className="actions actions--end">
                    <button className="btn btn--primary" type="button" onClick={onStartReenvio}>
                      Editar para reenvio
                    </button>
                  </div>
                </>
              ) : (
                <p className="small">Nenhum pedido de ajuste para esta solicitação.</p>
              )}
            </div>

            {selected.status !== "PENDENTE_INFO" && selected.comentarioDecisao && (
              <div className="detail-block">
              <span className="detail-label">Comentário do admin</span>
                <p>{selected.comentarioDecisao}</p>
              </div>
            )}

            <div className="detail-block">
              <span className="detail-label">Onde vai ser usado</span>
              <p>{selected.ondeVaiSerUsado || "-"}</p>
            </div>

            <div className="detail-block">
              <span className="detail-label">Observações</span>
              <p>{selected.observacoes || "-"}</p>
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
                      <th>Valor</th>
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
              <div className="field">
                <label>Anexar arquivo</label>
                <FileDropzone
                  inputId="filial-attachments-detail"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/jpg"
                  disabled={!canAttachMoreExisting || attachmentsLoading || attachmentsUploading || isSubmitting}
                  onFiles={(files) => onUploadAttachments(files, selected.id)}
                  summaryText={detailUploadSummary}
                  helpText="PDF/JPG/PNG até 10MB. Máximo 5 anexos."
                />
              </div>

              {attachmentsLoading ? (
                <div className="skeleton-table">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={`filial-attach-skeleton-${index}`} className="skeleton-row">
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
                            {canEditAttachments && (
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
                        <span className="history-action">{historicoAcoes[item.acao] || item.acao}</span>
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
      </div>
    </section>
  );
};
