/**
 * Shared fixtures for common patterns across stories
 */

export const errorStates = {
  networkError: {
    error: "Network error: Failed to connect to API",
  },
  apiError: {
    error: "API error: Service returned 500 Internal Server Error",
  },
  unauthorized: {
    error: "Authentication error: Invalid API key or token",
  },
  notFound: {
    error: "Not found: The requested resource does not exist",
  },
};

export const loadingStates = {
  loading: {
    content: "Loading...",
  },
};
