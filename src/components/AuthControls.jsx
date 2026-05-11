export default function AuthControls({
  user,
  needsFirstAdmin,
  onCreateFirstAdmin,
  onLogin,
  onRequestAccess,
  onAdmin,
  onLogout
}) {
  const isAdmin = user?.role === "admin";

  return (
    <section className="auth-controls" aria-label="Account controls">
      <div className="brand-lockup" aria-label="React Fashion Gallery">
        <strong>RFG</strong>
      </div>

      <nav className="site-nav" aria-label="Primary navigation">
        <a href="#gallery" aria-current="page">Gallery</a>
        <a href="#lookbook">Lookbook</a>
        <a href="#about">About</a>
      </nav>

      <div className="auth-actions">
        <div className="auth-user" aria-live="polite">
          <span>Access:</span>
          <strong>{user?.displayName || "Visitor"}</strong>
        </div>

        {needsFirstAdmin ? (
          <button className="button button-primary" type="button" onClick={onCreateFirstAdmin}>
            Create First Admin
          </button>
        ) : null}

        {!user && !needsFirstAdmin ? (
          <>
            <button className="button button-secondary" type="button" onClick={onLogin}>
              Login
            </button>
            <button className="button" type="button" onClick={onRequestAccess}>
              Request Access
            </button>
          </>
        ) : null}

        {isAdmin ? (
          <button className="button button-secondary" type="button" onClick={onAdmin}>
            Admin
          </button>
        ) : null}

        {user ? (
          <button className="button" type="button" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </div>
    </section>
  );
}
