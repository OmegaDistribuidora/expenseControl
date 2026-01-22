export const AdminCategoriesPanel = ({
  categories,
  categoryForm,
  categorySaving,
  onUpdateCategoryForm,
  onCreateCategory,
  onDeactivateCategory,
}) => {
  return (
    <section className="panel panel--form panel--categories">
      <h2 className="panel__title">Categorias</h2>
      <p className="panel__subtitle">Gerencie categorias da empresa.</p>

      <form onSubmit={onCreateCategory}>
        <div className="field-row">
          <div className="field">
            <label>Nome</label>
            <input
              value={categoryForm.nome}
              onChange={(event) => onUpdateCategoryForm({ nome: event.target.value })}
              required
              maxLength={120}
              disabled={categorySaving}
            />
          </div>
          <div className="field">
            <label>Descricao</label>
            <input
              value={categoryForm.descricao}
              onChange={(event) => onUpdateCategoryForm({ descricao: event.target.value })}
              maxLength={255}
              disabled={categorySaving}
            />
          </div>
        </div>
        <button className="btn btn--primary" type="submit" disabled={categorySaving}>
          {categorySaving ? "Salvando..." : "Criar categoria"}
        </button>
      </form>

      <div className="section-title">Lista de categorias</div>
      {categories.length === 0 ? (
        <div className="list-empty">Nenhuma categoria.</div>
      ) : (
        <ul className="cards cards--categories">
          {categories.map((cat) => (
            <li key={cat.id} className="card-item card-item--static card-item--category">
              <div className="card-top">
                <h3 className="card-title">{cat.nome}</h3>
                <div className="card-actions">
                  <span className="badge">{cat.ativa ? "Ativa" : "Inativa"}</span>
                  {cat.ativa && (
                    <button
                      className="btn btn--danger btn--sm"
                      type="button"
                      onClick={() => onDeactivateCategory(cat)}
                      disabled={categorySaving}
                    >
                      Inativar
                    </button>
                  )}
                </div>
              </div>
              <p className="card-meta">{cat.descricao || "-"}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
