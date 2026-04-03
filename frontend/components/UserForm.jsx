'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { usersAPI } from '../lib/api';

export default function UserForm({ user, onClose }) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'employee',
    designation: user?.designation ?? '',
    sector: user?.sector ?? 'IT',
    employmentType: user?.employmentType ?? 'full-time',
    joiningDate: user?.joiningDate ? user.joiningDate.substring(0, 10) : '',
    experienceYears: user?.experienceYears ?? '',
    isActive: user?.isActive ?? true,
    fatherName: user?.fatherName ?? '',
    motherName: user?.motherName ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!user && form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const payload = { 
        name: form.name, 
        email: form.email, 
        role: form.role, 
        designation: form.designation,
        sector: form.sector,
        employmentType: form.employmentType,
        joiningDate: form.joiningDate || undefined,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : 0,
        isActive: form.isActive,
        fatherName: form.fatherName,
        motherName: form.motherName
      };
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
                    <input
                      name="fatherName"
                      type="text"
                      value={form.fatherName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Father's Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name</label>
                    <input
                      name="motherName"
                      type="text"
                      value={form.motherName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Mother's Name"
                    />
                  </div>
                </>
      if (form.password) payload.password = form.password;

      if (user) {
        await usersAPI.update(user._id, payload);
        toast.success('User updated');
      } else {
        await usersAPI.create({ ...payload, password: form.password });
        toast.success('User created');
      }
      onClose(true);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg
        || err.response?.data?.message
        || 'Failed to save user';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{user ? 'Edit User' : 'Create User'}</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="input"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="input"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {user ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <input
              name="password"
              type="password"
              required={!user}
              value={form.password}
              onChange={handleChange}
              className="input"
              placeholder={user ? 'Leave blank to keep current' : 'Min. 6 characters'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select name="role" value={form.role} onChange={handleChange} className="input">
              <option value="employee">Employee</option>
              <option value="dataentry">Data Entry</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="lead">Lead</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <input
              name="designation"
              type="text"
              value={form.designation}
              onChange={handleChange}
              className="input"
              placeholder="e.g. Developer, Senior Developer"
              maxLength={50}
            />
          </div>



          <div className="flex items-center gap-3">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Account active
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => onClose(false)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving…' : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
