import { useState } from "react";
import { apiPost } from "../lib/api.js";

const INITIAL_FORM = {
  displayName: "",
  email: "",
  contact: "",
  reason: "",
  ageConfirmed: false,
  rulesAccepted: false
};

export default function RequestAccessDialog({ onClose }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await apiPost("/api/account-requests", form);
      setForm(INITIAL_FORM);
      setSuccess("Request submitted.");
    } catch (apiError) {
      setError(apiError.message || "Unable to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="request-title">
        <div className="dialog-header">
          <p className="kicker">Visitor Queue</p>
          <h2 id="request-title">Request Access</h2>
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
            <span>Contact</span>
            <input name="contact" value={form.contact} onChange={updateField} required />
          </label>

          <label className="field">
            <span>Reason</span>
            <textarea name="reason" value={form.reason} onChange={updateField} required />
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
          {success ? <p className="form-success">{success}</p> : null}

          <div className="dialog-actions">
            <button className="text-button" type="button" onClick={onClose}>
              Close
            </button>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending" : "Submit Request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
