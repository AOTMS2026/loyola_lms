export const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000/api"
    : "https://loyola-lms.onrender.com/api");

export const fetchWithAuth = async <T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  let token = localStorage.getItem("access_token");

  // Set up headers
  const getHeaders = (t: string | null): Record<string, string> => {
    const h: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    // Only set Content-Type to application/json if body is NOT FormData
    if (!(options.body instanceof FormData)) {
      h["Content-Type"] = "application/json";
    }

    if (t) {
      h["Authorization"] = `Bearer ${t}`;
    }
    return h;
  };

  let res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: getHeaders(token),
  });

  // Handle token expiration specifically - ONLY 401 should trigger refresh
  if (res.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");
    if (refreshToken) {
      try {
        // Try to refresh the session locally via backend
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();

          // Save new tokens
          token = data.session.access_token;
          localStorage.setItem("access_token", token);
          if (data.session.refresh_token) {
            localStorage.setItem("refresh_token", data.session.refresh_token);
          }

          // Retry original request with fresh token
          res = await fetch(`${API_URL}${url}`, {
            ...options,
            headers: getHeaders(token),
          });
        } else {
          throw new Error("Refresh failed");
        }
      } catch (err) {
        console.warn("Failed to refresh token automatically", err);
        localStorage.clear();
        window.location.href = "/auth";
      }
    } else {
      console.warn("No refresh token found. Logging out legacy session.");
      localStorage.clear();
      window.location.href = "/auth";
    }
  }

  if (!res.ok) {
    let errStr = "API Request Failed";
    try {
      const err = await res.json();
      // Check for common error fields: 'error', 'message', or nested 'error.message'
      errStr =
        err.error || err.message || (err.data && err.data.message) || errStr;
    } catch {
      // Ignore if response is not JSON
    }
    throw new Error(errStr);
  }

  return res.json();
};