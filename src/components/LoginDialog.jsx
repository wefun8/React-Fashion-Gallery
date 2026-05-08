import { useState } from "react";
import { apiPost } from "../lib/api.js";

export default function LoginDialog({ onClose, onSuccess }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await apiPost("/api/auth/login", form);
      onSuccess(data.user);
    } catch (apiError) {
      setError(apiError.message || "Unable to login.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="dialog-header">
          <p className="kicker">Member Entry</p>
          <h2 id="login-title">Login</h2>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
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
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="dialog-actions">
            <button className="text-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging In" : "Login"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
