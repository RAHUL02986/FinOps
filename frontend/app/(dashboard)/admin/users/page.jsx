'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usersAPI } from '../../../../lib/api';
import UserForm from '../../../../components/UserForm';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ pages: 1, currentPage: 1 });
  
  const [filters, setFilters] = useState({ search: '', isActive: '', page: 1, limit: 8 });
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null); // Track absolute context menus cleanly

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = { 
        page: Number(filters.page) || 1, 
        limit: Number(filters.limit) || 8 
      };

      if (filters.search && filters.search.trim() !== '') {
        params.search = filters.search.trim();
      }
      
      if (filters.isActive === 'true') params.isActive = true;
      if (filters.isActive === 'false') params.isActive = false;

      const res = await usersAPI.getAll(params);
      
      const extractedData = res.data?.data || res.data?.users || res.data || [];
      
      // 👇 FIX: If backend misses returning root totals, determine if there's a next page based on current length
      let extractedTotal = res.data?.total ?? res.data?.totalUsers ?? null;
      let extractedPages = res.data?.pages || null;

      if (extractedTotal === null) {
        if (extractedData.length === params.limit) {
          // If we hit the exact limit, assume there's at least a next page to allow navigation
          extractedTotal = filters.page * params.limit + 1;
          extractedPages = filters.page + 1;
        } else {
          extractedTotal = ((filters.page - 1) * params.limit) + extractedData.length;
          extractedPages = filters.page;
        }
      } else {
        extractedPages = extractedPages || Math.ceil(extractedTotal / params.limit) || 1;
      }

      const extractedCurrentPage = res.data?.currentPage || params.page;

      setUsers(extractedData);
      setTotal(extractedTotal);
      setPagination({ 
        pages: extractedPages, 
        currentPage: extractedCurrentPage 
      });
    } catch (err) {
      console.error("Critical error during layout initialization:", err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.search, filters.isActive]);

  useEffect(() => { 
    fetchUsers(); 
  }, [fetchUsers]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try {
      await usersAPI.remove(id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await usersAPI.update(user._id, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleFormClose = (changed) => {
    setShowForm(false);
    setEditUser(null);
    if (changed) fetchUsers();
  };

  const setFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} registered users</p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="input"
              placeholder="Search by name or email…"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={filters.isActive}
              onChange={(e) => setFilter('isActive', e.target.value)}
              className="input"
            >
              <option value="">All Users</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[400px]"> {/* Keeps table canvas tall enough for menu expansion */}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['User', 'Role', 'Designation', 'Joined', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-semibold text-xs">
                            {u.name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${
                        u.role === 'superadmin' ? 'bg-purple-100 text-purple-700'
                        : u.role === 'admin' ? 'bg-indigo-100 text-indigo-700'
                        : u.role === 'manager' ? 'bg-blue-100 text-blue-700'
                        : u.role === 'hr' ? 'bg-amber-100 text-amber-700'
                        : u.role === 'dataentry' ? 'bg-green-100 text-green-700'
                        : u.role === 'employee' ? 'bg-gray-100 text-gray-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role === 'superadmin' ? 'Super Admin' : u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.designation || <span className="text-xs text-gray-300 italic">Not set</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {u.joiningDate ? fmtDate(u.joiningDate) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {fmtDate(u.createdAt)}
                    </td>
                    
                    {/* 👇 FIXED: Isolated Dropdown Positioning Container */}
                    <td className="px-6 py-4 text-right whitespace-nowrap relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === u._id ? null : u._id);
                        }}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>

                      {activeDropdown === u._id && (
                        <div className="absolute right-6 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 text-left">
                          <button
                            onClick={() => { setEditUser(u); setShowForm(true); }}
                            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(u._id, u.name)}
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center border-t border-gray-100"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-xl">
            <span className="text-sm text-gray-500 font-medium">
              Showing page {pagination.currentPage} of {pagination.pages}
            </span>
            <div className="flex items-center gap-1.5">
              
              {filters.page > 1 && (
                <button
                  onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                  className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  ← Prev
                </button>
              )}

              {Array.from({ length: pagination.pages }, (_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setFilters((p) => ({ ...p, page: pageNum }))}
                    className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                      pagination.currentPage === pageNum
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {filters.page < pagination.pages && (
                <button
                  onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                  className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Next →
                </button>
              )}

            </div>
          </div>
        )}
      </div>

      {showForm && <UserForm user={editUser} onClose={handleFormClose} />}
    </div>
  );
}