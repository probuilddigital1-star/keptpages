
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// Document-related functions
export const createDocument = async (docData, token) => {
  const { data } = await axios.post(`${API_URL}/invoices`, docData, getAuthHeaders(token));
  return data;
};

export const getDocuments = async (type = 'invoice', page = 1, limit = 10, token) => {
  const { data } = await axios.get(`${API_URL}/invoices`, {
    ...getAuthHeaders(token),
    params: { type, page, limit },
  });
  return data;
};

export const getDocument = async (id, token) => {
  const { data } = await axios.get(`${API_URL}/invoices/${id}`, getAuthHeaders(token));
  return data;
};

export const updateDocument = async (id, docData, token) => {
  const { data } = await axios.put(`${API_URL}/invoices/${id}`, docData, getAuthHeaders(token));
  return data;
};

export const generatePdf = async (id, template, token) => {
  const { data } = await axios.post(`${API_URL}/invoices/${id}/pdf`, { template }, {
    ...getAuthHeaders(token),
    responseType: 'blob',
  });
  return data;
};
