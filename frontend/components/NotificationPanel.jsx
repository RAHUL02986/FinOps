import { useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa';
import { settingsAPI, notificationsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function NotificationPanel({ isAdmin }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Replace with your notifications API call
      const res = await notificationsAPI.getAll();
      setNotifications(res.data);
    } catch (err) {
      toast.error('Failed to load notifications');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <FaBell className="text-2xl text-indigo-600" />
        <h2 className="text-xl font-bold">Notifications</h2>
      </div>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-gray-400">No notifications found.</div>
      ) : (
        <ul className="divide-y">
          {notifications.map((n) => (
            <li key={n._id} className="py-3 flex items-start gap-3">
              <span className="mt-1"><FaBell className="text-indigo-400" /></span>
              <div>
                <div className="font-medium text-gray-900">{n.title}</div>
                <div className="text-gray-500 text-sm">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
