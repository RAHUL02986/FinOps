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

  // Only show bell icon for admin/superadmin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';




  // Task notifications (all users)

  // Fetch notifications, respect preferences for all users
  const fetchNotifications = () => {
    if (!user || !isAdmin) return;
    notificationsAPI.getAll()
      .then(res => {
        setNotifications(res.data || []);
        setUnreadCount((res.data || []).filter(n => !n.read).length);
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
        {/* Notification Bell - only for admin/superadmin */}
        {isAdmin && (
          <div className="relative" ref={notifsRef}>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-indigo-50 relative"
              onClick={() => setShowNotifsDropdown((v) => !v)}
              aria-label="Notifications"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold" style={{ fontSize: 11 }}>{unreadCount}</span>
              )}
            </button>
            {showNotifsDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <span className="font-semibold text-gray-800">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">Mark all read</button>
                  )}
                </div>
                <ul className="divide-y">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-6 text-gray-400 text-center">No notifications</li>
                  ) : notifications.map((n) => {
                    // All notification types route to their main dashboard page (no ?id=...)
                    let link = '#';
                    if (n.type === 'transaction_created' || n.type === 'transaction_approved' || n.type === 'transaction_rejected') {
                      link = '/transactions';
                    } else if (n.type === 'invoice_reminder') {
                      link = '/invoices';
                    } else if (n.type === 'payroll_notification') {
                      link = '/payroll';
                    } else if (n.type === 'expense_alert') {
                      link = '/expenses';
                    } else if (n.type === 'proposal_notification') {
                      link = '/proposals';
                    } else if (n.type === 'lead_notification') {
                      link = '/leads';
                    } else if (n.type === 'task_assigned' || n.type === 'task_updated' || n.type === 'status_changed' || n.type === 'comment_added') {
                      link = '/tasks';
                    }
                    return (
                      <li key={n._id} className={`px-4 py-3 flex items-start gap-3 ${n.read ? 'opacity-60' : ''}`}>
                        <span className="mt-1 text-lg">
                          {NOTIF_ICON[n.type] || (n.type?.startsWith('transaction') ? '💸' : '🔔')}
                        </span>
                        <div className="flex-1">
                          <a href={link} className="block group hover:bg-indigo-50 rounded px-1 -mx-1 transition">
                            <div className="font-medium text-gray-900 group-hover:text-indigo-700">{n.title}</div>
                            <div className="text-gray-500 text-sm">{n.message}</div>
                            <div className="text-xs text-gray-400 mt-1">{fmtRelative(n.createdAt)}</div>
                          </a>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

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
