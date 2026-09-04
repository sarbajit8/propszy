import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL, withCredentials: true });

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Refresh-on-401 with a single-flight queue
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        accessToken = data.data.accessToken;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        accessToken = null;
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  }
);

export const unwrap = (p) => p.then((r) => r.data.data);
export const apiError = (e) =>
  (typeof e === 'string' && e) ||
  e?.response?.data?.error?.message ||
  e?.payload ||
  (typeof e?.message === 'string' && !e.message.startsWith('Request failed') && e.message) ||
  'Something went wrong';
