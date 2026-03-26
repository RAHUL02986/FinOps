import { useEffect, useState } from "react";
import { payrollAPI } from "../lib/api";

export default function SalaryHistory({ employee, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await payrollAPI.getSlips({ employee: employee._id });
        setHistory(res.data || []);
      } catch {
        setHistory([]);
      }
      setLoading(false);
    }
    load();
  }, [employee]);

  return (
    <div>
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No salary history found</div>
      ) : (
        <div className="space-y-4 max-h-72 overflow-y-auto pr-2"> {/* max-h-72 ~ 18rem, shows ~3-4 items */}
          {history.map((item, idx) => {
            const reason = item.reason || '';
            const isIncrement = /increment/i.test(reason);
            const isPromotion = /promotion/i.test(reason);
            let cardBg = 'bg-white';
            if (isIncrement) cardBg = 'bg-green-50';
            if (isPromotion) cardBg = 'bg-blue-50';
            // Show designation if available
            const designation = item.designation || item.title || item.role || '';
            return (
              <div key={item._id} className={`border rounded-lg p-4 flex items-center justify-between ${cardBg}`}>
                <div>
                  <div className="font-semibold">Effective: {item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleDateString() : `${item.month}/${item.year}`}{item.effectiveTo ? ` to ${new Date(item.effectiveTo).toLocaleDateString()}` : ' onward'}</div>
                  <div className="text-xs text-gray-500">Gross: {item.gross?.toFixed(2) || item.basicSalary?.toFixed(2)} | Net: {item.net?.toFixed(2) || item.netSalary?.toFixed(2)}</div>
                  {designation && <div className="text-xs text-gray-600">Designation: {designation}</div>}
                  <div className={`text-xs font-semibold ${isIncrement ? 'text-green-700' : isPromotion ? 'text-blue-700' : 'text-gray-400'}`}>Reason: {reason || 'N/A'}</div>
                  <div className={`text-xs ${isIncrement ? 'text-green-700 font-semibold' : isPromotion ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</div>
                </div>
                <div className="text-xs text-gray-500">{item.status || ''}</div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  );
}
