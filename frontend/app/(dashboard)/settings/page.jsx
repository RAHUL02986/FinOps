
"use client";



import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { settingsAPI, categoriesAPI, usersAPI } from '../../../lib/api';
import toast from 'react-hot-toast';

  const roleOptions = [
    { value: 'employee', label: 'Employee' },
    { value: 'admin', label: 'Admin' },
    { value: 'hr', label: 'HR' },
    { value: 'manager', label: 'Manager' },
    { value: 'dataentry', label: 'Data Entry' },
    { value: 'lead', label: 'Lead' },
  ];


import NotificationPanel from '../../../components/NotificationPanel';

const TABS = [
  { id: 'categories', label: 'Categories' },
  { id: 'users', label: 'Users & Roles' },
  { id: 'smtp', label: 'SMTP' },
  { id: 'notifications', label: 'Notifications' },
];

const SMTP_TYPES = [
  { key: 'system', label: 'System SMTP', desc: 'Used for OTP emails, general notifications, and system alerts', icon: '🖥️' },
  { key: 'invoice', label: 'Invoice SMTP', desc: 'Used for sending invoices and proposals to clients', icon: '📧' },
  { key: 'payroll', label: 'Payroll SMTP', desc: 'Used for sending salary slips to employees', icon: '💰' },
];


