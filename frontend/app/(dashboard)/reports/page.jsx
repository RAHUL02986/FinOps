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
  
  // Helper to get current and previous month
  const getCurrentAndPreviousMonth = () => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = prevDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    return { current: currentMonth, previous: previousMonth };
  };
  
  const defaultMonths = getCurrentAndPreviousMonth();
  
  // Comparison tab state
  const [comparisonType, setComparisonType] = useState('monthly'); // 'monthly', 'quarterly', 'semi-yearly', 'yearly'
  const [comparisonPeriod, setComparisonPeriod] = useState({ 
    base: defaultMonths.previous, 
    target: defaultMonths.current 
  });
  const [rangeComparison, setRangeComparison] = useState({
    sm1: '', fm1: '',
    sm2: '', fm2: ''
  });
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [catType, setCatType] = useState('expenses'); // 'expenses' or 'income'

  // Helper function to convert period string to date range
  const parsePeriod = (periodStr) => {
    const [month, year] = periodStr.split(' ');
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const startDate = new Date(parseInt(year), monthMap[month], 1);
    const endDate = new Date(parseInt(year), monthMap[month] + 1, 0, 23, 59, 59);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Helper function for range comparison (SM1-FM1 to SM2-FM2)
  const parseRange = (startMonth, endMonth) => {
    const [sMonth, sYear] = startMonth.split(' ');
    const [eMonth, eYear] = endMonth.split(' ');
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const startDate = new Date(parseInt(sYear), monthMap[sMonth], 1);
    const endDate = new Date(parseInt(eYear), monthMap[eMonth] + 1, 0, 23, 59, 59);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Generate all month/year options
  const getAllPeriodOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return years.flatMap(year => months.map(month => `${month} ${year}`));
  };

  // Helper function to calculate end month based on comparison type and start month
  const calculateEndMonth = (startMonth, comparisonType) => {
    const [month, year] = startMonth.split(' ');
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startDate = new Date(parseInt(year), monthMap[month], 1);
    let monthsToAdd = 0;
    
    switch (comparisonType) {
      case 'quarterly': monthsToAdd = 2; break; // 3 months total (0, 1, 2 = Jan, Feb, Mar)
      case 'semi-yearly': monthsToAdd = 5; break; // 6 months total
      case 'yearly': monthsToAdd = 11; break; // 12 months total
      default: return startMonth;
    }
    
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + monthsToAdd, 1);
    return `${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
  };

  // Handle comparison type change and reset values
  const handleComparisonTypeChange = (newType) => {
    setComparisonType(newType);
    
    // Reset all values when switching types
    if (newType === 'monthly') {
      setComparisonPeriod({ base: '', target: '' });
    } else {
      setRangeComparison({
        sm1: '', fm1: '',
        sm2: '', fm2: ''
      });
    }
  };

  // Handle start month change with auto-calculation of end month
  const handleStartMonthChange = (newStartMonth, periodKey, isSecondPeriod = false) => {
    if (!newStartMonth || comparisonType === 'custom') {
      // For empty values or custom, just update the start month without auto-calculation
      setRangeComparison(p => ({ ...p, [periodKey]: newStartMonth }));
    } else {
      // Auto-calculate end month for quarterly, semi-yearly, yearly
      const endMonth = calculateEndMonth(newStartMonth, comparisonType);
      const endKey = isSecondPeriod ? 'fm2' : 'fm1';
      setRangeComparison(p => ({ ...p, [periodKey]: newStartMonth, [endKey]: endMonth }));
    }
  };

  // Calculate percentage change
  const calcChange = (base, target) => {
    if (base === 0) return target > 0 ? '+100%' : '0%';
    const change = ((target - base) / base * 100).toFixed(1);
    return `${change >= 0 ? '+' : ''}${change}%`;
  };

  // Load comparison data
  const loadComparisonData = async () => {
    setComparisonLoading(true);
    try {
      let baseRange, targetRange;
      
      if (comparisonType === 'monthly') {
        // Single month comparison
        if (!comparisonPeriod.base || !comparisonPeriod.target) return;
        baseRange = parsePeriod(comparisonPeriod.base);
        targetRange = parsePeriod(comparisonPeriod.target);
      } else {
        // Range comparison (SM1-FM1 vs SM2-FM2)
        if (!rangeComparison.sm1 || !rangeComparison.fm1 || !rangeComparison.sm2 || !rangeComparison.fm2) return;
        baseRange = parseRange(rangeComparison.sm1, rangeComparison.fm1);
        targetRange = parseRange(rangeComparison.sm2, rangeComparison.fm2);
      }

      // Fetch data for both periods
      const [baseData, targetData] = await Promise.all([
        reportsAPI.spendingByCategory(baseRange),
        reportsAPI.spendingByCategory(targetRange)
      ]);

      const baseIncome = baseData.data.income?.grandTotal || 0;
      const targetIncome = targetData.data.income?.grandTotal || 0;
      const baseExpense = baseData.data.expenses?.grandTotal || 0;
      const targetExpense = targetData.data.expenses?.grandTotal || 0;

      const baseMargin = baseIncome > 0 ? ((baseIncome - baseExpense) / baseIncome * 100) : 0;
      const targetMargin = targetIncome > 0 ? ((targetIncome - targetExpense) / targetIncome * 100) : 0;

      // Calculate expense divergence by category
      const baseCats = baseData.data.expenses?.data || [];
      const targetCats = targetData.data.expenses?.data || [];
      
      const categoryComparison = {};
      baseCats.forEach(cat => {
        categoryComparison[cat.category] = { base: cat.total, target: 0 };
      });
      targetCats.forEach(cat => {
        if (!categoryComparison[cat.category]) {
          categoryComparison[cat.category] = { base: 0, target: cat.total };
        } else {
          categoryComparison[cat.category].target = cat.total;
        }
      });

      const expenseDivergence = Object.entries(categoryComparison)
        .map(([category, data]) => {
          const change = calcChange(data.base, data.target);
          const changeNum = parseFloat(change.replace(/[+%]/g, ''));
          return {
            label: category,
            value: change,
            color: changeNum > 0 ? '#ef4444' : changeNum < 0 ? '#22c55e' : '#64748b'
          };
        })
        .sort((a, b) => Math.abs(parseFloat(b.value)) - Math.abs(parseFloat(a.value)))
        .slice(0, 4);

      // Create ledger entries
      const ledger = Object.entries(categoryComparison).map(([category, data]) => {
        const variance = data.target - data.base;
        const variancePct = calcChange(data.base, data.target);
        return {
          account: category,
          base: data.base,
          target: data.target,
          variance,
          variancePct
        };
      });

      // Generate comparison trajectory data
      let trajectoryLabel1, trajectoryLabel2;
      if (comparisonType === 'monthly') {
        trajectoryLabel1 = comparisonPeriod.base;
        trajectoryLabel2 = comparisonPeriod.target;
      } else {
        trajectoryLabel1 = `${rangeComparison.sm1} - ${rangeComparison.fm1}`;
        trajectoryLabel2 = `${rangeComparison.sm2} - ${rangeComparison.fm2}`;
      }
      
      const trajectoryData = [
        {
          period: trajectoryLabel1.length > 15 ? 'Period 1' : trajectoryLabel1,
          base: baseExpense,
          target: 0,
          income: baseIncome
        },
        {
          period: trajectoryLabel2.length > 15 ? 'Period 2' : trajectoryLabel2,
          base: 0,
          target: targetExpense,
          income: targetIncome
        }
      ];

      setComparisonData({
        summary: {
          grossIncome: { base: baseIncome, target: targetIncome, change: calcChange(baseIncome, targetIncome) },
          operatingExpenses: { base: baseExpense, target: targetExpense, change: calcChange(baseExpense, targetExpense) },
          netMargin: { 
            value: `${targetMargin.toFixed(1)}%`, 
            change: `${(targetMargin - baseMargin).toFixed(1)}%`
          },
        },
        expenseDivergence,
        yearlyTrajectory: trajectoryData,
        ledger: ledger.slice(0, 10) // Show top 10
      });
    } catch (error) {
      console.error('Failed to load comparison data:', error);
      toast.error('Failed to load comparison data');
    }
    setComparisonLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Load comparison data when tab is comparison or periods change
  useEffect(() => {
    if (tab === 'comparison') {
      loadComparisonData();
    }
  }, [tab, comparisonPeriod.base, comparisonPeriod.target, rangeComparison, comparisonType]);


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
    <div className="p-0 md:p-6 max-w-8xl mx-auto">
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
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'comparison' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
          onClick={() => setTab('comparison')}
        >
          Comparison
        </button>
      </div>


      {/* Comparison Tab Content */}
      {tab === 'comparison' && (
        <div className="bg-white rounded-xl border p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-xl mb-1">Comparison Analytics</h3>
              <p className="text-gray-500 text-sm">Advanced period-over-period variance analysis. Track fiscal shifts with high-precision ledger data mapping.</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* Comparison Type Selector */}
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">Comparison Type</label>
                <select 
                  className="border rounded px-3 py-2 text-sm bg-white min-w-[120px]"
                  value={comparisonType} 
                  onChange={e => handleComparisonTypeChange(e.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi-yearly">Semi-Yearly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              {/* Period Selectors */}
              {comparisonType === 'monthly' ? (
                <div className="flex gap-2 items-start">
                  <div>
                    <label className="text-xs text-gray-500">Month 1 (M1)</label>
                    <select 
                      className="ml-1 border rounded px-2 py-1 text-sm" 
                      value={comparisonPeriod.base} 
                      onChange={e => setComparisonPeriod(p => ({ ...p, base: e.target.value }))}
                    >
                      <option value="">Select Month 1</option>
                      {getAllPeriodOptions().map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Month 2 (M2)</label>
                    <select 
                      className="ml-1 border rounded px-2 py-1 text-sm" 
                      value={comparisonPeriod.target} 
                      onChange={e => setComparisonPeriod(p => ({ ...p, target: e.target.value }))}
                    >
                      <option value="">Select Month 2</option>
                      {getAllPeriodOptions().map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* Period 1: SM1 - FM1 */}
                  <div className="border rounded p-3 bg-gray-50">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">
                      Period 1 {comparisonType !== 'custom' && `(${comparisonType.charAt(0).toUpperCase() + comparisonType.slice(1)})`}
                    </h5>
                    <div className="flex gap-2">
                      <div>
                        <label className="text-xs text-gray-500">SM1</label>
                        <select 
                          className="border rounded px-2 py-1 text-sm w-full" 
                          value={rangeComparison.sm1} 
                          onChange={e => handleStartMonthChange(e.target.value, 'sm1', false)}
                        >
                          <option value="">Select SM1</option>
                          {getAllPeriodOptions().map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">FM1</label>
                        <select 
                          className={`border rounded px-2 py-1 text-sm w-full ${
                            comparisonType !== 'custom' ? 'bg-gray-100' : ''
                          }`}
                          value={rangeComparison.fm1} 
                          onChange={e => setRangeComparison(p => ({ ...p, fm1: e.target.value }))}
                          disabled={comparisonType !== 'custom'}
                        >
                          <option value="">Select FM1</option>
                          {getAllPeriodOptions().map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {comparisonType !== 'custom' && (
                      <p className="text-xs text-gray-500 mt-1">End month auto-selected</p>
                    )}
                  </div>
                  
                  {/* Period 2: SM2 - FM2 */}
                  <div className="border rounded p-3 bg-blue-50">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2">
                      Period 2 {comparisonType !== 'custom' && `(${comparisonType.charAt(0).toUpperCase() + comparisonType.slice(1)})`}
                    </h5>
                    <div className="flex gap-2">
                      <div>
                        <label className="text-xs text-gray-500">SM2</label>
                        <select 
                          className="border rounded px-2 py-1 text-sm w-full" 
                          value={rangeComparison.sm2} 
                          onChange={e => handleStartMonthChange(e.target.value, 'sm2', true)}
                        >
                          <option value="">Select SM2</option>
                          {getAllPeriodOptions().map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">FM2</label>
                        <select 
                          className={`border rounded px-2 py-1 text-sm w-full ${
                            comparisonType !== 'custom' ? 'bg-gray-100' : ''
                          }`}
                          value={rangeComparison.fm2} 
                          onChange={e => setRangeComparison(p => ({ ...p, fm2: e.target.value }))}
                          disabled={comparisonType !== 'custom'}
                        >
                          <option value="">Select FM2</option>
                          {getAllPeriodOptions().map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {comparisonType !== 'custom' && (
                      <p className="text-xs text-gray-500 mt-1">End month auto-selected</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {comparisonLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
            </div>
          ) : comparisonData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 flex flex-col items-start">
                  <span className="text-xs text-gray-500 font-medium mb-1">Gross Income</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-green-700">₹{comparisonData.summary.grossIncome.target.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm line-through">₹{comparisonData.summary.grossIncome.base.toLocaleString()}</span>
                  </div>
                  <span className="text-green-600 text-sm font-semibold mt-1">{comparisonData.summary.grossIncome.change}</span>
                </div>
                <div className="bg-red-50 rounded-lg p-4 flex flex-col items-start">
                  <span className="text-xs text-gray-500 font-medium mb-1">Operating Expenses</span>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-red-700">₹{comparisonData.summary.operatingExpenses.target.toLocaleString()}</span>
                    <span className="text-gray-400 text-sm line-through">₹{comparisonData.summary.operatingExpenses.base.toLocaleString()}</span>
                  </div>
                  <span className="text-red-600 text-sm font-semibold mt-1">{comparisonData.summary.operatingExpenses.change}</span>
                </div>
                <div className="bg-indigo-900 rounded-lg p-4 flex flex-col items-start text-white">
                  <span className="text-xs font-medium mb-1">Net Margin Performance</span>
                  <span className="text-2xl font-bold">{comparisonData.summary.netMargin.value}</span>
                  <span className="text-indigo-200 text-sm mt-1">{comparisonData.summary.netMargin.change} margin change</span>
                </div>
              </div>
              
              {/* Divergence & Trajectory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-gray-800">Expense Divergence</h4>
                  <p className="text-xs text-gray-500 mb-2">Top category shifts</p>
                  <div className="space-y-2">
                    {comparisonData.expenseDivergence.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{item.label}</span>
                        <span className="font-semibold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">Period Comparison</h4>
                    <button className="text-xs text-indigo-600 font-medium hover:underline">Export CSV</button>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={comparisonData.yearlyTrajectory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="base" name="Base Period" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="target" name="Target Period" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>Base: <b className="text-gray-700">{comparisonPeriod.base}</b></span>
                    <span>Target: <b className="text-gray-700">{comparisonPeriod.target}</b></span>
                  </div>
                </div>
              </div>
              
              {/* Precision Variance Ledger */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">Precision Variance Ledger</h4>
                  <span className="text-xs text-gray-400">Auto-synced: Just now</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b">
                        <th className="py-2 px-2 text-left font-medium">Account Name</th>
                        <th className="py-2 px-2 text-left font-medium">
                          {comparisonType === 'monthly' 
                            ? comparisonPeriod.base 
                            : `${rangeComparison.sm1} - ${rangeComparison.fm1}`
                          }
                        </th>
                        <th className="py-2 px-2 text-left font-medium">
                          {comparisonType === 'monthly'
                            ? comparisonPeriod.target
                            : `${rangeComparison.sm2} - ${rangeComparison.fm2}`
                          }
                        </th>
                        <th className="py-2 px-2 text-left font-medium">Variance (₹)</th>
                        <th className="py-2 px-2 text-left font-medium">Variance (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.ledger.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 px-2 font-medium text-gray-700">{row.account}</td>
                          <td className="py-2 px-2">₹{row.base.toLocaleString()}</td>
                          <td className="py-2 px-2">₹{row.target.toLocaleString()}</td>
                          <td className={`py-2 px-2 font-semibold ${row.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.variance < 0 ? '-' : '+'}₹{Math.abs(row.variance).toLocaleString()}
                          </td>
                          <td className={`py-2 px-2 font-semibold ${row.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {row.variancePct}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">No comparison data available</p>
            </div>
          )}
        </div>
      )}

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
