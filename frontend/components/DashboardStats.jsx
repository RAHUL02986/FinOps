'use client';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

const StatCard = ({ title, value, icon, bgColor, textColor, subtext }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  </div>
);

export default function DashboardStats({ summary, role }) {
  const netBalance = (summary?.netBalance ?? 0);
  const netColor = netBalance >= 0 ? 'text-green-600' : 'text-red-600';
  const isElevated = ['superadmin', 'hr', 'manager'].includes(role);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {isElevated && (
        <StatCard
          title="Total Income"
          value={formatCurrency(summary?.totalIncome)}
          bgColor="bg-green-100"
          textColor="text-green-700"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          }
        />
      )}
      {isElevated && (
        <StatCard
          title="Total Expenses"
          value={formatCurrency(summary?.totalExpenses)}
          bgColor="bg-red-100"
          textColor="text-red-600"
          icon={
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          }
        />
      )}
      {isElevated && (
        <StatCard
          title="Net Balance"
          value={formatCurrency(netBalance)}
          bgColor={netBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}
          textColor={netColor}
          icon={
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          }
        />
      )}
      <StatCard
        title="Transactions"
        value={summary?.transactionCount ?? 0}
        bgColor="bg-purple-100"
        textColor="text-purple-700"
        subtext="in selected period"
        icon={
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
      />
    </div>
  );
}
