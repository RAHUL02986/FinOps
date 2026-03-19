import DashboardStats from './DashboardStats';
import DashboardChart from './DashboardChart';

// OverviewTab for Admin Dashboard
export default function OverviewTab({ users, userStats }) {
  // Prepare summary and chart data for the dashboard components
  const summary = {
    totalIncome: userStats.totalIncome,
    totalExpenses: userStats.totalExpenses,
    netBalance: (userStats.totalIncome || 0) - (userStats.totalExpenses || 0),
    transactionCount: undefined, // You can enhance this if you have the data
  };

  // Placeholder chart data (empty arrays)
  // You can enhance this to show real charts if you aggregate data in AdminPage
  const chartData = {
    monthly: [],
    categories: [],
  };

  return (
    <div className="space-y-6">
      <DashboardStats summary={summary} role="superadmin" />
      {/* Optionally add charts if you aggregate data for them */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardChart type="bar" data={chartData.monthly} title="Monthly Income vs Expenses (Last 6 Months)" />
        <DashboardChart type="pie" data={chartData.categories} title="Expenses by Category" />
      </div> */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-2">User Overview</h2>
        <p className="text-sm text-gray-600">Total Users: {userStats.total}</p>
        <p className="text-sm text-green-600">Active Users: {userStats.active}</p>
      </div>
    </div>
  );
}
