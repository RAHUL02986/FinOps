
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FaBell, FaMoneyCheckAlt, FaFileInvoiceDollar, FaExclamationTriangle, FaFileSignature } from 'react-icons/fa';
import { settingsAPI } from '../lib/api';

export default function NotificationPanel() {
  const [prefs, setPrefs] = useState({ invoiceReminders: true, payrollNotifications: true, expenseAlerts: true, proposalNotifications: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, []);

  const loadPrefs = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.getNotificationPrefs();
      setPrefs({
        invoiceReminders: true,
        payrollNotifications: true,
        expenseAlerts: true,
        proposalNotifications: true,
        ...(res.data || {})
      });
    } catch (err) {
      toast.error('Failed to load notification preferences');
    }
    setLoading(false);
  };

  const handleToggle = async (key) => {
    setSaving(true);
    try {
      const updated = { ...prefs, [key]: !prefs[key] };
      await settingsAPI.updateNotificationPrefs(updated);
      setPrefs(updated);
      toast.success('Preferences updated');
    } catch (err) {
      toast.error('Failed to update preferences');
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border p-8 mt-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <FaBell className="text-3xl text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
      </div>
      <div className="text-gray-500 mb-6 text-sm">Choose which notifications you want to receive in your dashboard bell icon.</div>
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <ul className="divide-y divide-gray-100">
                    <li className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <FaFileSignature className="text-xl text-purple-500" />
                        <div>
                          <div className="font-medium text-gray-800">Proposal Notifications</div>
                          <div className="text-xs text-gray-400">Get notified about proposals and related actions.</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={prefs.proposalNotifications} onChange={() => handleToggle('proposalNotifications')} disabled={saving} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-400 rounded-full peer peer-checked:bg-purple-600 transition" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition peer-checked:translate-x-5" />
                      </label>
                    </li>
          <li className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <FaFileInvoiceDollar className="text-xl text-blue-500" />
              <div>
                <div className="font-medium text-gray-800">Invoice Reminders</div>
                <div className="text-xs text-gray-400">Get notified about upcoming or overdue invoices.</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs.invoiceReminders} onChange={() => handleToggle('invoiceReminders')} disabled={saving} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-400 rounded-full peer peer-checked:bg-blue-600 transition" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition peer-checked:translate-x-5" />
            </label>
          </li>
          <li className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <FaMoneyCheckAlt className="text-xl text-green-500" />
              <div>
                <div className="font-medium text-gray-800">Payroll Notifications</div>
                <div className="text-xs text-gray-400">Be alerted when salary slips or payroll actions occur.</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs.payrollNotifications} onChange={() => handleToggle('payrollNotifications')} disabled={saving} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-400 rounded-full peer peer-checked:bg-green-600 transition" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition peer-checked:translate-x-5" />
            </label>
          </li>
          <li className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-xl text-yellow-500" />
              <div>
                <div className="font-medium text-gray-800">Expense Alerts</div>
                <div className="text-xs text-gray-400">Receive alerts for important expense activity.</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={prefs.expenseAlerts} onChange={() => handleToggle('expenseAlerts')} disabled={saving} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:bg-yellow-500 transition" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition peer-checked:translate-x-5" />
            </label>
          </li>
        </ul>
      )}
    </div>
  );
}
