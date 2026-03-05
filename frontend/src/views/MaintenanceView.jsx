export const MaintenanceView = () => {
  return (
    <main className="maintenance-shell">
      <section className="maintenance-card">
        <img
          className="maintenance-image"
          src="/manutencao.png"
          alt="Sistema em manutencao"
        />
        <h1 className="maintenance-title">Sistema em manutencao</h1>
        <p className="maintenance-text">
          Voltamos ja ja. O sistema esta em manutencao para reparos.
        </p>
      </section>
    </main>
  );
};

