import { useEffect, useRef, useState } from "react";
import { AdminCategoriesPanel } from "./admin/AdminCategoriesPanel.jsx";
import { AdminDetailPanel } from "./admin/AdminDetailPanel.jsx";
import { AdminSolicitacoesPanel } from "./admin/AdminSolicitacoesPanel.jsx";
import { AdminStatsPanel } from "./admin/AdminStatsPanel.jsx";
import { AdminTabs } from "./admin/AdminTabs.jsx";

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
}) => {
  const previousStatusRef = useRef(statusFilter);
  const [activeTab, setActiveTab] = useState(
    statusFilter === "APROVADO" ? "APROVADAS" : "SOLICITACOES",
  );
  const isSolicitacoesTab = activeTab === "SOLICITACOES";
  const isAprovadasTab = activeTab === "APROVADAS";
  const isCategoriasTab = activeTab === "CATEGORIAS";
  const isEstatisticasTab = activeTab === "ESTATISTICAS";
  const isRequestsTab = isSolicitacoesTab || isAprovadasTab;
  const layoutState = isEstatisticasTab
    ? "is-stats"
    : isRequestsTab
      ? "is-requests"
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

  useEffect(() => {
    if (isEstatisticasTab) {
      onLoadStats?.();
    }
  }, [isEstatisticasTab, onLoadStats]);

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

      {isRequestsTab && (
        <AdminDetailPanel
          selected={selected}
          isAprovadasTab={isAprovadasTab}
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
