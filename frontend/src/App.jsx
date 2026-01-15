import "./App.css";
import { useAppController } from "./controllers/useAppController.js";
import { AdminView } from "./views/AdminView.jsx";
import { ConfirmDialog } from "./views/ConfirmDialog.jsx";
import { FilialView } from "./views/FilialView.jsx";
import { HeaderView } from "./views/HeaderView.jsx";
import { LoadingView } from "./views/LoadingView.jsx";
import { LoginView } from "./views/LoginView.jsx";
import { NoticeView } from "./views/NoticeView.jsx";

function App() {
  const controller = useAppController();

  if (!controller.auth) {
    return (
      <LoginView
        form={controller.loginForm}
        onUpdateForm={controller.updateLoginForm}
        onSubmit={controller.onLogin}
        loading={controller.authLoading}
        notice={controller.notice}
        onDismissNotice={controller.dismissNotice}
      />
    );
  }

  if (!controller.profile) {
    return <LoadingView />;
  }

  return (
    <div className="app-shell">
      <HeaderView profile={controller.profile} onLogout={controller.onLogout} />

      {controller.notice && (
        <NoticeView notice={controller.notice} onDismiss={controller.dismissNotice} />
      )}

      {controller.profile.tipo === "FILIAL" ? (
        <FilialView
          categories={controller.filial.categories}
          solicitacoes={controller.filial.solicitacoes}
          solicitacoesTotal={controller.filial.solicitacoesTotal}
          selectedId={controller.filial.selectedId}
          selected={controller.filial.selected}
          draft={controller.filial.draft}
          loading={controller.filial.loading}
          editId={controller.filial.editId}
          reenvioComentario={controller.filial.reenvioComentario}
          attachments={controller.filial.attachments}
          attachmentsLoading={controller.filial.attachmentsLoading}
          attachmentsUploading={controller.filial.attachmentsUploading}
          pendingAttachments={controller.filial.pendingAttachments}
          search={controller.filial.search}
          sort={controller.filial.sort}
          onSelect={controller.filial.setSelectedId}
          onSearchChange={controller.filial.setSearch}
          onSortChange={controller.filial.setSort}
          onUpdateDraft={controller.filial.updateDraft}
          onSubmit={controller.filial.onSubmit}
          onAddLine={controller.filial.addLine}
          onUpdateLine={controller.filial.updateLine}
          onRemoveLine={controller.filial.removeLine}
          onUpdateReenvioComentario={controller.filial.updateReenvioComentario}
          onStartReenvio={controller.filial.startReenvio}
          onCancelReenvio={controller.filial.cancelReenvio}
          onUploadAttachments={controller.filial.onUploadAttachments}
          onDownloadAttachment={controller.filial.onDownloadAttachment}
          onDeleteAttachment={controller.filial.onDeleteAttachment}
          onQueueAttachments={controller.filial.onQueueAttachments}
          onRemovePendingAttachment={controller.filial.onRemovePendingAttachment}
          onClearPendingAttachments={controller.filial.onClearPendingAttachments}
        />
      ) : (
        <AdminView
          categories={controller.admin.categories}
          solicitacoes={controller.admin.solicitacoes}
          solicitacoesTotal={controller.admin.solicitacoesTotal}
          selectedId={controller.admin.selectedId}
          selected={controller.admin.selected}
          statusFilter={controller.admin.statusFilter}
          categoryForm={controller.admin.categoryForm}
          decisionForm={controller.admin.decisionForm}
          pedidoInfoForm={controller.admin.pedidoInfoForm}
          loading={controller.admin.loading}
          attachments={controller.admin.attachments}
          attachmentsLoading={controller.admin.attachmentsLoading}
          search={controller.admin.search}
          sort={controller.admin.sort}
          onSelect={controller.admin.setSelectedId}
          onStatusChange={controller.admin.setStatusFilter}
          onSearchChange={controller.admin.setSearch}
          onSortChange={controller.admin.setSort}
          onUpdateCategoryForm={controller.admin.updateCategoryForm}
          onCreateCategory={controller.admin.onCreateCategory}
          onUpdateDecisionForm={controller.admin.updateDecisionForm}
          onUpdatePedidoInfoForm={controller.admin.updatePedidoInfoForm}
          onDecision={controller.admin.onDecision}
          onPedidoInfo={controller.admin.onPedidoInfo}
          onDownloadAttachment={controller.admin.onDownloadAttachment}
          onDeleteAttachment={controller.admin.onDeleteAttachment}
          onDeleteSolicitacao={controller.admin.onDeleteSolicitacao}
        />
      )}
      <ConfirmDialog
        open={Boolean(controller.confirmDialog)}
        title={controller.confirmDialog?.title}
        message={controller.confirmDialog?.message}
        confirmLabel={controller.confirmDialog?.confirmLabel}
        cancelLabel={controller.confirmDialog?.cancelLabel}
        intent={controller.confirmDialog?.intent}
        loading={controller.confirmLoading}
        onConfirm={controller.onConfirm}
        onCancel={controller.onDismissConfirm}
      />
    </div>
  );
}

export default App;
