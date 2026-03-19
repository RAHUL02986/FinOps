'use client';
import { useState, useEffect } from 'react';
import { reportsAPI } from '../../../lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const EXPENSE_COLOR = '#6366f1';
const INCOME_COLOR = '#22c55e';

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState({ expenses: { data: [], grandTotal: 0 }, income: { data: [], grandTotal: 0 } });
  // Combined data for chart
  const combinedCategoryData = [
    ...categoryData.expenses.data.map((c) => ({ ...c, type: 'Expense', color: EXPENSE_COLOR })),
    ...categoryData.income.data.map((c) => ({ ...c, type: 'Income', color: INCOME_COLOR })),
  ];
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [tab, setTab] = useState('category');
  const [catType, setCatType] = useState('expenses'); // 'expenses' or 'income'

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, tRes] = await Promise.all([
        reportsAPI.summary(),
        reportsAPI.spendingByCategory(dateRange.startDate ? dateRange : {}),
        reportsAPI.monthlyTrends()
      ]);
      setSummary(sRes.data);
      setCategoryData({
        expenses: cRes.data.expenses || { data: [], grandTotal: 0 },
        income: cRes.data.income || { data: [], grandTotal: 0 }
      });
      setTrends(tRes.data || []);
    } catch { toast.error('Failed to load reports'); }
    setLoading(false);
  };

  const loadCategory = async () => {
    try {
      const r = await reportsAPI.spendingByCategory(dateRange);
      setCategoryData({
        expenses: r.data.expenses || { data: [], grandTotal: 0 },
        income: r.data.income || { data: [], grandTotal: 0 }
      });
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Analyze your financial data</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'category' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
          onClick={() => setTab('category')}
        >
          Spending by Category
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'trends' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
          onClick={() => setTab('trends')}
        >
          Monthly Trends
        </button>
      </div>

      {/* Export Button */}
      <div className="flex justify-end mb-4">
        <button className="border px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">Export</button>
      </div>

      {/* Tab Content */}
      {tab === 'category' && (
        <div className="bg-white rounded-xl border p-5 mb-8">
          <h3 className="font-semibold text-gray-800 mb-2">Income & Expense by Category</h3>
          <p className="text-gray-400 text-sm mb-4">Combined breakdown of income and expenses by category</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              {combinedCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={combinedCategoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={({ type, category, percentage }) => `${type}: ${category} (${percentage}%)`}>
                      {combinedCategoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, name, props) => [`₹${v.toLocaleString()}`, `${props.payload.type}: ${props.payload.category}`]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-center py-10">No data</p>}
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold mb-2">Category Details</h4>
              {combinedCategoryData.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                    <span className="text-sm font-medium">{c.type}: {c.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold">₹{c.total.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 ml-2">({c.count} transactions, {c.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div className="bg-white rounded-xl border p-5 mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Spending Trend</h3>
          <p className="text-gray-400 text-sm mb-4">Your spending patterns over the last 12 months</p>
          {trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="expenses" name="Total Spending" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-10">No data available</p>}
        </div>
      )}
    </div>
  );
}
