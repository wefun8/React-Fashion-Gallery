export function LoadingState() {
  return (
    <main className="state-shell" aria-live="polite">
      <section className="state-panel">
        <p className="kicker">Loading</p>
        <h1>Preparing The Gallery</h1>
      </section>
    </main>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <main className="state-shell">
      <section className="state-panel">
        <p className="kicker">Error</p>
        <h1>Gallery Did Not Load</h1>
        <p>{message}</p>
        <button className="button button-primary" type="button" onClick={onRetry}>
          Try Again
        </button>
      </section>
    </main>
  );
}

export function EmptyState({ onReset }) {
  return (
    <section className="empty-state">
      <p className="kicker">No Matches</p>
      <h2>Nothing Fits These Filters</h2>
      <button className="button button-secondary" type="button" onClick={onReset}>
        Reset Filters
      </button>
    </section>
  );
}
