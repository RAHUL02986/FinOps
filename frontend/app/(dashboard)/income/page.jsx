'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { incomeAPI } from '../../../lib/api';
import IncomeForm from '../../../components/IncomeForm';

const SOURCES = [
  'Salary', 'Freelance', 'Business', 'Investment',
  'Rental', 'Gift', 'Pension', 'Other',
];

const SOURCE_COLORS = {
  Salary: 'bg-green-100 text-green-800',
  Freelance: 'bg-blue-100 text-blue-800',
  Business: 'bg-purple-100 text-purple-800',
  Investment: 'bg-yellow-100 text-yellow-800',
  Rental: 'bg-teal-100 text-teal-800',
  Gift: 'bg-pink-100 text-pink-800',
  Pension: 'bg-orange-100 text-orange-800',
  Other: 'bg-gray-100 text-gray-700',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default function IncomePage() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ pages: 1, currentPage: 1 });
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', source: '', page: 1, limit: 10,
  });
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const fetchIncomes = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: filters.limit };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.source) params.source = filters.source;

      const res = await incomeAPI.getAll(params);
      setIncomes(res.data.data);
      setTotal(res.data.total);
      setPagination({ pages: res.data.pages, currentPage: res.data.currentPage });
    } catch {
      toast.error('Failed to load income entries');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchIncomes(); }, [fetchIncomes]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this income entry?')) return;
    try {
      await incomeAPI.remove(id);
      toast.success('Income deleted');
      fetchIncomes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete income');
    }
  };

  const handleFormClose = (changed) => {
    setShowForm(false);
    setEditItem(null);
    if (changed) fetchIncomes();
  };

  const clearFilters = () =>
    setFilters({ startDate: '', endDate: '', source: '', page: 1, limit: 10 });

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total entries</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Income
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
            <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilter('source', e.target.value)}
              className="input"
            >
              <option value="">All Sources</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
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
        ) : incomes.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No income entries found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Date', 'Source', 'Description', 'Amount', 'Actions'].map((h) => (
                    <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Amount' || h === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incomes.map((inc) => (
                  <tr key={inc._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{fmtDate(inc.date)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${SOURCE_COLORS[inc.source] || 'bg-gray-100 text-gray-700'}`}>
                        {inc.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{inc.description || '—'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600 whitespace-nowrap">
                      +{fmt(inc.amount)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setEditItem(inc); setShowForm(true); }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(inc._id)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

      {showForm && <IncomeForm income={editItem} onClose={handleFormClose} />}
    </div>
  );
}
