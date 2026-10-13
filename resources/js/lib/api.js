import axios from 'axios';

// Empty when Laravel serves the app (same origin). Set VITE_API_BASE_URL for a separate API host.
const origin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const api = axios.create({
    baseURL: `${origin}/api`,
    withCredentials: true,
    withXSRFToken: true,
    headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
});

export function fetchCsrfCookie() {
    return axios.get(`${origin}/sanctum/csrf-cookie`, { withCredentials: true });
}

export class ApiError extends Error {
    constructor({ message, status = 0, errors = {}, code = null }) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
        this.code = code;
    }

    get isValidation() {
        return this.status === 422;
    }

    get isNetwork() {
        return this.status === 0;
    }
}

const FALLBACK_MESSAGES = {
    0: 'We could not reach the server. Check your connection and try again.',
    401: 'Your session has ended. Please sign in again.',
    403: 'You do not have permission to do that.',
    404: 'We could not find what you were looking for.',
    409: 'That action conflicts with the current state of this record.',
    419: 'Your session expired. Please try again.',
    422: 'Some of the information provided needs attention.',
    429: 'Too many requests. Please wait a moment and try again.',
};

export function toApiError(error) {
    if (error instanceof ApiError) {
        return error;
    }

    const response = error?.response;

    if (!response) {
        return new ApiError({ message: FALLBACK_MESSAGES[0], status: 0 });
    }

    const { status, data } = response;
    const errors = Object.fromEntries(
        Object.entries(data?.errors ?? {}).map(([field, messages]) => [field, [].concat(messages)[0]]),
    );

    // Never show a server's raw 5xx text to people.
    const message =
        status >= 500
            ? 'Something went wrong on our side. Please try again in a moment.'
            : status === 422 || status === 403 || status === 409 || status === 429
              ? data?.message || FALLBACK_MESSAGES[status]
              : FALLBACK_MESSAGES[status] || data?.message || 'The request could not be completed.';

    return new ApiError({ message, status, errors, code: data?.code ?? null });
}

let unauthorizedHandler = () => {};

export function onUnauthorized(handler) {
    unauthorizedHandler = handler;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { response, config } = error;

        // Stale CSRF token: fetch a fresh one and replay the request once.
        if (response?.status === 419 && config && !config.__retried) {
            config.__retried = true;
            await fetchCsrfCookie();
            delete config.headers['X-XSRF-TOKEN'];

            return api(config);
        }

        if (response?.status === 401 && !config?.skipUnauthorizedHandler) {
            unauthorizedHandler();
        }

        return Promise.reject(toApiError(error));
    },
);
