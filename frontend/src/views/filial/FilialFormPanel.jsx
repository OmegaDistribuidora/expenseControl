import { formatFileSize, formatMoneyInput } from "../format";
import { FileDropzone } from "./FileDropzone.jsx";

export const FilialFormPanel = ({
  categories,
  draft,
  editId,
  selectedId,
  reenvioComentario,
  attachments,
  attachmentsUploading,
  pendingAttachments,
  saving,
  onUpdateDraft,
  onSubmit,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onUpdateReenvioComentario,
  onCancelReenvio,
  onUploadAttachments,
  onQueueAttachments,
  onRemovePendingAttachment,
  onClearPendingAttachments,
}) => {
  const isEditing = Boolean(editId);
  const isSubmitting = Boolean(saving);
  const maxAttachments = 5;
  const pendingCount = pendingAttachments.length;
  const existingCount = attachments.length;
  const canAttachMore = isEditing ? existingCount < maxAttachments : pendingCount < maxAttachments;
  const uploadTargetId = editId || selectedId;
  const draftUploadSummary = attachmentsUploading
    ? "Enviando anexos..."
    : `${pendingCount}/${maxAttachments} anexos na fila`;
  const draftUploadHelp =
    "PDF/JPG/PNG ate 10MB. Os anexos sao enviados apos salvar a solicitacao.";

  const handleDropFiles = (files) => {
    if (isEditing && uploadTargetId) {
      onUploadAttachments(files, uploadTargetId);
      return;
    }
    onQueueAttachments(files);
  };

  return (
    <section className="panel panel--form">
      <div className="panel__header">
        <h2 className="panel__title">{isEditing ? "Reenvio de solicitacao" : "Nova solicitacao"}</h2>
        <p className="panel__subtitle">
          {isEditing ? "Atualize os dados e reenvie para o admin." : "Registre uma nova demanda da filial."}
        </p>
      </div>
      <div className="panel__content">
        {isEditing && (
          <div className="info-bar">
            <span className="info-label">Reenvio ativo</span>
            <span className="info-value">A solicitacao sera reenviada ao admin.</span>
          </div>
        )}

        <form className="form form--compact" onSubmit={onSubmit}>
          <div className="field-grid">
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
              <label>Titulo</label>
              <input
                value={draft.titulo}
                onChange={(event) => onUpdateDraft({ titulo: event.target.value })}
                required
                maxLength={120}
              />
            </div>

            <div className="field">
              <label>Nome do solicitante</label>
              <input
                value={draft.solicitanteNome}
                onChange={(event) => onUpdateDraft({ solicitanteNome: event.target.value })}
                required
                maxLength={120}
              />
            </div>
          </div>

          <div className="field">
            <label>Descricao / Justificativa</label>
            <textarea
              rows={4}
              value={draft.descricao}
              onChange={(event) => onUpdateDraft({ descricao: event.target.value })}
              required
              maxLength={2000}
            />
          </div>

          <div className="field-grid">
            <div className="field">
              <label>Onde vai ser usado</label>
              <input
                value={draft.ondeVaiSerUsado}
                onChange={(event) => onUpdateDraft({ ondeVaiSerUsado: event.target.value })}
                required
                maxLength={255}
              />
            </div>

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
                maxLength={120}
              />
            </div>

            <div className="field">
              <label>Forma de pagamento</label>
              <input
                value={draft.formaPagamento}
                onChange={(event) => onUpdateDraft({ formaPagamento: event.target.value })}
                maxLength={50}
              />
            </div>
          </div>

          <div className="field-grid">
            <div className="field">
              <label>Observacoes</label>
              <textarea
                rows={3}
                value={draft.observacoes}
                onChange={(event) => onUpdateDraft({ observacoes: event.target.value })}
                maxLength={1000}
              />
            </div>

            {isEditing && (
              <div className="field">
                <label>Comentario para o admin</label>
                <textarea
                  rows={3}
                  value={reenvioComentario}
                  onChange={(event) => onUpdateReenvioComentario(event.target.value)}
                  maxLength={500}
                />
              </div>
            )}
          </div>

          <div className="section-title">Anexos</div>
          <p className="panel__subtitle">PDF/JPG/PNG ate 10MB. Maximo 5 anexos por solicitacao.</p>
          <div className="field file-field">
            <label>Anexar arquivos</label>
            <FileDropzone
              inputId="filial-attachments"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/jpg"
              disabled={!canAttachMore || attachmentsUploading || isSubmitting}
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
                <button type="button" className="btn btn--ghost btn--sm" onClick={onClearPendingAttachments}>
                  Limpar anexos
                </button>
              </div>
            </>
          )}

          <div className="section-title">Itens da solicitacao</div>
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
                      maxLength={160}
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
                        onBlur={(event) =>
                          onUpdateLine(index, { valor: formatMoneyInput(event.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label>Observacao do item</label>
                  <input
                    value={linha.observacao}
                    onChange={(event) => onUpdateLine(index, { observacao: event.target.value })}
                    maxLength={300}
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
            <button type="button" className="btn btn--ghost" onClick={onAddLine} disabled={isSubmitting}>
              Adicionar item
            </button>
            {isEditing && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancelReenvio}
                disabled={isSubmitting}
              >
                Cancelar reenvio
              </button>
            )}
            <button className="btn btn--primary" type="submit" disabled={isSubmitting || attachmentsUploading}>
              {isSubmitting
                ? isEditing
                  ? "Reenviando..."
                  : "Enviando..."
                : isEditing
                  ? "Reenviar solicitacao"
                  : "Enviar solicitacao"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
