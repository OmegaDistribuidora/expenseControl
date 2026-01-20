import { useState } from "react";
import {
  formatCurrency,
  formatDateTime,
  formatFileSize,
  formatMoneyInput,
  historicoAcoes,
  historicoAtores,
  statusLabels,
} from "./format";

const FileDropzone = ({
  accept,
  disabled,
  multiple,
  helpText,
  summaryText,
  onFiles,
  inputId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropzoneClass = [
    "file-dropzone",
    isDragging ? "is-dragging" : "",
    disabled ? "is-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    onFiles(files);
  };

  return (
    <div
      className={dropzoneClass}
      role="group"
      aria-disabled={disabled}
      onDragOver={(event) => {
        event.preventDefault();
        if (disabled) return;
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (disabled) return;
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        id={inputId}
        className="file-input"
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
        aria-describedby={helpText && inputId ? `${inputId}-help` : undefined}
      />
      <div className="file-dropzone__text">
        <span className="file-dropzone__title">Arraste arquivos aqui ou clique para selecionar</span>
        {summaryText && <span className="file-dropzone__meta">{summaryText}</span>}
        {helpText && (
          <span id={`${inputId}-help`} className="small file-help">
            {helpText}
          </span>
        )}
      </div>
    </div>
  );
};

export const FilialView = ({
  categories,
  solicitacoes,
  solicitacoesTotal,
  selectedId,
  selected,
  draft,
  loading,
  editId,
  reenvioComentario,
  attachments,
  attachmentsLoading,
  attachmentsUploading,
  pendingAttachments,
  search,
  sort,
  onSelect,
  onSearchChange,
  onSortChange,
  onUpdateDraft,
  onSubmit,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onUpdateReenvioComentario,
  onStartReenvio,
  onCancelReenvio,
  onUploadAttachments,
  onDownloadAttachment,
  onDeleteAttachment,
  onQueueAttachments,
  onRemovePendingAttachment,
  onClearPendingAttachments,
}) => {
  const isEditing = Boolean(editId);
  const history = selected?.historico || [];
  const canEditAttachments = selected?.status === "PENDENTE";
  const hasSearch = search.trim().length > 0;
  const showListSkeleton = loading && solicitacoes.length === 0;
  const listCountLabel = `${solicitacoes.length} de ${solicitacoesTotal} solicitações`;

  const maxAttachments = 5;
  const pendingCount = pendingAttachments.length;
  const existingCount = attachments.length;
  const canAttachMore = isEditing ? existingCount < maxAttachments : pendingCount < maxAttachments;
  const canAttachMoreExisting = canEditAttachments && existingCount < maxAttachments;
  const uploadTargetId = editId || selected?.id;
  const draftUploadSummary = attachmentsUploading
    ? "Enviando anexos..."
    : `${pendingCount}/${maxAttachments} anexos na fila`;
  const detailUploadSummary = attachmentsUploading
    ? "Enviando anexos..."
    : `${existingCount}/${maxAttachments} anexos enviados`;
  const draftUploadHelp = "PDF/JPG/PNG até 10MB. Os anexos são enviados após salvar a solicitação.";

  const handleDropFiles = (files) => {
    if (isEditing && uploadTargetId) {
      onUploadAttachments(files, uploadTargetId);
      return;
    }
    onQueueAttachments(files);
  };

  return (
    <main className="layout">
      <section className="panel panel--form">
        <h2 className="panel__title">
          {isEditing ? "Reenvio de solicitação" : "Nova solicitação"}
        </h2>
        <p className="panel__subtitle">
          {isEditing
            ? "Atualize os dados e reenvie para o admin."
            : "Registre uma nova demanda da filial."}
        </p>

        {isEditing && (
          <div className="info-bar">
            <span className="info-label">Reenvio ativo</span>
            <span className="info-value">A solicitação será reenviada ao admin.</span>
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Categoria</label>
            <select
              value={draft.categoriaId}
              onChange={(event) => onUpdateDraft({ categoriaId: event.target.value })}
              required
            >
              <option value="" disabled>
                Selecione
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Título</label>
            <input
              value={draft.titulo}
              onChange={(event) => onUpdateDraft({ titulo: event.target.value })}
              required
            />
          </div>

          <div className="field">
            <label>Descrição / Justificativa</label>
            <textarea
              value={draft.descricao}
              onChange={(event) => onUpdateDraft({ descricao: event.target.value })}
              required
            />
          </div>

          <div className="field">
            <label>Onde vai ser usado</label>
            <input
              value={draft.ondeVaiSerUsado}
              onChange={(event) => onUpdateDraft({ ondeVaiSerUsado: event.target.value })}
              required
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <label>Valor estimado</label>
              <div className="money-field">
                <span className="money-prefix">R$</span>
                <input
                  className="input-money"
                  type="text"
                  inputMode="decimal"
                  value={draft.valorEstimado ?? ""}
                  onChange={(event) => onUpdateDraft({ valorEstimado: event.target.value })}
                  onBlur={(event) => onUpdateDraft({ valorEstimado: formatMoneyInput(event.target.value) })}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Fornecedor</label>
              <input
                value={draft.fornecedor}
                onChange={(event) => onUpdateDraft({ fornecedor: event.target.value })}
              />
            </div>
            <div className="field">
              <label>Forma de pagamento</label>
              <input
                value={draft.formaPagamento}
                onChange={(event) => onUpdateDraft({ formaPagamento: event.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label>Observações</label>
            <textarea
              value={draft.observacoes}
              onChange={(event) => onUpdateDraft({ observacoes: event.target.value })}
            />
          </div>

          {isEditing && (
            <div className="field">
              <label>Comentário para o admin</label>
              <textarea
                value={reenvioComentario}
                onChange={(event) => onUpdateReenvioComentario(event.target.value)}
              />
            </div>
          )}

          <div className="section-title">Anexos</div>
          <p className="panel__subtitle">
            PDF/JPG/PNG até 10MB. Máximo 5 anexos por solicitação.
          </p>
          <div className="field file-field">
            <label>Anexar arquivos</label>
            <FileDropzone
              inputId="filial-attachments"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              disabled={!canAttachMore || attachmentsUploading}
              onFiles={handleDropFiles}
              summaryText={draftUploadSummary}
              helpText={draftUploadHelp}
            />
          </div>

          {!isEditing && pendingAttachments.length > 0 && (
            <>
              <table className="table table--attachments table--compact">
                <thead>
                  <tr>
                    <th>Arquivo</th>
                    <th>Tamanho</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAttachments.map((file, index) => (
                    <tr key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <td className="file-name">{file.name}</td>
                      <td className="mono file-meta">{formatFileSize(file.size)}</td>
                      <td className="table-actions">
                        <div className="actions actions--end attachment-actions">
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => onRemovePendingAttachment(index)}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="actions actions--end">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={onClearPendingAttachments}
                >
                  Limpar anexos
                </button>
              </div>
            </>
          )}

          <div className="section-title">Itens da solicitação</div>
          <p className="panel__subtitle">Descreva cada item e o valor estimado por item.</p>
          <div className="line-list">
            {draft.linhas.map((linha, index) => (
              <div className="line-card" key={index}>
                <div className="field-row">
                  <div className="field">
                    <label>Nome do item</label>
                    <input
                      value={linha.descricao}
                      onChange={(event) => onUpdateLine(index, { descricao: event.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Valor do item</label>
                    <div className="money-field">
                      <span className="money-prefix">R$</span>
                      <input
                        className="input-money"
                        type="text"
                        inputMode="decimal"
                        value={linha.valor ?? ""}
                        onChange={(event) => onUpdateLine(index, { valor: event.target.value })}
                        onBlur={(event) => onUpdateLine(index, { valor: formatMoneyInput(event.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label>Observação do item</label>
                  <input
                    value={linha.observacao}
                    onChange={(event) => onUpdateLine(index, { observacao: event.target.value })}
                  />
                </div>
                <div className="actions actions--end">
                  <button type="button" className="btn btn--ghost" onClick={() => onRemoveLine(index)}>
                    Remover item
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="actions">
            <button type="button" className="btn btn--ghost" onClick={onAddLine}>
              Adicionar item
            </button>
            {isEditing && (
              <button type="button" className="btn btn--ghost" onClick={onCancelReenvio}>
                Cancelar reenvio
              </button>
            )}
            <button className="btn btn--primary" type="submit">
              {isEditing ? "Reenviar solicitação" : "Enviar solicitação"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel panel--list">
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
        )}
      </section>

      <section className="panel panel--detail">
        <h2 className="panel__title">Detalhes</h2>
        <p className="panel__subtitle">Status e aprovação da solicitação.</p>

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
                  disabled={!canAttachMoreExisting || attachmentsUploading}
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

