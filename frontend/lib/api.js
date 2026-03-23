// ── Categories ─────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global 401 handler → redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  getMe: () => api.get('/auth/me'),
};

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expensesAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id) => api.delete(`/expenses/${id}`),
};

// ── Income ────────────────────────────────────────────────────────────────────
export const incomeAPI = {
  getAll: (params) => api.get('/income', { params }),
  create: (data) => api.post('/income', data),
  update: (id, data) => api.put(`/income/${id}`, data),
  remove: (id) => api.delete(`/income/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getSummary: (params) => api.get('/dashboard/summary', { params }),
  getChartData: (params) => api.get('/dashboard/chart', { params }),
};

// ── Users (Super Admin) ───────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
};

// Removed inventoryAPI

// ── Teams ─────────────────────────────────────────────────────────────────────
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  remove: (id) => api.delete(`/teams/${id}`),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getOne: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
  send: (id, data) => api.post(`/invoices/${id}/send`, data ?? {}),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/invoices/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// ── Notifications ─────────────────────────────────────────────────────────────
// Types: invoice_reminder, payroll_notification, expense_alert, transaction_created, transaction_approved, transaction_rejected
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ── Proposals ─────────────────────────────────────────────────────────────────
export const proposalsAPI = {
  getAll: (params) => api.get('/proposals', { params }),
  getOne: (id) => api.get(`/proposals/${id}`),
  create: (data) => api.post('/proposals', data),
  update: (id, data) => api.put(`/proposals/${id}`, data),
  remove: (id) => api.delete(`/proposals/${id}`),
  send: (id, data) => api.post(`/proposals/${id}/send`, data ?? {}),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/proposals/upload-logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Templates
  getTemplates: () => api.get('/proposals/templates'),
  createTemplate: (data) => api.post('/proposals/templates', data),
  updateTemplate: (id, data) => api.put(`/proposals/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/proposals/templates/${id}`),
};

// ── Settings (SMTP) ───────────────────────────────────────────────────────────
export const settingsAPI = {
  getSmtp: () => api.get('/settings/smtp'),
  updateSmtp: (type, data) => api.put(`/settings/smtp/${type}`, data),
  testSmtp: (type) => api.post(`/settings/smtp/test/${type}`),
};

// ── Recurring Expenses ────────────────────────────────────────────────────────
export const recurringExpensesAPI = {
  getAll: (params) => api.get('/recurring-expenses', { params }),
  create: (data) => api.post('/recurring-expenses', data),
  update: (id, data) => api.put(`/recurring-expenses/${id}`, data),
  remove: (id) => api.delete(`/recurring-expenses/${id}`),
  markPaid: (id, data) => api.post(`/recurring-expenses/${id}/mark-paid`, data),
  getHistory: (id) => api.get(`/recurring-expenses/${id}/history`),
};

// ── Accounts ──────────────────────────────────────────────────────────────────
export const accountsAPI = {
  getAll: (params) => api.get('/accounts', { params }),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  remove: (id) => api.delete(`/accounts/${id}`),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollAPI = {
  getRuns: () => api.get('/payroll/runs'),
  createRun: (data) => api.post('/payroll/runs', data),
  completeRun: (id) => api.post(`/payroll/runs/${id}/complete`),
  deleteRun: (id) => api.delete(`/payroll/runs/${id}`),
  emailSlips: (id) => api.post(`/payroll/runs/${id}/email-slips`),
  getSlips: (params) => api.get('/payroll/slips', { params }),
  updateSlip: (id, data) => api.put(`/payroll/slips/${id}`, data),
  createSlip: (data) => api.post('/payroll/slips', data),
};

// ── Goals ─────────────────────────────────────────────────────────────────────
export const goalsAPI = {
  getAll: (params) => api.get('/goals', { params }),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  remove: (id) => api.delete(`/goals/${id}`),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportsAPI = {
  spendingByCategory: (params) => api.get('/reports/spending-by-category', { params }),
  monthlyTrends: () => api.get('/reports/monthly-trends'),
  summary: () => api.get('/reports/summary'),
};

// File base URL (strip /api suffix)
export const FILE_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  remove: (id) => api.delete(`/transactions/${id}`),
};

export default api;
