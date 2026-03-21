'use client';
import { useState, useEffect } from 'react';
import { accountsAPI } from '../../../lib/api';
import toast from 'react-hot-toast';

const TYPES = ['current', 'savings', 'od_cc', 'cash', 'upi'];
const TYPE_LABELS = { current: 'Current', savings: 'Savings', od_cc: 'OD/CC', cash: 'Cash', upi: 'UPI' };
const TYPE_COLORS = { current: 'bg-blue-100 text-blue-700', savings: 'bg-green-100 text-green-700', od_cc: 'bg-red-100 text-red-700', cash: 'bg-yellow-100 text-yellow-700', upi: 'bg-purple-100 text-purple-700' };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'current', bankName: '', accountNumber: '', openingBalance: 0, currency: 'INR', creditLimit: 0 });

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    try {
      const r = await accountsAPI.getAll();
      setAccounts(Array.isArray(r.data) ? r.data : (r.data?.data || []));
    } catch {
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await accountsAPI.update(editingId, form); toast.success('Updated'); }
      else { await accountsAPI.create(form); toast.success('Created'); }
      setShowForm(false); setEditingId(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return;
    try { await accountsAPI.remove(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const handleEdit = (a) => {
    setForm({ name: a.name, type: a.type, bankName: a.bankName || '', accountNumber: a.accountNumber || '', openingBalance: a.openingBalance, currency: a.currency || 'INR', creditLimit: a.creditLimit || 0 });
    setEditingId(a._id); setShowForm(true);
  };

  const totalBalance = accounts.filter(a => a.type !== 'od_cc' && (a.isActive !== false)).reduce((s, a) => s + a.currentBalance, 0);
  const odUsed = accounts.filter(a => a.type === 'od_cc' && (a.isActive !== false)).reduce((s, a) => s + Math.abs(a.currentBalance), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-0 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">Accounts</h1><p className="text-gray-500 text-sm mt-1">Manage bank accounts and track balances</p></div>
        <button onClick={() => { setForm({ name: '', type: 'current', bankName: '', accountNumber: '', openingBalance: 0, currency: 'INR', creditLimit: 0 }); setEditingId(null); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">+ Add Account</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-5"><p className="text-sm text-gray-500">Total Available Funds</p><p className="text-3xl font-bold text-green-600">₹{totalBalance.toLocaleString()}</p><p className="text-xs text-gray-400 mt-1">Excludes OD/CC accounts</p></div>
        <div className="bg-white rounded-xl border p-5"><p className="text-sm text-gray-500">OD/CC Used</p><p className="text-3xl font-bold text-red-600">₹{odUsed.toLocaleString()}</p></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">{editingId ? 'Edit' : 'Add'} Account</h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label><input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="HDFC Current" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Type *</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">{TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label><input type="text" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label><input type="text" value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label><input type="number" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Currency</label><input type="text" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            {form.type === 'od_cc' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label><input type="number" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>}
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border"><div className="text-5xl mb-4">🏦</div><h3 className="text-lg font-semibold text-gray-700">No accounts yet</h3></div>
        ) : accounts.map(a => (
          <div key={a._id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[a.type]}`}>{TYPE_LABELS[a.type]}</span>
              {!a.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Inactive</span>}
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">{a.name}</h3>
            {a.bankName && <p className="text-sm text-gray-500">{a.bankName}</p>}
            {a.accountNumber && <p className="text-xs text-gray-400 mt-1">•••• {a.accountNumber.slice(-4)}</p>}
            <p className="text-2xl font-bold mt-3 text-gray-900">{a.currency} {a.currentBalance.toLocaleString()}</p>
            {a.type === 'od_cc' && a.creditLimit > 0 && <p className="text-xs text-gray-500 mt-1">Limit: {a.currency} {a.creditLimit.toLocaleString()}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => handleEdit(a)} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex-1">Edit</button>
              <button onClick={() => handleDelete(a._id)} className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
