import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api.js";

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function AdminRequestsPanel({ onClose }) {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const data = await apiGet("/api/admin/account-requests");
      setRequests(data.requests || []);
      setStatus("ready");
    } catch (apiError) {
      setError(apiError.message || "Unable to load requests.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function approveRequest(request) {
    const password = window.prompt(`Initial password for ${request.displayName}`);
    if (!password) {
      return;
    }

    try {
      setError("");
      await apiPost(`/api/admin/account-requests/${request.id}/approve`, { password });
      await loadRequests();
    } catch (apiError) {
      setError(apiError.message || "Unable to approve request.");
    }
  }

  async function rejectRequest(request) {
    const adminNote = window.prompt(`Optional rejection note for ${request.displayName}`);
    if (adminNote === null) {
      return;
    }

    try {
      setError("");
      await apiPost(`/api/admin/account-requests/${request.id}/reject`, { adminNote });
      await loadRequests();
    } catch (apiError) {
      setError(apiError.message || "Unable to reject request.");
    }
  }

  return (
    <section className="admin-panel" aria-label="Admin account requests">
      <div className="admin-panel-header">
        <div>
          <p className="kicker">Admin</p>
          <h2>Account Requests</h2>
        </div>
        <button className="text-button" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      {status === "loading" ? <p className="admin-note">Loading requests.</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {status === "ready" && requests.length === 0 ? (
        <p className="admin-note">No account requests waiting.</p>
      ) : null}

      <div className="request-list">
        {requests.map((request) => (
          <article className="request-card" key={request.id}>
            <div>
              <h3>{request.displayName}</h3>
              <p>{request.email}</p>
              <p>{request.contact}</p>
              <p>{request.reason}</p>
              <strong className={`request-status request-status-${request.status}`}>
                {request.status}
              </strong>
              <small>{formatDate(request.createdAt)}</small>
            </div>
            {request.status === "pending" ? (
              <div className="request-actions">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => approveRequest(request)}
                >
                  Approve
                </button>
                <button className="button" type="button" onClick={() => rejectRequest(request)}>
                  Reject
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
