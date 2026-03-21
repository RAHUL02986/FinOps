'use client';
import { useState, useEffect } from 'react';
import { goalsAPI } from '../../../lib/api';
import toast from 'react-hot-toast';

const TYPE_LABELS = { revenue: 'Revenue', expense: 'Expense', savings: 'Savings' };
const TYPE_COLORS = { revenue: 'bg-green-100 text-green-700', expense: 'bg-red-100 text-red-700', savings: 'bg-blue-100 text-blue-700' };
const STATUS_COLORS = { active: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700', missed: 'bg-red-100 text-red-700' };

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', type: 'revenue', targetAmount: '', currentAmount: 0, period: 'monthly', startDate: '', endDate: '', status: 'active' });

  useEffect(() => { load(); }, []);
  const load = async () => { setLoading(true); try { const r = await goalsAPI.getAll(); setGoals(r.data); } catch { toast.error('Failed to load'); } setLoading(false); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await goalsAPI.update(editingId, form); toast.success('Updated'); }
      else { await goalsAPI.create(form); toast.success('Created'); }
      setShowForm(false); setEditingId(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return;
    try { await goalsAPI.remove(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const handleEdit = (g) => {
    setForm({ title: g.title, type: g.type, targetAmount: g.targetAmount, currentAmount: g.currentAmount || 0, period: g.period, startDate: new Date(g.startDate).toISOString().split('T')[0], endDate: new Date(g.endDate).toISOString().split('T')[0], status: g.status });
    setEditingId(g._id); setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-0 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Goals</h1><p className="text-gray-500 text-sm mt-1">Set and track financial targets</p></div>
        <button onClick={() => { setForm({ title: '', type: 'revenue', targetAmount: '', currentAmount: 0, period: 'monthly', startDate: '', endDate: '', status: 'active' }); setEditingId(null); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ New Goal</button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">{editingId ? 'Edit' : 'New'} Goal</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label><input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Q1 Revenue Target" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="revenue">Revenue</option><option value="expense">Expense</option><option value="savings">Savings</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Period</label><select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Amount *</label><input type="number" required min="0" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Current Amount</label><input type="number" min="0" value={form.currentAmount} onChange={e => setForm({ ...form, currentAmount: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label><input type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label><input type="date" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border"><div className="text-5xl mb-4">🎯</div><h3 className="text-lg font-semibold text-gray-700">No goals set</h3><p className="text-gray-500 mt-1">Create a goal to start tracking</p></div>
        ) : goals.map(g => {
          const progress = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
          return (
            <div key={g._id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[g.type]}`}>{TYPE_LABELS[g.type]}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[g.status]}`}>{g.status}</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{g.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{g.period} • {new Date(g.startDate).toLocaleDateString()} - {new Date(g.endDate).toLocaleDateString()}</p>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1"><span>₹{(g.currentAmount || 0).toLocaleString()}</span><span className="text-gray-500">₹{g.targetAmount.toLocaleString()}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${progress}%`, background: progress >= 100 ? '#22c55e' : progress >= 50 ? '#6366f1' : '#f59e0b' }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{progress.toFixed(1)}% complete</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(g)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex-1">Edit</button>
                <button onClick={() => handleDelete(g._id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
