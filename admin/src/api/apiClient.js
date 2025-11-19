import axios from "axios";
import { logout } from "../store/Reducers/authSlice";
import { store } from "../store";

const apiClient = axios.create({
  baseURL: "https://e0cd3957-2063-4947-a171-91e5d2a75c0e-00-2juu5vlaver1i.sisko.replit.dev/api",
  mode: 'cors', // no-cors, *cors, same-origin
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = sessionStorage.getItem("token");
        const response = await axios.post("/auth/refresh-token", {
          refreshToken,
        });
        const { token } = response.data;

        sessionStorage.setItem("token", token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      console.error("API Error:", error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
      return Promise.reject({
        message: "No response received from the server.",
      });
    } else {
      console.error("Request setup error:", error.message);
      return Promise.reject({ message: "Error setting up the request." });
    }
  }
);

export default apiClient;