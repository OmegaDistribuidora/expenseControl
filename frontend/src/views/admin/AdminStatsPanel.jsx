import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, statusLabels } from "../format";

const formatAxisCurrency = (value) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

const formatLabel = (value) => {
  const text = String(value || "");
  if (text.length <= 16) return text;
  return `${text.slice(0, 14)}...`;
};

const statusChartLabels = {
  ...statusLabels,
  PENDENTE_INFO: "Ajustes",
};

const STATUS_ORDER = ["PENDENTE", "APROVADO", "REPROVADO", "PENDENTE_INFO"];
const STATUS_COLORS = ["#b36a1b", "#1d8a5b", "#c9463f", "#1b6aa6"];
const PIE_COLORS = ["#0b6e4f", "#1b6aa6", "#b36a1b", "#c9463f", "#6b5b44", "#1d8a5b"];

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{data.label}</div>
      <div className="chart-tooltip__row">
        <span>Valor aprovado</span>
        <span className="mono">{formatCurrency(data.valorTotal)}</span>
      </div>
      <div className="chart-tooltip__row">
        <span>Aprovações</span>
        <span>{data.total}</span>
      </div>
    </div>
  );
};

const StatusTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{data.label}</div>
      <div className="chart-tooltip__row">
        <span>Solicitações</span>
        <span>{data.total}</span>
      </div>
    </div>
  );
};

const formatPercent = (value, total) => {
  if (!total) return 0;
  return Math.round((value / total) * 100);
};

const resolveStatusKey = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value.toUpperCase();
  if (typeof value === "object") {
    if (typeof value.name === "string") return value.name.toUpperCase();
    if (typeof value.value === "string") return value.value.toUpperCase();
  }
  return null;
};

