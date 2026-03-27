"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { dashboardAPI } from '../../../lib/api';
import DashboardStats from '../../../components/DashboardStats';
import DashboardChart from '../../../components/DashboardChart';
import TransactionTable from '../../../components/TransactionTable';
import toast from 'react-hot-toast';

const PERIODS = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: '15days', label: 'Last 15 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last2Months', label: 'Last 2 Months' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'last6Months', label: 'Last 6 Months' },
  { value: 'year', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Date Range' },
  { value: 'all', label: 'All Time' },
];

const ELEVATED = ['superadmin', 'hr', 'manager'];

function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [period, setPeriod] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');


  // Restrict dashboard access to allowed roles only
  useEffect(() => {
    if (!user) return;
    const allowed = ['superadmin', 'hr', 'manager', 'dataentry'];
    if (!allowed.includes(user.role)) {
      router.push('/login'); // or '/unauthorized' if you have a page for that
    }
    // Data entry users are allowed to view dashboard, no redirect
  }, [user, router]);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = { period };
        
        // Add custom date range if selected
        if (period === 'custom' && customStartDate && customEndDate) {
          params.startDate = customStartDate;
          params.endDate = customEndDate;
        }
        
        // Fetch summary
        const summaryRes = await dashboardAPI.getSummary(params);
        setSummary(summaryRes.data.data);
        
        // Fetch charts
        const chartRes = await dashboardAPI.getChartData(params);
        setChartData(chartRes.data.data);
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to load dashboard data';
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      // Only fetch if custom dates are provided when custom period is selected
      if (period === 'custom' && (!customStartDate || !customEndDate)) {
        return;
      }
      fetchDashboardData();
    }
  }, [user, period, customStartDate, customEndDate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-0 md-p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your financial overview</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full sm:w-48"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          
          {period === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full sm:w-40"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                min={customStartDate}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-full sm:w-40"
                placeholder="End Date"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {period === 'custom' && (!customStartDate || !customEndDate) && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
          Please select both start and end dates to view custom date range data.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      ) : period === 'custom' && (!customStartDate || !customEndDate) ? (
        <div className="flex items-center justify-center min-h-[400px] text-gray-500">
          Select date range to view dashboard data
        </div>
      ) : (
        <>
          <DashboardStats summary={summary} role={user?.role} />

          {ELEVATED.includes(user?.role) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardChart
                type="bar"
                data={chartData?.monthly}
                title="Monthly Income vs Expenses (Last 6 Months)"
              />
              <DashboardChart
                type="pie"
                data={chartData?.categories}
                title="Expenses by Category"
              />
            </div>
          )}

          <TransactionTable
            transactions={summary?.recentTransactions ?? []}
            title="Recent Transactions"
          />
        </>
      )}
    </div>
  );
}

export default DashboardPage;

