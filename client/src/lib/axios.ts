import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Preserve form state if mid-form, then redirect
      const formState = collectFormState();
      if (formState) sessionStorage.setItem('pending_form', JSON.stringify(formState));
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login?expired=1';
    }
    return Promise.reject(err);
  }
);

function collectFormState() {
  const inputs = document.querySelectorAll('form input, form textarea, form select');
  if (!inputs.length) return null;
  const state: Record<string, string> = {};
  inputs.forEach((el) => {
    const input = el as HTMLInputElement;
    if (input.name) state[input.name] = input.value;
  });
  return Object.keys(state).length ? state : null;
}

export interface ApiErrorShape {
  message: string;
  field: string | null;
}

export function extractApiError(err: unknown, fallback = 'Something went wrong.'): ApiErrorShape {
  const e = err as { response?: { data?: { error?: { message?: string; field?: string | null } } } };
  return {
    message: e?.response?.data?.error?.message || fallback,
    field: e?.response?.data?.error?.field ?? null,
  };
}

export default api;
