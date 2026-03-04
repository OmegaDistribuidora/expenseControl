export const AdminUsersPanel = ({
  users,
  filiaisDisponiveis,
  usersLoading,
  passwordForm,
  passwordSaving,
  createUserForm,
  createUserSaving,
  currentUsuario,
  isRootAdmin,
  onUpdatePasswordForm,
  onSubmitPassword,
  onUpdateCreateUserForm,
  onCreateUser,
}) => {
  const isOwnUser = passwordForm.usuario === currentUsuario;
  const passwordUsers = isRootAdmin
    ? users
    : users.filter((user) => user.usuario === currentUsuario);

  const handleToggleFilial = (filial, checked) => {
    const atual = Array.isArray(createUserForm.filiaisVisiveis) ? createUserForm.filiaisVisiveis : [];
    const next = checked ? [...new Set([...atual, filial])] : atual.filter((item) => item !== filial);
    onUpdateCreateUserForm({ filiaisVisiveis: next });
  };

  return (
    <section className="panel panel--form panel--categories">
      <h2 className="panel__title">Usuarios</h2>
      <p className="panel__subtitle">Gerencie contas, permissoes de visibilidade e senha.</p>

      {isRootAdmin && (
        <>
          <div className="section-title">Criar usuario</div>
          <form onSubmit={onCreateUser}>
            <div className="field-row">
              <div className="field">
                <label>Usuario</label>
                <input
                  type="text"
                  value={createUserForm.usuario}
                  onChange={(event) => onUpdateCreateUserForm({ usuario: event.target.value })}
                  maxLength={120}
                  required
                  disabled={createUserSaving}
                />
              </div>

              <div className="field">
                <label>Nome</label>
                <input
                  type="text"
                  value={createUserForm.nome}
                  onChange={(event) => onUpdateCreateUserForm({ nome: event.target.value })}
                  maxLength={120}
                  required
                  disabled={createUserSaving}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Senha inicial</label>
                <input
                  type="password"
                  value={createUserForm.senha}
                  onChange={(event) => onUpdateCreateUserForm({ senha: event.target.value })}
                  minLength={6}
                  maxLength={120}
                  required
                  disabled={createUserSaving}
                />
              </div>

              <div className="field">
                <label>Poder de aprovar/revisar</label>
                <div className="actions">
                  <label className="small">
                    <input
                      type="checkbox"
                      checked={Boolean(createUserForm.podeAprovarSolicitacao)}
                      onChange={(event) =>
                        onUpdateCreateUserForm({ podeAprovarSolicitacao: event.target.checked })
                      }
                      disabled={createUserSaving}
                    />{" "}
                    Pode aprovar e solicitar revisao
                  </label>
                </div>
              </div>
            </div>

            <div className="field">
              <label>Filiais visiveis</label>
              {filiaisDisponiveis.length === 0 ? (
                <p className="small">Nenhuma filial cadastrada.</p>
              ) : (
                <div className="actions">
                  {filiaisDisponiveis.map((filial) => (
                    <label key={filial} className="small">
                      <input
                        type="checkbox"
                        checked={(createUserForm.filiaisVisiveis || []).includes(filial)}
                        onChange={(event) => handleToggleFilial(filial, event.target.checked)}
                        disabled={createUserSaving}
                      />{" "}
                      {filial}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn--primary" type="submit" disabled={createUserSaving || usersLoading}>
              {createUserSaving ? "Criando..." : "Criar usuario"}
            </button>
          </form>
        </>
      )}

      <div className="section-title">Alterar senha</div>
      <form onSubmit={onSubmitPassword}>
        <div className="field-row">
          <div className="field">
            <label>Usuario</label>
            <select
              value={passwordForm.usuario}
              onChange={(event) => onUpdatePasswordForm({ usuario: event.target.value })}
              disabled={usersLoading || passwordSaving}
              required
            >
              <option value="">Selecione</option>
              {passwordUsers.map((user) => (
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

      <div className="section-title">Contas disponiveis</div>
      {usersLoading ? (
        <div className="list-empty">Carregando usuarios...</div>
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
                  {user.superAdmin && <span className="badge">Admin raiz</span>}
                </div>
              </div>
              <p className="card-meta">
                {user.usuario}
                {user.filial ? ` • ${user.filial}` : ""}
              </p>
              <p className="card-meta">
                {user.podeAprovarSolicitacao ? "Pode aprovar/revisar" : "Somente visualizacao"}
              </p>
              {Array.isArray(user.filiaisVisiveis) && user.filiaisVisiveis.length > 0 && (
                <p className="card-meta">Filiais: {user.filiaisVisiveis.join(", ")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
