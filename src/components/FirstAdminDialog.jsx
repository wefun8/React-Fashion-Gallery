import { useState } from "react";
import { apiPost } from "../lib/api.js";

export default function FirstAdminDialog({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    ageConfirmed: false,
    rulesAccepted: false
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiPost("/api/setup/first-admin", form);
      onSuccess(data.user);
    } catch (apiError) {
      setError(apiError.message || "Unable to create admin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="first-admin-title">
        <div className="dialog-header">
          <p className="kicker">Setup</p>
          <h2 id="first-admin-title">Create First Admin</h2>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Display name</span>
            <input name="displayName" value={form.displayName} onChange={updateField} required />
          </label>

          <label className="field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={updateField} required />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              minLength={12}
              required
            />
          </label>

          <label className="check-field">
            <input
              name="ageConfirmed"
              type="checkbox"
              checked={form.ageConfirmed}
              onChange={updateField}
              required
            />
            <span>I confirm I am allowed to view this content.</span>
          </label>

          <label className="check-field">
            <input
              name="rulesAccepted"
              type="checkbox"
              checked={form.rulesAccepted}
              onChange={updateField}
              required
            />
            <span>I agree to follow the site rules.</span>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="dialog-actions">
            <button className="text-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating" : "Create Admin"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
