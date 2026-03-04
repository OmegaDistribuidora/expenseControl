import { useEffect, useRef, useState } from "react";
import { AdminCategoriesPanel } from "./admin/AdminCategoriesPanel.jsx";
import { AdminAuditPanel } from "./admin/AdminAuditPanel.jsx";
import { AdminDetailPanel } from "./admin/AdminDetailPanel.jsx";
import { AdminSolicitacoesPanel } from "./admin/AdminSolicitacoesPanel.jsx";
import { AdminStatsPanel } from "./admin/AdminStatsPanel.jsx";
import { AdminTabs } from "./admin/AdminTabs.jsx";
import { AdminUsersPanel } from "./admin/AdminUsersPanel.jsx";

export const AdminView = ({
  categories,
  solicitacoes,
  solicitacoesTotal,
  page,
  totalPages,
  selectedId,
  selected,
  statusFilter,
  categoryForm,
  decisionForm,
  pedidoInfoForm,
  loading,
  categorySaving,
  decisionLoading,
  pedidoInfoLoading,
  deleteLoading,
  stats,
  statsLoading,
  attachments,
  attachmentsLoading,
  search,
  sort,
  users,
  filiaisDisponiveis,
  usersLoading,
  auditEvents,
  auditLoading,
  auditPage,
  auditTotalPages,
  auditTotal,
  auditSearch,
  passwordForm,
  passwordSaving,
  createUserForm,
  createUserSaving,
  currentUsuario,
  canApproveSolicitacao,
  isRootAdmin,
  onSelect,
  onPageChange,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onUpdateCategoryForm,
  onCreateCategory,
  onDeactivateCategory,
  onUpdateDecisionForm,
  onUpdatePedidoInfoForm,
  onDecision,
  onPedidoInfo,
  onDeleteSolicitacao,
  onLoadStats,
  onDownloadAttachment,
  onDeleteAttachment,
  onUpdatePasswordForm,
  onSubmitPassword,
  onUpdateCreateUserForm,
  onCreateUser,
  onAuditPageChange,
  onAuditSearchChange,
  onLoadAudit,
}) => {
  const previousStatusRef = useRef(statusFilter);
  const [activeTab, setActiveTab] = useState(
    statusFilter === "APROVADO" ? "APROVADAS" : "SOLICITACOES",
  );
  const isSolicitacoesTab = activeTab === "SOLICITACOES";
  const isAprovadasTab = activeTab === "APROVADAS";
  const isCategoriasTab = activeTab === "CATEGORIAS";
  const isEstatisticasTab = activeTab === "ESTATISTICAS";
  const isUsuariosTab = activeTab === "USUARIOS";
  const isAuditoriaTab = activeTab === "AUDITORIA";
  const isRequestsTab = isSolicitacoesTab || isAprovadasTab;
  const layoutState = isEstatisticasTab
    ? "is-stats"
    : isRequestsTab
      ? "is-requests"
      : isUsuariosTab
        ? "is-users"
        : isAuditoriaTab
          ? "is-audit"
        : "is-categories";

  const handleStatusChange = (nextStatus) => {
    previousStatusRef.current = nextStatus;
    onStatusChange(nextStatus);
  };

  const handleSolicitacoesTab = () => {
    setActiveTab("SOLICITACOES");
    onStatusChange(previousStatusRef.current || "PENDENTE");
  };

  const handleAprovadasTab = () => {
    setActiveTab("APROVADAS");
    onStatusChange("APROVADO");
  };

  const handleCategoriasTab = () => {
    setActiveTab("CATEGORIAS");
  };

  const handleEstatisticasTab = () => {
    setActiveTab("ESTATISTICAS");
  };

  const handleUsuariosTab = () => {
    setActiveTab("USUARIOS");
  };

  const handleAuditoriaTab = () => {
    setActiveTab("AUDITORIA");
  };

  useEffect(() => {
    if (isEstatisticasTab) {
      onLoadStats?.(true);
    }
  }, [isEstatisticasTab, onLoadStats]);

  useEffect(() => {
    if (!isEstatisticasTab) return undefined;
    const refreshId = setInterval(() => {
      onLoadStats?.(true);
    }, 30000);
    return () => clearInterval(refreshId);
  }, [isEstatisticasTab, onLoadStats]);

  useEffect(() => {
    if (!isAuditoriaTab) return undefined;
    onLoadAudit?.(true);
    const refreshId = setInterval(() => {
      onLoadAudit?.(true);
    }, 30000);
    return () => clearInterval(refreshId);
  }, [isAuditoriaTab, onLoadAudit]);

  return (
    <main
      className={`layout layout--admin ${layoutState} is-compact`}
    >
      <AdminTabs
        activeTab={activeTab}
        onSolicitacoes={handleSolicitacoesTab}
        onAprovadas={handleAprovadasTab}
        onCategorias={handleCategoriasTab}
        onEstatisticas={handleEstatisticasTab}
        onUsuarios={handleUsuariosTab}
        onAuditoria={handleAuditoriaTab}
      />

      {isCategoriasTab && (
        <AdminCategoriesPanel
          categories={categories}
          categoryForm={categoryForm}
          categorySaving={categorySaving}
          onUpdateCategoryForm={onUpdateCategoryForm}
          onCreateCategory={onCreateCategory}
          onDeactivateCategory={onDeactivateCategory}
        />
      )}

      {isRequestsTab && (
        <AdminSolicitacoesPanel
          solicitacoes={solicitacoes}
          solicitacoesTotal={solicitacoesTotal}
          loading={loading}
          page={page}
          totalPages={totalPages}
          selectedId={selectedId}
          statusFilter={statusFilter}
          search={search}
          sort={sort}
          isSolicitacoesTab={isSolicitacoesTab}
          isAprovadasTab={isAprovadasTab}
          onSelect={onSelect}
          onPageChange={onPageChange}
          onStatusChange={handleStatusChange}
          onSearchChange={onSearchChange}
          onSortChange={onSortChange}
        />
      )}

      {isEstatisticasTab && <AdminStatsPanel stats={stats} loading={statsLoading} />}

      {isUsuariosTab && (
        <AdminUsersPanel
          users={users}
          filiaisDisponiveis={filiaisDisponiveis}
          usersLoading={usersLoading}
          passwordForm={passwordForm}
          passwordSaving={passwordSaving}
          createUserForm={createUserForm}
          createUserSaving={createUserSaving}
          currentUsuario={currentUsuario}
          isRootAdmin={isRootAdmin}
          onUpdatePasswordForm={onUpdatePasswordForm}
          onSubmitPassword={onSubmitPassword}
          onUpdateCreateUserForm={onUpdateCreateUserForm}
          onCreateUser={onCreateUser}
        />
      )}

      {isAuditoriaTab && (
        <AdminAuditPanel
          events={auditEvents}
          loading={auditLoading}
          page={auditPage}
          totalPages={auditTotalPages}
          total={auditTotal}
          search={auditSearch}
          onSearchChange={onAuditSearchChange}
          onPageChange={onAuditPageChange}
          onRefresh={onLoadAudit}
        />
      )}

      {isRequestsTab && (
        <AdminDetailPanel
          selected={selected}
          isAprovadasTab={isAprovadasTab}
          canApproveSolicitacao={canApproveSolicitacao}
          decisionForm={decisionForm}
          pedidoInfoForm={pedidoInfoForm}
          decisionLoading={decisionLoading}
          pedidoInfoLoading={pedidoInfoLoading}
          deleteLoading={deleteLoading}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          onUpdateDecisionForm={onUpdateDecisionForm}
          onUpdatePedidoInfoForm={onUpdatePedidoInfoForm}
          onDecision={onDecision}
          onPedidoInfo={onPedidoInfo}
          onDeleteSolicitacao={onDeleteSolicitacao}
          onDownloadAttachment={onDownloadAttachment}
          onDeleteAttachment={onDeleteAttachment}
        />
      )}
    </main>
  );
};
