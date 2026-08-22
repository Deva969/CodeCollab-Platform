export const resolveApiUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const normalizedHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" ? hostname : hostname;

    if (configuredUrl) {
      try {
        const parsed = new URL(configuredUrl);
        const isLocalhostBacked = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(parsed.hostname);

        if (isLocalhostBacked) {
          const port = parsed.port || "5000";
          return `${protocol}//${normalizedHost}:${port}`;
        }

        return parsed.origin;
      } catch {
        return configuredUrl.replace(/\/$/, "");
      }
    }

    return `${protocol}//${normalizedHost}:5000`;
  }

  return configuredUrl ? configuredUrl.replace(/\/$/, "") : "http://localhost:5000";
};

export const resolveFrontendUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:5173";
};
