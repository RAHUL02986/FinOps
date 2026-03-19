'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';
import { expensesAPI } from '../../../lib/api';
import ExpenseForm from '../../../components/ExpenseForm';

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Housing', 'Entertainment',
  'Healthcare', 'Shopping', 'Education', 'Utilities', 'Travel', 'Other',
];

const CATEGORY_COLORS = {
  'Food & Dining': 'bg-orange-100 text-orange-800',
  Transportation: 'bg-blue-100 text-blue-800',
  Housing: 'bg-purple-100 text-purple-800',
  Entertainment: 'bg-pink-100 text-pink-800',
  Healthcare: 'bg-green-100 text-green-800',
  Shopping: 'bg-yellow-100 text-yellow-800',
  Education: 'bg-indigo-100 text-indigo-800',
  Utilities: 'bg-gray-100 text-gray-700',
  Travel: 'bg-teal-100 text-teal-800',
  Other: 'bg-red-100 text-red-800',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default function ExpensesPage() {
    const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ pages: 1, currentPage: 1 });
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', category: '', page: 1, limit: 10,
  });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.category) params.category = filters.category;

      const res = await expensesAPI.getAll(params);
      setExpenses(res.data.data);
      setTotal(res.data.total);
      setPagination({ pages: res.data.pages, currentPage: res.data.currentPage });
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expensesAPI.remove(id);
      toast.success('Expense deleted');
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  const handleFormClose = (changed) => {
    setShowForm(false);
    setEditItem(null);
    if (changed) fetchExpenses();
  };

  const clearFilters = () =>
    setFilters({ startDate: '', endDate: '', category: '', page: 1, limit: 10 });

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total entries</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilter('startDate', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilter('endDate', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilter('category', e.target.value)}
              className="input"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={clearFilters} className="btn-secondary w-full">Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            No expenses found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Category', 'Description', 'Amount', 'Actions'].map((h) => (
                    <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Amount' || h === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{fmtDate(exp.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${CATEGORY_COLORS[exp.category] || 'bg-gray-100 text-gray-700'}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{exp.description || '—'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-red-600 whitespace-nowrap">
                      -{fmt(exp.amount)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {!(user?.role === 'hr' && exp.approved) && (
                        <>
                          <button
                            onClick={() => { setEditItem(exp); setShowForm(true); }}
                            className="text-indigo-600 hover:text-indigo-800 font-medium mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(exp._id)}
                            className="text-red-500 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Page {pagination.currentPage} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                disabled={filters.page <= 1}
                className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                disabled={filters.page >= pagination.pages}
                className="btn-secondary px-3 py-1 text-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && <ExpenseForm expense={editItem} onClose={handleFormClose} />}
    </div>
  );
}
