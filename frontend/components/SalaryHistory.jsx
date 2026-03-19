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
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item._id} className="border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">Effective: {item.effectiveFrom ? new Date(item.effectiveFrom).toLocaleDateString() : `${item.month}/${item.year}`}{item.effectiveTo ? ` to ${new Date(item.effectiveTo).toLocaleDateString()}` : ' onward'}</div>
                <div className="text-xs text-gray-500">Gross: {item.gross?.toFixed(2) || item.basicSalary?.toFixed(2)} | Net: {item.net?.toFixed(2) || item.netSalary?.toFixed(2)}</div>
                <div className="text-xs text-gray-400">Reason: {item.reason || 'N/A'}</div>
                <div className="text-xs text-gray-400">Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</div>
              </div>
              <div className="text-xs text-gray-500">{item.status || ''}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-end mt-6">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  );
}
