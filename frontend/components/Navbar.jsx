'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../lib/api';

const ELEVATED = ['superadmin', 'hr', 'manager'];
const isElevated = (role) => ELEVATED.includes(role);

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/expenses': 'Expenses',
  '/income': 'Income',
  // Removed Inventory and Defective Inventory
  '/meetings': 'Meetings',
  '/invoices': 'Invoices',
  '/proposals': 'Proposals',
  '/accounts': 'Accounts',
  '/recurring-expenses': 'Recurring Expenses',
  '/payroll': 'Payroll',
  '/goals': 'Goals',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
    '/admin': 'Admin',
  '/admin/users': 'User Management',
};

const fmtRelative = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

const NOTIF_ICON = {
  task_assigned: '📋',
  status_changed: '📌',
  comment_added: '💬',
  task_updated: '✏️',
};

export default function Navbar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifsDropdown, setShowNotifsDropdown] = useState(false);
  const notifsRef = useRef(null);




  // Task notifications (all users)
  const fetchNotifications = () => {
    if (!user) return;
    notificationsAPI.getAll({ limit: 15 })
      .then(res => {
        setNotifications(res.data.data ?? []);
        setUnreadCount(res.data.unreadCount ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  // Refresh notifications when dropdown opens
  useEffect(() => { if (showNotifsDropdown) fetchNotifications(); }, [showNotifsDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifsDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Removed Feedback and Tasks related navigation

  const handleMarkAllRead = async () => {
    try { await notificationsAPI.markAllRead(); fetchNotifications(); } catch {}
  };

  const title = Object.entries(PAGE_TITLES).find(([path]) => pathname === path)?.[1] ?? 'Expenditure Tracker';

  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-4 flex items-center justify-between">
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex items-center gap-3">



        {/* Removed Feedback bell and Tasks links */}

        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-700">{user?.name}</p>
          <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-700 font-semibold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
        </div>
        <button onClick={logout} className="md:hidden text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
