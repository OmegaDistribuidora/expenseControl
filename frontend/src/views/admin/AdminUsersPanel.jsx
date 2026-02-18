export const AdminUsersPanel = ({
  users,
  usersLoading,
  passwordForm,
  passwordSaving,
  currentUsuario,
  onUpdatePasswordForm,
  onSubmitPassword,
}) => {
  const isOwnUser = passwordForm.usuario === currentUsuario;

  return (
    <section className="panel panel--form panel--categories">
      <h2 className="panel__title">Usuários</h2>
      <p className="panel__subtitle">Altere senha de qualquer conta. Para sua própria conta, informe a senha atual.</p>

      <form onSubmit={onSubmitPassword}>
        <div className="field-row">
          <div className="field">
            <label>Usuário</label>
            <select
              value={passwordForm.usuario}
              onChange={(event) => onUpdatePasswordForm({ usuario: event.target.value })}
              disabled={usersLoading || passwordSaving}
              required
            >
              <option value="">Selecione</option>
              {users.map((user) => (
                <option key={user.usuario} value={user.usuario}>
                  {user.usuario} - {user.nome} ({user.tipo})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Nova senha</label>
            <input
              type="password"
              value={passwordForm.novaSenha}
              onChange={(event) => onUpdatePasswordForm({ novaSenha: event.target.value })}
              minLength={6}
              maxLength={120}
              required
              disabled={passwordSaving}
            />
          </div>
        </div>

        {isOwnUser && (
          <div className="field">
            <label>Senha atual</label>
            <input
              type="password"
              value={passwordForm.senhaAtual}
              onChange={(event) => onUpdatePasswordForm({ senhaAtual: event.target.value })}
              minLength={1}
              maxLength={120}
              required
              disabled={passwordSaving}
            />
          </div>
        )}

        <button className="btn btn--primary" type="submit" disabled={usersLoading || passwordSaving}>
          {passwordSaving ? "Alterando..." : "Alterar senha"}
        </button>
      </form>

      <div className="section-title">Contas disponíveis</div>
      {usersLoading ? (
        <div className="list-empty">Carregando usuários...</div>
      ) : users.length === 0 ? (
        <div className="list-empty">Nenhuma conta.</div>
      ) : (
        <ul className="cards cards--categories">
          {users.map((user) => (
            <li key={user.usuario} className="card-item card-item--static card-item--category">
              <div className="card-top">
                <h3 className="card-title">{user.nome}</h3>
                <div className="card-actions">
                  <span className="badge">{user.tipo}</span>
                  <span className="badge">{user.ativo ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
              <p className="card-meta">
                {user.usuario}
                {user.filial ? ` • ${user.filial}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
