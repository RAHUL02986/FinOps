'use client';

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n ?? 0);

const StatCard = ({ title, value, icon, bgColor, textColor, subtext, badge }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgColor}`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
      {badge && <div className="mt-1">{badge}</div>}
    </div>
  </div>
);

export default function DashboardStats({ summary, role }) {
  const netBalance = summary?.netBalance ?? 0;
  const netColor = netBalance >= 0 ? 'text-green-600' : 'text-red-600';
  const isElevated = ['superadmin', 'hr', 'manager'].includes(role);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Profit/Loss (Net Balance) */}
      <StatCard
        title="Profit / Loss (Month)"
        value={formatCurrency(netBalance)}
        bgColor={netBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}
        textColor={netColor}
        icon={
          netBalance >= 0 ? (
            // Upward green arrow for profit
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          ) : (
            // Downward red arrow for loss
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          )
        }
      />
      {/* 2. Available Funds */}
      <StatCard
        title="Available Funds"
        value={formatCurrency(summary?.availableFunds)}
        bgColor="bg-blue-100"
        textColor="text-blue-700"
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 12v4" />
          </svg>
        }
      />
      {/* 3. OD Limit Remaining (Current Balance) */}
      <StatCard
        title="OD Limit Remaining"
        value={formatCurrency(summary?.odLimitRemaining ?? 0)}
        bgColor="bg-yellow-100"
        textColor="text-yellow-700"
        icon={
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2z" />
          </svg>
        }
      />
      {/* 4. Used OD/CC Balance (Used Balance) */}
      <StatCard
        title="Used OD/CC Balance"
        value={formatCurrency(summary?.odUsedTotal ?? 0)}
        bgColor="bg-red-100"
        textColor="text-red-700"
        icon={
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        }
      />
    </div>
  );
}
