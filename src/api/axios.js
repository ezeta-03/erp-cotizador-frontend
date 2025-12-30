import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Interceptor para token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
