import { BadgeCheck, BarChart3, FileText, Tags } from "lucide-react";

export const AdminTabs = ({
  activeTab,
  onSolicitacoes,
  onAprovadas,
  onCategorias,
  onEstatisticas,
}) => {
  const isSolicitacoesTab = activeTab === "SOLICITACOES";
  const isAprovadasTab = activeTab === "APROVADAS";
  const isCategoriasTab = activeTab === "CATEGORIAS";
  const isEstatisticasTab = activeTab === "ESTATISTICAS";

  return (
    <div className="layout__tabs">
      <button
        className={`btn tab ${isSolicitacoesTab ? "is-active" : ""}`}
        type="button"
        onClick={onSolicitacoes}
      >
        <FileText className="tab__icon" aria-hidden="true" />
        Solicitacoes
      </button>
      <button
        className={`btn tab ${isAprovadasTab ? "is-active" : ""}`}
        type="button"
        onClick={onAprovadas}
      >
        <BadgeCheck className="tab__icon" aria-hidden="true" />
        Aprovadas
      </button>
      <button
        className={`btn tab ${isCategoriasTab ? "is-active" : ""}`}
        type="button"
        onClick={onCategorias}
      >
        <Tags className="tab__icon" aria-hidden="true" />
        Categorias
      </button>
      <button
        className={`btn tab ${isEstatisticasTab ? "is-active" : ""}`}
        type="button"
        onClick={onEstatisticas}
      >
        <BarChart3 className="tab__icon" aria-hidden="true" />
        Estatisticas
      </button>
    </div>
  );
};
