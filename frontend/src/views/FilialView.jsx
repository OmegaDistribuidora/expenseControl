import { useEffect, useState } from "react";
import { FilePlus, List } from "lucide-react";
import { FilialDetailPanel } from "./filial/FilialDetailPanel.jsx";
import { FilialFormPanel } from "./filial/FilialFormPanel.jsx";
import { FilialSolicitacoesPanel } from "./filial/FilialSolicitacoesPanel.jsx";

export const FilialView = ({
  categories,
  solicitacoes,
  solicitacoesTotal,
  page,
  totalPages,
  selectedId,
  selected,
  draft,
  loading,
  saving,
  editId,
  reenvioComentario,
  attachments,
  attachmentsLoading,
  attachmentsUploading,
  pendingAttachments,
  search,
  sort,
  onSelect,
  onPageChange,
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
  const [activeTab, setActiveTab] = useState("CRIAR");
  const isCreateTab = activeTab === "CRIAR";
  const isViewTab = activeTab === "LISTA";

  useEffect(() => {
    if (editId) {
      setActiveTab("CRIAR");
    }
  }, [editId]);

  const handleCreateTab = () => {
    setActiveTab("CRIAR");
  };

  const handleViewTab = () => {
    setActiveTab("LISTA");
  };

  const handleStartReenvio = () => {
    setActiveTab("CRIAR");
    onStartReenvio();
  };

  return (
    <main className={`layout layout--filial ${isCreateTab ? "is-create" : "is-view"}`}>
      <div className="layout__tabs">
        <button
          className={`btn tab ${isCreateTab ? "is-active" : ""}`}
          type="button"
          onClick={handleCreateTab}
        >
          <FilePlus className="tab__icon" aria-hidden="true" />
          Criar
        </button>
        <button
          className={`btn tab ${isViewTab ? "is-active" : ""}`}
          type="button"
          onClick={handleViewTab}
        >
          <List className="tab__icon" aria-hidden="true" />
          Minhas solicitacoes
        </button>
      </div>

      {isCreateTab && (
        <FilialFormPanel
          categories={categories}
          draft={draft}
          editId={editId}
          selectedId={selected?.id || selectedId}
          reenvioComentario={reenvioComentario}
          attachments={attachments}
          attachmentsUploading={attachmentsUploading}
          pendingAttachments={pendingAttachments}
          saving={saving}
          onUpdateDraft={onUpdateDraft}
          onSubmit={onSubmit}
          onAddLine={onAddLine}
          onUpdateLine={onUpdateLine}
          onRemoveLine={onRemoveLine}
          onUpdateReenvioComentario={onUpdateReenvioComentario}
          onCancelReenvio={onCancelReenvio}
          onUploadAttachments={onUploadAttachments}
          onQueueAttachments={onQueueAttachments}
          onRemovePendingAttachment={onRemovePendingAttachment}
          onClearPendingAttachments={onClearPendingAttachments}
        />
      )}

      {isViewTab && (
        <FilialSolicitacoesPanel
          solicitacoes={solicitacoes}
          solicitacoesTotal={solicitacoesTotal}
          selectedId={selectedId}
          loading={loading}
          search={search}
          sort={sort}
          page={page}
          totalPages={totalPages}
          onSelect={onSelect}
          onPageChange={onPageChange}
          onSearchChange={onSearchChange}
          onSortChange={onSortChange}
        />
      )}

      {isViewTab && (
        <FilialDetailPanel
          selected={selected}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          attachmentsUploading={attachmentsUploading}
          saving={saving}
          onStartReenvio={handleStartReenvio}
          onUploadAttachments={onUploadAttachments}
          onDownloadAttachment={onDownloadAttachment}
          onDeleteAttachment={onDeleteAttachment}
        />
      )}
    </main>
  );
};
