import React, { useState, useEffect } from 'react';
import { FiDollarSign } from 'react-icons/fi';

/**
 * Analytics Dashboard Component
 * Provides business intelligence for Pro users
 * Shows revenue trends, payment status, and client insights
 */
const AnalyticsDashboard = ({ 
  invoices = [], 
  isPremium = false,
  className = '' 
}) => {
  const [period, setPeriod] = useState('month'); // month, quarter, year
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    paidInvoices: 0,
    overdueAmount: 0,
    averageInvoiceValue: 0,
    clientCount: 0,
    monthlyRevenue: [],
    topClients: [],
    paymentStatusBreakdown: {
      paid: 0,
      pending: 0,
      overdue: 0,
    },
  });

  // Calculate analytics from invoices
  useEffect(() => {
    if (!invoices || invoices.length === 0) {
      // Mock data for demo
      setAnalytics({
        totalRevenue: 45678.50,
        pendingPayments: 8234.00,
        paidInvoices: 37444.50,
        overdueAmount: 2156.30,
        averageInvoiceValue: 1245.60,
        clientCount: 28,
        monthlyRevenue: [
          { month: 'Jan', revenue: 3400 },
          { month: 'Feb', revenue: 4200 },
          { month: 'Mar', revenue: 3800 },
          { month: 'Apr', revenue: 5100 },
          { month: 'May', revenue: 4700 },
          { month: 'Jun', revenue: 6200 },
        ],
        topClients: [
          { name: 'Tech Corp', total: 12340, invoices: 8 },
          { name: 'Design Studio', total: 8920, invoices: 12 },
          { name: 'Marketing Agency', total: 6780, invoices: 5 },
        ],
        paymentStatusBreakdown: {
          paid: 65,
          pending: 25,
          overdue: 10,
        },
      });
      return;
    }

    // Real calculation logic would go here
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');

    setAnalytics({
      totalRevenue,
      pendingPayments: pendingInvoices.reduce((sum, inv) => sum + inv.total, 0),
      paidInvoices: paidInvoices.reduce((sum, inv) => sum + inv.total, 0),
      overdueAmount: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0),
      averageInvoiceValue: totalRevenue / Math.max(invoices.length, 1),
      clientCount: new Set(invoices.map(inv => inv.client_name)).size,
      monthlyRevenue: [], // Would calculate based on invoice dates
      topClients: [], // Would aggregate by client
      paymentStatusBreakdown: {
        paid: paidInvoices.length,
        pending: pendingInvoices.length,
        overdue: overdueInvoices.length,
      },
    });
  }, [invoices]);

  // Revenue Chart Component (Simple SVG)
  const RevenueChart = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.revenue));
    const chartHeight = 200;
    const chartWidth = 400;
    const barWidth = chartWidth / data.length * 0.6;
    const spacing = chartWidth / data.length * 0.4;

    return (
      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {data.map((item, index) => {
          const barHeight = (item.revenue / maxValue) * (chartHeight - 40);
          const x = index * (barWidth + spacing) + spacing / 2;
          const y = chartHeight - barHeight - 20;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="url(#blueGradient)"
                className="transition-all hover:opacity-80"
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight - 5}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {item.month}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs font-semibold fill-gray-800"
              >
                ${(item.revenue / 1000).toFixed(1)}k
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
      </svg>
    );
  };

  // Donut Chart Component for Payment Status
  const DonutChart = ({ data }) => {
    const total = data.paid + data.pending + data.overdue;
    const radius = 60;
    const strokeWidth = 20;
    const circumference = 2 * Math.PI * radius;
    
    const paidOffset = 0;
    const pendingOffset = (data.paid / total) * circumference;
    const overdueOffset = ((data.paid + data.pending) / total) * circumference;

    return (
      <div className="relative">
        <svg width="160" height="160" className="transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#027A48"
            strokeWidth={strokeWidth}
            strokeDasharray={`${(data.paid / total) * circumference} ${circumference}`}
            strokeDashoffset={paidOffset}
            fill="none"
            className="transition-all"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#2563EB"
            strokeWidth={strokeWidth}
            strokeDasharray={`${(data.pending / total) * circumference} ${circumference}`}
            strokeDashoffset={-pendingOffset}
            fill="none"
            className="transition-all"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#B54708"
            strokeWidth={strokeWidth}
            strokeDasharray={`${(data.overdue / total) * circumference} ${circumference}`}
            strokeDashoffset={-overdueOffset}
            fill="none"
            className="transition-all"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-xs text-gray-600">Invoices</span>
        </div>
      </div>
    );
  };

  // Free user prompt
  if (!isPremium) {
    return (
      <div className={`p-8 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 text-center ${className}`}>
        <div className="mb-4 flex justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Analytics Dashboard
        </h3>
        <p className="text-gray-600 mb-6">
          Unlock powerful business insights with Pro features
        </p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg opacity-50">
            <div className="text-sm text-gray-500">Revenue Tracking</div>
          </div>
          <div className="p-4 bg-white rounded-lg opacity-50">
            <div className="text-sm text-gray-500">Payment Status</div>
          </div>
          <div className="p-4 bg-white rounded-lg opacity-50">
            <div className="text-sm text-gray-500">Client Insights</div>
          </div>
        </div>
        <button
          className="px-6 py-3 bg-gradient-to-r from-[#2563EB] to-[#60A5FA] text-white font-semibold rounded-lg hover:from-[#1E40AF] hover:to-[#3B82F6] transition-all"
          onClick={() => alert('Upgrade flow would open here')}
        >
          Upgrade to Pro - $4.99/month
        </button>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#0B1426]">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {['month', 'quarter', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                period === p 
                  ? 'bg-[#2563EB] text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Total Revenue</span>
            <FiDollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-900">
            ${analytics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-green-600 mt-1">+12.3% from last {period}</div>
        </div>

        <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-800">Pending</span>
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-amber-900">
            ${analytics.pendingPayments.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-amber-600 mt-1">
            {analytics.paymentStatusBreakdown.pending} invoices
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800">Overdue</span>
            <svg className="w-5 h-5 text-status-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-red-900">
            ${analytics.overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-red-600 mt-1">
            {analytics.paymentStatusBreakdown.overdue} invoices
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">Avg Invoice</span>
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            ${analytics.averageInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-blue-600 mt-1">{analytics.clientCount} clients</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="col-span-2 p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-[#0B1426] mb-4">Revenue Trend</h3>
          <RevenueChart data={analytics.monthlyRevenue} />
        </div>

        {/* Payment Status */}
        <div className="p-6 bg-white rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-[#0B1426] mb-4">Payment Status</h3>
          <div className="flex justify-center mb-4">
            <DonutChart data={analytics.paymentStatusBreakdown} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">Paid</span>
              </div>
              <span className="text-sm font-semibold">{analytics.paymentStatusBreakdown.paid}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2563EB]"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="text-sm font-semibold">{analytics.paymentStatusBreakdown.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm text-gray-600">Overdue</span>
              </div>
              <span className="text-sm font-semibold">{analytics.paymentStatusBreakdown.overdue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Clients */}
      <div className="p-6 bg-white rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-[#0B1426] mb-4">Top Clients</h3>
        <div className="space-y-3">
          {analytics.topClients.map((client, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold ${
                  index === 0 ? 'bg-[#2563EB]' : index === 1 ? 'bg-gray-400' : 'bg-gray-500'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{client.name}</div>
                  <div className="text-xs text-gray-500">{client.invoices} invoices</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-[#0B1426]">
                ${client.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 p-4 bg-gradient-to-r from-[#0B1426] to-[#1E3A5F] rounded-xl">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h4 className="text-lg font-semibold mb-1">Generate Monthly Report</h4>
            <p className="text-sm opacity-80">Export detailed analytics for {period}</p>
          </div>
          <button className="px-6 py-3 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-[#1E40AF] transition-all">
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;