export default function SettingsPage() {
    // Users & Roles state (fetched from backend)
    const [users, setUsers] = useState([]);
  const { user } = useAuth();
  const [tab, setTab] = useState('categories');
  // SMTP state
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});

  // Categories state
  const [categories, setCategories] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("Income");


  useEffect(() => {
    if (tab === 'smtp' && (user?.role === 'superadmin' || user?.role === 'admin')) loadConfigs();
    if (tab === 'categories') fetchCategories();
    if (tab === 'users') fetchUsers();
    // TODO: fetch notifications as needed
  }, [tab, user]);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data.data || []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Failed to load users';
      toast.error(`Failed to load users: ${msg}`);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load categories');
    }
  };

  // SMTP logic (existing)
  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getSmtp();
      setConfigs(res.data);
    } catch (err) {
      toast.error('Failed to load SMTP settings');
    }
    setLoading(false);
  };

  const getConfig = (type) => configs.find(c => c.type === type) || { type, host: '', port: 587, secure: false, user: '', pass: '', fromName: '', fromEmail: '', isActive: false };

  const updateConfig = (type, field, value) => {
    setConfigs(prev => prev.map(c => c.type === type ? { ...c, [field]: value } : c));
  };

  const handleSave = async (type) => {
    setSaving({ ...saving, [type]: true });
    try {
      const config = getConfig(type);
      await settingsAPI.updateSmtp(type, {
        host: config.host,
        port: parseInt(config.port),
        secure: config.secure,
        user: config.user,
        pass: config.pass,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        isActive: config.isActive
      });
      toast.success(`${type} SMTP saved successfully`);
      loadConfigs();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to save ${type} SMTP`);
    }
    setSaving({ ...saving, [type]: false });
  };

  const handleTest = async (type) => {
    setTesting({ ...testing, [type]: true });
    try {
      const res = await settingsAPI.testSmtp(type);
      toast.success(res.data.message || 'Connection successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connection failed');
    }
    setTesting({ ...testing, [type]: false });
  };

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await categoriesAPI.create({ name: newCategoryName, type: newCategoryType, active: true });
      setCategories((prev) => [...prev, res.data]);
      toast.success('Category added');
      setShowAddCategory(false);
      setNewCategoryName("");
      setNewCategoryType("Income");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    }
  };

  // Toggle active status
  const handleToggleActive = async (cat, idx) => {
    try {
      const updated = await categoriesAPI.update(cat._id, { ...cat, active: !cat.active });
      setCategories((prev) => prev.map((c, i) => i === idx ? updated.data : c));
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  return (
    <div className="p-0 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account and application settings</p>
      </div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto flex-no-wrap justify-start">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === t.id ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Categories Tab */}
      {tab === 'categories' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Transaction Categories</h2>
              <p className="text-gray-400 text-sm">Manage categories for income and expense tracking.</p>
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              onClick={() => setShowAddCategory(true)}
            >
              + Add Category
            </button>
          </div>
          <div>
            {categories.map((cat, i) => (
              <div key={cat._id} className="flex items-center justify-between border-b last:border-b-0 py-3">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  {cat.name}
                  <span className={`text-xs px-2 py-0.5 rounded border ${cat.type === 'Income' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>{cat.type}</span>
                </div>
                <label className="flex items-center gap-3 cursor-pointer relative select-none">
                  <input
                    type="checkbox"
                    checked={cat.active}
                    onChange={() => handleToggleActive(cat, i)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 border ${cat.active ? 'bg-green-500 border-green-500' : 'bg-gray-300 border-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${cat.active ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <span className={`ml-2 text-xs font-semibold ${cat.active ? 'text-green-600' : 'text-gray-400'}`}>{cat.active ? 'Active' : 'Inactive'}</span>
                </label>
              </div>
            ))}
          </div>
          {/* Add Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-lg">
                <h3 className="text-lg font-bold mb-4">Add Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={newCategoryType}
                      onChange={e => setNewCategoryType(e.target.value)}
                    >
                      <option value="Income">Income</option>
                      <option value="Expense">Expense</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-gray-200 text-gray-700"
                      onClick={() => setShowAddCategory(false)}
                    >Cancel</button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded bg-blue-600 text-white font-medium"
                    >Add</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SMTP Tab (existing) */}
      {tab === 'smtp' && (
        <>
          {SMTP_TYPES.map(({ key, label, desc, icon }) => {
            const config = getConfig(key);
            return (
              <div key={key} className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6">
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800">{label}</h3>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600">{config.isActive ? 'Active' : 'Inactive'}</span>
                    <div className="relative">
                      <input type="checkbox" checked={config.isActive || false} onChange={e => updateConfig(key, 'isActive', e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-gray-300 peer-checked:bg-indigo-600 rounded-full transition" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
                    </div>
                  </label>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                      <input type="text" value={config.host || ''} onChange={e => updateConfig(key, 'host', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input type="number" value={config.port || 587} onChange={e => updateConfig(key, 'port', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input type="text" value={config.user || ''} onChange={e => updateConfig(key, 'user', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input type="password" value={config.pass || ''} onChange={e => updateConfig(key, 'pass', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="••••••••" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                      <input type="text" value={config.fromName || ''} onChange={e => updateConfig(key, 'fromName', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Your Company" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                      <input type="email" value={config.fromEmail || ''} onChange={e => updateConfig(key, 'fromEmail', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="noreply@company.com" />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" checked={config.secure || false} onChange={e => updateConfig(key, 'secure', e.target.checked)} className="rounded" />
                        Use SSL/TLS (port 465)
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => handleSave(key)} disabled={saving[key]} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                      {saving[key] ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button onClick={() => handleTest(key)} disabled={testing[key]} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
                      {testing[key] ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Info section */}
          <div className="mt-8 bg-blue-50 rounded-xl p-5 border border-blue-100">
            <h3 className="font-semibold text-blue-800 mb-2">💡 How SMTP works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>System SMTP</strong> — Fallback for all email types. Used for OTP, notifications, and system alerts.</li>
              <li>• <strong>Invoice SMTP</strong> — Used specifically for sending invoices and proposals to clients. Falls back to System if not configured.</li>
              <li>• <strong>Payroll SMTP</strong> — Used specifically for emailing salary slips to employees. Falls back to System if not configured.</li>
              <li>• If no SMTP is configured in the database, the system uses environment variable credentials as a last resort.</li>
            </ul>
          </div>
        </>
      )}
      {/* Users & Roles Tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="mb-4">
            <h2 className="text-xl font-bold">User Management</h2>
            <p className="text-gray-400 text-sm">Manage user roles and permissions.</p>
          </div>
          <div className="space-y-3 mb-6">
            {users.map((u, idx) => (
              <div key={u._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b last:border-b-0 py-3 gap-2 bg-gray-50 rounded-lg px-4">
                <div>
                  <div className="font-medium text-gray-900">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <select
                  className="border rounded px-3 py-1 text-sm bg-white"
                  value={u.role}
                  onChange={async e => {
                    const newRole = e.target.value;
                    try {
                      // Send all user fields to backend
                      await usersAPI.update(u._id, {
                        name: u.name,
                        email: u.email,
                        designation: u.designation || '',
                        sector: u.sector || 'IT',
                        employmentType: u.employmentType || 'full-time',
                        joiningDate: u.joiningDate || null,
                        experienceYears: u.experienceYears || 0,
                        isActive: u.isActive !== undefined ? u.isActive : true,
                        role: newRole
                      });
                      setUsers(prev => prev.map((user, i) => i === idx ? { ...user, role: newRole } : user));
                      toast.success(`Role updated to ${newRole}`);
                    } catch (err) {
                      toast.error('Failed to update role.');
                    }
                  }}
                >
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Role Permissions</h3>
            <ul className="text-xs text-gray-700 space-y-1">
              <li><b>Admin:</b> Full access, approve/reject entries, manage users</li>
              <li><b>HR:</b> Enter expenses, cannot approve or edit approved entries</li>
              <li><b>Manager:</b> Create invoices, view reports, cannot change transactions</li>
              <li><b>Data Entry:</b> Create draft entries only. Can only see dashboard and transactions. Transactions are drafts until approved by Admin.</li>
            </ul>
          </div>
        </div>
      )}
      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <NotificationPanel isAdmin={user?.role === 'admin' || user?.role === 'superadmin'} />
      )}
    </div>
  );
}