import { NoticeView } from "./NoticeView";

export const LoginView = ({ form, onUpdateForm, onSubmit, loading, notice, onDismissNotice }) => {
  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit} autoComplete="off">
        <span className="kicker">Expense Control</span>
        <h1 className="login-title">Bem-vindo</h1>
        <p className="login-subtitle">Entre com suas credenciais.</p>

        <div className="field">
          <label htmlFor="login-usuario">Usuário</label>
          <input
            id="login-usuario"
            name="login_usuario"
            type="text"
            value={form.usuario}
            onChange={(event) => onUpdateForm({ usuario: event.target.value })}
            required
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            name="login_password"
            type="password"
            value={form.password}
            onChange={(event) => onUpdateForm({ password: event.target.value })}
            required
            autoComplete="new-password"
          />
        </div>

        {notice && <NoticeView notice={notice} onDismiss={onDismissNotice} />}

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
};

