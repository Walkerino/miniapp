const isDev = import.meta.env.DEV;

const BASE_URL = isDev
  ? import.meta.env.VITE_API_URL || 'http://localhost:8080'
  : import.meta.env.VITE_API_URL || '';

export { BASE_URL };
