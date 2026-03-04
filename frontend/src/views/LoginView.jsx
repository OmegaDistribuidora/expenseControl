import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { NoticeView } from "./NoticeView";

export const LoginView = ({ form, onUpdateForm, onSubmit, loading, notice, onDismissNotice }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit} autoComplete="off">
        <span className="kicker">Expense Control</span>
        <h1 className="login-title">Bem-vindo</h1>
        <p className="login-subtitle">Entre com suas credenciais.</p>

        <div className="field">
          <label htmlFor="login-usuario">Usuario</label>
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

        <div className="field password-field">
          <label htmlFor="login-password">Senha</label>
          <div className="password-input-wrap">
            <input
              id="login-password"
              name="login_password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => onUpdateForm({ password: event.target.value })}
              required
              autoComplete="new-password"
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {notice && <NoticeView notice={notice} onDismiss={onDismissNotice} />}

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
};
