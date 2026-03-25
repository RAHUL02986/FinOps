'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const PIE_COLORS = [
  '#6366f1', '#f43f5e', '#10b981', '#f59e0b',
  '#3b82f6', '#ec4899', '#14b8a6', '#8b5cf6', '#ef4444', '#84cc16',
];

const formatUSD = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

function BarChartComponent({ data }) {
  if (!data?.length) {
    return <p className="text-center text-gray-400 py-10 text-sm">No data available</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12 }} width={60} />
        <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 12 }} width={60} />
        <Tooltip formatter={(value) => formatUSD(value)} />
        <Legend />
        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function PieChartComponent({ data }) {
  if (!data?.length) {
    return <p className="text-center text-gray-400 py-10 text-sm">No expense data</p>;
  }
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            labelLine={false}
            label={renderLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatUSD(value)} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardChart({ type, data, title }) {
  return (
    <div className="card">
      <h3 className="text-base font-semibold text-gray-800 mb-4">{title}</h3>
      {type === 'bar' ? (
        <BarChartComponent data={data} />
      ) : (
        <PieChartComponent data={data} />
      )}
    </div>
  );
}
