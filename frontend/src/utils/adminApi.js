import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://followuseverywhere-api.onrender.com/api';

const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

adminApi.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('adminToken');
  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
  }
  return config;
});

export const adminLogin = async (email, password) => {
  const response = await adminApi.post('/admin/auth/login', { email, password });
  return response.data;
};

export const fetchBusinesses = async () => {
  const response = await adminApi.get('/admin/businesses');
  return response.data;
};

export const fetchBusiness = async (businessId) => {
  const response = await adminApi.get(`/admin/businesses/${businessId}`);
  return response.data;
};

export const approveBusiness = async (businessId) => {
  const response = await adminApi.put(`/admin/businesses/${businessId}/approve`);
  return response.data;
};

export const blockBusiness = async (businessId) => {
  const response = await adminApi.put(`/admin/businesses/${businessId}/block`);
  return response.data;
};

export const fetchAdmins = async () => {
  const response = await adminApi.get('/admin/admins');
  return response.data;
};

export const createAdmin = async (payload) => {
  const response = await adminApi.post('/admin/admins', payload);
  return response.data;
};

export default adminApi;
