import { LogOut, Shield, Wallet } from "lucide-react";

export const HeaderView = ({ profile, onLogout }) => {
  const isAdmin = profile.tipo === "ADMIN";
  const subtitle = isAdmin ? "Visao administrativa" : "Solicitacoes da filial";
  const metaParts = [profile.nome, profile.tipo, profile.filial].filter(Boolean);
  const metaText = metaParts.join(" • ");

  return (
    <header className="hero hero--bar">
      <div className="hero__brand">
        <span className="hero__logo" aria-hidden="true">
          {isAdmin ? <Shield /> : <Wallet />}
        </span>
        <div>
          <span className="kicker">Expense Control</span>
          <h1 className="hero__title">Painel operacional</h1>
          <p className="hero__subtitle">{subtitle}</p>
          <p className="hero__meta-line">{metaText}</p>
        </div>
      </div>
      <div className="hero__actions">
        <button className="btn btn--ghost hero__logout" type="button" onClick={onLogout}>
          <LogOut className="btn__icon" aria-hidden="true" />
          Sair
        </button>
      </div>
    </header>
  );
};
