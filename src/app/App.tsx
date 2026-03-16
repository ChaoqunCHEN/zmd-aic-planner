export function App() {
  return (
    <main className="app-shell" data-state="ready" data-testid="app-shell">
      <header className="hero-panel">
        <p className="eyebrow" data-testid="unofficial-label">
          Unofficial Arknights: Endfield project
        </p>
        <h1>AIC Planner</h1>
        <p className="hero-copy">
          Draft factory layouts faster than the in-game builder with a desktop-first
          planning workbench.
        </p>
      </header>

      <section className="workbench-frame" aria-label="Planner workbench" data-testid="empty-workbench">
        <div className="workbench-grid" aria-hidden="true" />
        <div className="workbench-card">
          <h2>Workbench coming online</h2>
          <p>
            Task 0 establishes the shell, test harness, and startup contracts for the
            full planner workspace.
          </p>
        </div>
      </section>
    </main>
  );
}
