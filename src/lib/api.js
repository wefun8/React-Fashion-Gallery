async function parseJson(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function buildApiError(response, data) {
  const message =
    data?.message || data?.error || `Request failed with ${response.status}`;
  const error = new Error(message);
  error.status = response.status;
  error.data = data;
  return error;
}

async function apiRequest(path, options = {}) {
  const { headers, ...requestOptions } = options;
  const response = await fetch(path, {
    credentials: "same-origin",
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...headers
    }
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw buildApiError(response, data);
  }

  return data;
}

export function apiGet(path) {
  return apiRequest(path, { method: "GET" });
}

export function apiPost(path, body = {}) {
  return apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}
