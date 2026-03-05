import { config } from '@/config/env';
import { supabase } from './supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function request(method, path, { body, headers = {}, isPublic = false } = {}) {
  const url = `${config.apiUrl}${path}`;
  const authHeaders = isPublic ? {} : await getAuthHeaders();

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  return res.json();
}

async function uploadFile(path, file, onProgress) {
  const url = `${config.apiUrl}${path}`;
  const authHeaders = await getAuthHeaders();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    Object.entries(authHeaders).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));

    const formData = new FormData();
    formData.append('image', file);
    xhr.send(formData);
  });
}

async function getBlob(path) {
  const url = `${config.apiUrl}${path}`;
  const authHeaders = await getAuthHeaders();

  const res = await fetch(url, {
    headers: { ...authHeaders },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch resource');
  }

  return res.blob();
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  put: (path, body, opts) => request('PUT', path, { body, ...opts }),
  delete: (path, opts) => request('DELETE', path, opts),
  upload: uploadFile,
  getBlob,
};

export default api;
