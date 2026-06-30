'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { expensesAPI, categoriesAPI } from '../lib/api';



export default function ExpenseForm({ expense, onClose, users = null, defaultUserId = '' }) {
  const [categories, setCategories] = useState([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesAPI.getAll();
        setCategories(res.data.filter((c) => c.active));
      } catch {
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);
  const [form, setForm] = useState({
    amount: expense?.amount ?? '',
    category: expense?.category ?? '',
    description: expense?.description ?? '',
    date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : today,
    userId: expense?.user?._id ?? expense?.user ?? defaultUserId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (users && !form.userId) return setError('Please select a user');
    setLoading(true);
    try {
      const payload = { amount: form.amount, category: form.category, description: form.description, date: form.date };
      if (users && form.userId) payload.userId = form.userId;
      if (expense) {
        await expensesAPI.update(expense._id, payload);
        toast.success('Expense updated');
      } else {
        await expensesAPI.create(payload);
        toast.success('Expense added');
      }
      onClose(true);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.message
        || 'Failed to save expense';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{expense ? 'Edit Expense' : 'Add Expense'}</h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {users && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User *</label>
              <select name="userId" required value={form.userId} onChange={handleChange} className="input">
                <option value="">Select a user</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={handleChange}
              className="input"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select name="category" required value={form.category} onChange={handleChange} className="input">
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              name="date"
              type="date"
              required
              value={form.date}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              className="input resize-none"
              placeholder="Optional note…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => onClose(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : expense ? 'Update' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
