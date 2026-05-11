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

  const counts = requests.reduce(
    (result, request) => {
      result.all += 1;
      result[request.status] = (result[request.status] || 0) + 1;
      return result;
    },
    { all: 0, pending: 0, approved: 0, rejected: 0 }
  );

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
        <strong>Admin Panel</strong>
        <button className="panel-close" type="button" onClick={onClose} aria-label="Close admin panel">
          x
        </button>
      </div>
      <div className="admin-panel-body">
        <div>
          <h2>Account Requests</h2>
        </div>

        <div className="admin-tabs" aria-label="Request status summary">
          <span>All ({counts.all})</span>
          <span>Pending ({counts.pending})</span>
          <span>Approved ({counts.approved})</span>
          <span>Rejected ({counts.rejected})</span>
        </div>

        {status === "loading" ? <p className="admin-note">Loading requests.</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        {status === "ready" && requests.length === 0 ? (
          <p className="admin-note">No account requests waiting.</p>
        ) : null}

        <div className="request-list">
          {requests.map((request) => (
            <article className="request-card" key={request.id}>
              <div className="request-avatar" aria-hidden="true">
                {request.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div className="request-main">
                <h3>{request.email}</h3>
                <p>{request.displayName}</p>
                <small>Requested {formatDate(request.createdAt)}</small>
              </div>
              <div className="request-side">
                <strong className={`request-status request-status-${request.status}`}>
                  {request.status}
                </strong>
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
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
