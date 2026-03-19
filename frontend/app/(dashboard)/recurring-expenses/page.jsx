'use client';
import { useState, useEffect } from 'react';
import { recurringExpensesAPI } from '../../../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food & Dining', 'Transportation', 'Housing', 'Entertainment', 'Healthcare', 'Shopping', 'Education', 'Utilities', 'Travel', 'Subscriptions', 'Insurance', 'Rent', 'Salaries', 'Other'];
const FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'yearly', 'custom'];
const STATUS_COLORS = { active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', archived: 'bg-gray-100 text-gray-700' };

export default function RecurringExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Other', description: '', frequency: 'monthly', customDays: '', nextDueDate: '', reminderDaysBefore: 3, status: 'active', autoCreateTransaction: false });

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); try { const r = await recurringExpensesAPI.getAll(); setExpenses(r.data); } catch { toast.error('Failed to load'); } setLoading(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await recurringExpensesAPI.update(editingId, form); toast.success('Updated'); }
      else { await recurringExpensesAPI.create(form); toast.success('Created'); }
      setShowForm(false); setEditingId(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleMarkPaid = async (id) => {
    try { await recurringExpensesAPI.markPaid(id); toast.success('Marked as paid'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    try { await recurringExpensesAPI.remove(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const handleEdit = (e) => {
    setForm({ title: e.title, amount: e.amount, category: e.category, description: e.description || '', frequency: e.frequency, customDays: e.customDays || '', nextDueDate: new Date(e.nextDueDate).toISOString().split('T')[0], reminderDaysBefore: e.reminderDaysBefore || 3, status: e.status, autoCreateTransaction: e.autoCreateTransaction || false });
    setEditingId(e._id); setShowForm(true);
  };

  const isOverdue = (d) => new Date(d) < new Date();
  const isUpcoming = (d) => { const diff = (new Date(d) - new Date()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 7; };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Recurring Expenses</h1><p className="text-gray-500 text-sm mt-1">Manage automated recurring payments and reminders</p></div>
        <button onClick={() => { setForm({ title: '', amount: '', category: 'Other', description: '', frequency: 'monthly', customDays: '', nextDueDate: '', reminderDaysBefore: 3, status: 'active', autoCreateTransaction: false }); setEditingId(null); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Recurring</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-green-600">{expenses.filter(e => e.status === 'active').length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Overdue</p><p className="text-2xl font-bold text-red-600">{expenses.filter(e => e.status === 'active' && isOverdue(e.nextDueDate)).length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Due in 7 days</p><p className="text-2xl font-bold text-yellow-600">{expenses.filter(e => e.status === 'active' && isUpcoming(e.nextDueDate)).length}</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">{editingId ? 'Edit' : 'New'} Recurring Expense</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label><input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label><select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">{FREQUENCIES.map(f => <option key={f}>{f}</option>)}</select></div>
            {form.frequency === 'custom' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Custom Days</label><input type="number" min="1" value={form.customDays} onChange={e => setForm({ ...form, customDays: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>}
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date *</label><input type="date" required value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Reminder Days Before</label><input type="number" min="0" value={form.reminderDaysBefore} onChange={e => setForm({ ...form, reminderDaysBefore: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border"><div className="text-5xl mb-4">🔄</div><h3 className="text-lg font-semibold text-gray-700">No recurring expenses</h3></div>
        ) : expenses.map(e => (
          <div key={e._id} className={`bg-white rounded-xl border p-4 hover:shadow-sm transition ${isOverdue(e.nextDueDate) && e.status === 'active' ? 'border-red-300 bg-red-50' : isUpcoming(e.nextDueDate) && e.status === 'active' ? 'border-yellow-300 bg-yellow-50' : ''}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{e.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status]}`}>{e.status}</span>
                  {isOverdue(e.nextDueDate) && e.status === 'active' && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>}
                </div>
                <p className="text-sm text-gray-500">{e.category} • {e.frequency} • ₹{e.amount.toLocaleString()}</p>
                <p className="text-sm text-gray-400 mt-1">Next due: {new Date(e.nextDueDate).toLocaleDateString()}{e.lastPaidDate ? ` • Last paid: ${new Date(e.lastPaidDate).toLocaleDateString()}` : ''}</p>
              </div>
              <div className="flex gap-2">
                {e.status === 'active' && <button onClick={() => handleMarkPaid(e._id)} className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded-lg">Mark Paid</button>}
                <button onClick={() => handleEdit(e)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">Edit</button>
                <button onClick={() => handleDelete(e._id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
