export default function AgeGate({ notice, onConfirm }) {
  return (
    <main className="age-gate">
      <section className="age-card" aria-labelledby="age-gate-title">
        <p className="kicker">Private Preview</p>
        <h1 id="age-gate-title">Neo Pop Lookbook</h1>
        <p className="age-copy">{notice}</p>
        <button className="button button-primary" type="button" onClick={onConfirm}>
          I Confirm
        </button>
      </section>
    </main>
  );
}
