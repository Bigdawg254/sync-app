import { storage } from '../app/storage';
import { API } from '../constants/config';

const getHeaders = async (includeAuth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = await storage.get('userToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const apiCall = async (endpoint, options = {}) => {
  const headers = await getHeaders(options.auth !== false);
  const res = await fetch(`${API}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return handleResponse(res);
};