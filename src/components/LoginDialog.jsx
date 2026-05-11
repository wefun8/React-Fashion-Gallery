import { useState } from "react";
import { LockKeyhole, Mail, X } from "lucide-react";
import { apiPost } from "../lib/api.js";

export default function LoginDialog({ onClose, onSuccess, onRequestAccess }) {
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
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close login">
          <X aria-hidden="true" />
        </button>
        <div className="dialog-header">
          <h2 id="login-title">Login</h2>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <span className="input-with-icon">
              <Mail aria-hidden="true" />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="you@example.com"
                required
              />
            </span>
          </label>

          <label className="field">
            <span>Password</span>
            <span className="input-with-icon">
              <LockKeyhole aria-hidden="true" />
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="Password"
                required
              />
            </span>
          </label>

          <a className="forgot-link" href="#request-access" onClick={(event) => event.preventDefault()}>
            Forgot password?
          </a>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="dialog-actions">
            <button className="text-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging In" : "Login"}
            </button>
          </div>
          <p className="dialog-footnote">
            Don't have an account?{" "}
            <button type="button" onClick={onRequestAccess}>
              Request access
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
