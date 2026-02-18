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
          page={controller.filial.page}
          totalPages={controller.filial.totalPages}
          selectedId={controller.filial.selectedId}
          selected={controller.filial.selected}
          draft={controller.filial.draft}
          loading={controller.filial.loading}
          saving={controller.filial.saving}
          editId={controller.filial.editId}
          reenvioComentario={controller.filial.reenvioComentario}
          attachments={controller.filial.attachments}
          attachmentsLoading={controller.filial.attachmentsLoading}
          attachmentsUploading={controller.filial.attachmentsUploading}
          pendingAttachments={controller.filial.pendingAttachments}
          search={controller.filial.search}
          sort={controller.filial.sort}
          onSelect={controller.filial.setSelectedId}
          onPageChange={controller.filial.setPage}
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
          page={controller.admin.page}
          totalPages={controller.admin.totalPages}
          selectedId={controller.admin.selectedId}
          selected={controller.admin.selected}
          statusFilter={controller.admin.statusFilter}
          categoryForm={controller.admin.categoryForm}
          decisionForm={controller.admin.decisionForm}
          pedidoInfoForm={controller.admin.pedidoInfoForm}
          loading={controller.admin.loading}
          categorySaving={controller.admin.categorySaving}
          decisionLoading={controller.admin.decisionLoading}
          pedidoInfoLoading={controller.admin.pedidoInfoLoading}
          deleteLoading={controller.admin.deleteLoading}
          stats={controller.admin.stats}
          statsLoading={controller.admin.statsLoading}
          attachments={controller.admin.attachments}
          attachmentsLoading={controller.admin.attachmentsLoading}
          search={controller.admin.search}
          sort={controller.admin.sort}
          users={controller.admin.users}
          usersLoading={controller.admin.usersLoading}
          passwordForm={controller.admin.passwordForm}
          passwordSaving={controller.admin.passwordSaving}
          currentUsuario={controller.profile.usuario}
          onSelect={controller.admin.setSelectedId}
          onPageChange={controller.admin.setPage}
          onStatusChange={controller.admin.setStatusFilter}
          onSearchChange={controller.admin.setSearch}
          onSortChange={controller.admin.setSort}
          onUpdateCategoryForm={controller.admin.updateCategoryForm}
          onCreateCategory={controller.admin.onCreateCategory}
          onDeactivateCategory={controller.admin.onDeactivateCategory}
          onUpdateDecisionForm={controller.admin.updateDecisionForm}
          onUpdatePedidoInfoForm={controller.admin.updatePedidoInfoForm}
          onDecision={controller.admin.onDecision}
          onPedidoInfo={controller.admin.onPedidoInfo}
          onLoadStats={controller.admin.onLoadStats}
          onDownloadAttachment={controller.admin.onDownloadAttachment}
          onDeleteAttachment={controller.admin.onDeleteAttachment}
          onDeleteSolicitacao={controller.admin.onDeleteSolicitacao}
          onUpdatePasswordForm={controller.admin.onUpdatePasswordForm}
          onSubmitPassword={controller.admin.onSubmitPassword}
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