export const AdminStatsPanel = ({ stats, loading }) => {
  const totalAprovadas = stats?.totalAprovadas ?? 0;
  const valorTotalAprovado = stats?.valorTotalAprovado ?? 0;
  const categorias = Array.isArray(stats?.porCategoria) ? stats.porCategoria : [];
  const filiais = Array.isArray(stats?.porFilial) ? stats.porFilial : [];
  const statusResumo = Array.isArray(stats?.porStatus) ? stats.porStatus : [];

  const buildTop = (items, limit) => {
    const normalized = items
      .map((item) => ({
        label: item?.label || "Sem nome",
        total: Number(item?.total) || 0,
        valorTotal: Number(item?.valorTotal) || 0,
      }))
      .sort((a, b) => b.valorTotal - a.valorTotal);

    const top = normalized.slice(0, limit);
    const rest = normalized.slice(limit);
    if (rest.length > 0) {
      const restTotal = rest.reduce((sum, item) => sum + item.valorTotal, 0);
      const restCount = rest.reduce((sum, item) => sum + item.total, 0);
      top.push({ label: "Outros", total: restCount, valorTotal: restTotal });
    }
    return top;
  };

  const topCategorias = buildTop(categorias, 6);
  const topFiliais = buildTop(filiais, 5);
  const totalCategoriaValor = topCategorias.reduce((sum, item) => sum + item.valorTotal, 0);
  const totalFilialValor = topFiliais.reduce((sum, item) => sum + item.valorTotal, 0);
  const statusLookup = statusResumo.reduce((acc, item) => {
    const key = resolveStatusKey(item?.status);
    if (!key) return acc;
    acc[key] = Number(item?.total) || 0;
    return acc;
  }, {});

  if (!statusLookup.APROVADO && totalAprovadas > 0) {
    statusLookup.APROVADO = Number(totalAprovadas) || 0;
  }

  const statusData = STATUS_ORDER.map((status) => ({
    status,
    label: statusChartLabels[status] || status,
    total: Number(statusLookup[status]) || 0,
  }));

  const statusTotal = statusData.reduce((sum, item) => sum + item.total, 0);
  const ticketMedio = totalAprovadas > 0 ? valorTotalAprovado / totalAprovadas : 0;
  const topCategoria = topCategorias[0] || null;
  const topFilial = topFiliais[0] || null;
  const summaryCards = [
    {
      key: "valor-aprovado",
      title: "Valor aprovado",
      value: formatCurrency(valorTotalAprovado),
      meta: "Soma dos valores aprovados",
    },
    {
      key: "aprovadas",
      title: "Solicitações aprovadas",
      value: totalAprovadas,
      meta: "Total de solicitações aprovadas",
    },
    {
      key: "ticket-medio",
      title: "Ticket médio",
      value: formatCurrency(ticketMedio),
      meta: "Média por solicitação aprovada",
    },
    {
      key: "top-categoria",
      title: "Categoria com maior gasto",
      value: topCategoria?.label || "-",
      meta: topCategoria ? formatCurrency(topCategoria.valorTotal) : "-",
      valueClass: "stat-value--text",
    },
    {
      key: "top-filial",
      title: "Filial com maior gasto",
      value: topFilial?.label || "-",
      meta: topFilial ? formatCurrency(topFilial.valorTotal) : "-",
      valueClass: "stat-value--text",
    },
  ];

  return (
    <section className="panel panel--stats">
      <div className="panel__header">
        <div className="card-top">
          <h2 className="panel__title">Estatísticas</h2>
          <span className="small">{loading ? "Carregando..." : ""}</span>
        </div>
        <p className="panel__subtitle">Resumo das solicitações aprovadas.</p>
      </div>
      <div className="panel__content">
        {loading ? (
          <div className="skeleton-stack">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`stats-skeleton-${index}`} className="skeleton-card">
                <div className="skeleton-line w-60" />
                <div className="skeleton-line w-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="stats-grid">
            <ul className="cards stats-cards">
              {summaryCards.map((card) => (
                <li key={card.key} className="card-item card-item--static stats-card">
                  <div className="card-top">
                    <h3 className="card-title">{card.title}</h3>
                  </div>
                  <div className={`stat-value ${card.valueClass || ""}`}>{card.value}</div>
                  <div className="card-meta">{card.meta}</div>
                </li>
              ))}
            </ul>

            <div className="stats-charts">
              <div className="stats-section stats-section--chart">
                <div className="stats-section__header">
                  <h3 className="panel__title">Gastos por categoria</h3>
                  <span className="small">Valores aprovados</span>
                </div>
                {topCategorias.length === 0 ? (
                  <div className="list-empty">Sem dados para categorias.</div>
                ) : (
                  <>
                    <div className="chart-wrapper chart-wrapper--pie">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<ChartTooltip />} />
                          <Pie
                            data={topCategorias}
                            dataKey="valorTotal"
                            nameKey="label"
                            outerRadius={92}
                          >
                            {topCategorias.map((entry, index) => (
                              <Cell
                                key={`cell-${entry.label}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-legend">
                      {topCategorias.map((item, index) => (
                        <div key={`legend-cat-${item.label}`} className="legend-item">
                          <span
                            className="legend-dot"
                            style={{ "--legend-color": PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <div className="legend-text">
                            <span className="legend-label">{item.label}</span>
                            <span className="legend-meta">
                              {formatCurrency(item.valorTotal)} · {formatPercent(item.valorTotal, totalCategoriaValor)}%
                            </span>
                          </div>
                          <span className="legend-count">{item.total} aprov.</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="stats-section stats-section--chart">
                <div className="stats-section__header">
                  <h3 className="panel__title">Status das solicitações</h3>
                  <span className="small">Todas as solicitações</span>
                </div>
                <div className="chart-wrapper chart-wrapper--status">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 6, right: 16, left: 4, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "var(--muted)", fontSize: 12 }} />
                      <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} allowDecimals={false} />
                      <Tooltip content={<StatusTooltip />} />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} barSize={28}>
                        {statusData.map((item, index) => (
                          <Cell
                            key={`status-${item.status}`}
                            fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  {statusData.map((item, index) => (
                    <div key={`legend-status-${item.status}`} className="legend-item">
                      <span
                        className="legend-dot"
                        style={{ "--legend-color": STATUS_COLORS[index % STATUS_COLORS.length] }}
                      />
                      <div className="legend-text">
                        <span className="legend-label">{item.label}</span>
                        <span className="legend-meta">
                          {formatPercent(item.total, statusTotal)}% do total
                        </span>
                      </div>
                      <span className="legend-count">{item.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stats-section stats-section--chart stats-section--compact">
                <div className="stats-section__header">
                  <h3 className="panel__title">Gastos por filial</h3>
                  <span className="small">Valores aprovados</span>
                </div>
                {topFiliais.length === 0 ? (
                  <div className="list-empty">Sem dados para filiais.</div>
                ) : (
                  <>
                    <div className="chart-wrapper chart-wrapper--compact">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topFiliais}
                          layout="vertical"
                          margin={{ top: 6, right: 12, left: 8, bottom: 6 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            type="number"
                            tickFormatter={formatAxisCurrency}
                            tick={{ fill: "var(--muted)", fontSize: 11 }}
                          />
                          <YAxis
                            type="category"
                            dataKey="label"
                            width={96}
                            tickFormatter={formatLabel}
                            tick={{ fill: "var(--text)", fontSize: 11 }}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="valorTotal" fill="var(--accent)" radius={[6, 6, 6, 6]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-legend">
                      {topFiliais.map((item) => (
                        <div key={`legend-filial-${item.label}`} className="legend-item">
                          <span className="legend-dot" style={{ "--legend-color": "var(--accent)" }} />
                          <div className="legend-text">
                            <span className="legend-label">{item.label}</span>
                            <span className="legend-meta">
                              {formatCurrency(item.valorTotal)} · {formatPercent(item.valorTotal, totalFilialValor)}%
                            </span>
                          </div>
                          <span className="legend-count">{item.total} aprov.</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
