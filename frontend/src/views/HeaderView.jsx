export const HeaderView = ({ profile, onLogout }) => {
  return (
    <header className="hero">
      <div>
        <span className="kicker">Expense Control</span>
        <h1 className="hero__title">Painel operacional</h1>
        <p className="hero__subtitle">
          {profile.tipo === "ADMIN" ? "Visão administrativa" : "Solicitações da filial"}
        </p>
      </div>
      <div className="hero__meta">
        <span className="meta-item">
          <span className="meta-label">Conta:</span>
          <span className="meta-value">{profile.nome}</span>
        </span>
        <span className="meta-item">
          <span className="meta-label">Perfil:</span>
          <span className="meta-value">{profile.tipo}</span>
        </span>
        {profile.filial && (
          <span className="meta-item">
            <span className="meta-label">Filial:</span>
            <span className="meta-value">{profile.filial}</span>
          </span>
        )}
      </div>
      <div className="hero__actions">
        <button className="btn btn--ghost" onClick={onLogout}>
          Sair
        </button>
      </div>
    </header>
  );
};
