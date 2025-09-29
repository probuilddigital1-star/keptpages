import { logError, logInfo } from '../../utils/errorHandler';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Platform } from '../../utils/platformComponents';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FeatureGate from '../../components/FeatureGate';
import axios from 'axios';
import { FiDollarSign, FiFileText, FiCheckCircle, FiClock, FiBarChart2, FiTrendingUp, FiMail } from 'react-icons/fi';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // month, quarter, year
  const { isPremium } = useAuth();

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.API_URL || 'http://localhost:3000'}/api/analytics?period=${period}`);
      setAnalytics(response.data);
    } catch (error) {
      logError('AnalyticsDashboard.to', error);
      // Generate mock data for demo
      setAnalytics(generateMockAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = () => ({
    totalRevenue: 15750.00,
    totalInvoices: 42,
    paidInvoices: 38,
    pendingInvoices: 3,
    overdueInvoices: 1,
    averageInvoiceValue: 375.00,
    paymentRate: 90.5,
    averagePaymentTime: 18, // days
    monthlyTrend: [
      { month: 'Jan', revenue: 2500, invoices: 8 },
      { month: 'Feb', revenue: 3200, invoices: 12 },
      { month: 'Mar', revenue: 2800, invoices: 10 },
      { month: 'Apr', revenue: 4100, invoices: 15 },
      { month: 'May', revenue: 3150, invoices: 11 }
    ],
    topClients: [
      { name: 'Acme Corp', revenue: 4200, invoices: 6 },
      { name: 'TechStart Inc', revenue: 3800, invoices: 5 },
      { name: 'Design Studio', revenue: 2900, invoices: 4 }
    ]
  });

  const StatCard = ({ title, value, subtitle, icon, trend, color = 'primary' }) => {
    const cardContent = (
      <Card className="p-6" shadow="soft">
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {title}
            </Text>
            <Text className={`text-xl font-bold text-${color} mb-2`}>
              {value}
            </Text>
            {subtitle && (
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
              </Text>
            )}
          </View>
          <View className={`p-3 rounded-full bg-${color}-100`}>
            {icon}
          </View>
        </View>
        {trend && (
          <View className="flex-row items-center">
            <Text className="text-xs font-medium text-green-600 mr-1">
              ↗ {trend}
            </Text>
            <Text className="text-xs text-gray-500">vs last period</Text>
          </View>
        )}
      </Card>
    );

    if (Platform.OS === 'web') {
      return (
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          {cardContent}
        </motion.div>
      );
    }

    return cardContent;
  };

  const ChartCard = ({ title, children }) => (
    <Card className="p-6" shadow="medium">
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        {title}
      </Text>
      {children}
    </Card>
  );

  const SimpleBarChart = ({ data, dataKey, nameKey }) => (
    <View className="space-y-3">
      {data.map((item, index) => {
        const maxValue = Math.max(...data.map(d => d[dataKey]));
        const percentage = (item[dataKey] / maxValue) * 100;
        
        return (
          <View key={index} className="space-y-1">
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item[nameKey]}
              </Text>
              <Text className="text-sm font-bold text-primary">
                ${item[dataKey].toLocaleString()}
              </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View 
                className="h-full bg-primary rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  if (!isPremium()) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
        <FeatureGate feature="analytics" />
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-6 items-center justify-center">
        <Text className="text-lg text-gray-600">Loading analytics...</Text>
      </View>
    );
  }

  const content = (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              Track your business performance
            </Text>
          </View>
          
          {/* Period Selector */}
          <View className="flex-row space-x-2">
            {['month', 'quarter', 'year'].map(p => (
              <Button
                key={p}
                variant={period === p ? 'primary' : 'outline'}
                onPress={() => setPeriod(p)}
                className="px-4 py-2"
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </View>
        </View>

        {/* Key Metrics */}
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={`$${analytics.totalRevenue.toLocaleString()}`}
            subtitle="This period"
            icon={<FiDollarSign className="w-6 h-6 text-primary" />}
            trend="+12.5%"
            color="primary"
          />
          <StatCard
            title="Total Invoices"
            value={analytics.totalInvoices}
            subtitle={`${analytics.paidInvoices} paid, ${analytics.pendingInvoices} pending`}
            icon={<FiFileText className="w-6 h-6 text-accent" />}
            trend="+8.3%"
            color="accent"
          />
          <StatCard
            title="Payment Rate"
            value={`${analytics.paymentRate}%`}
            subtitle="On-time payments"
            icon={<FiCheckCircle className="w-6 h-6 text-green-600" />}
            trend="+2.1%"
            color="status-success"
          />
          <StatCard
            title="Avg Payment Time"
            value={`${analytics.averagePaymentTime} days`}
            subtitle="Average collection"
            icon={<FiClock className="w-6 h-6 text-blue-600" />}
            trend="-3 days"
            color="status-info"
          />
        </View>

        {/* Charts */}
        <View className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Revenue Trend">
            <SimpleBarChart 
              data={analytics.monthlyTrend}
              dataKey="revenue"
              nameKey="month"
            />
          </ChartCard>
          
          <ChartCard title="Top Clients">
            <SimpleBarChart 
              data={analytics.topClients}
              dataKey="revenue"
              nameKey="name"
            />
          </ChartCard>
        </View>

        {/* Invoice Status Breakdown */}
        <ChartCard title="Invoice Status Overview">
          <View className="grid grid-cols-3 gap-4">
            <View className="text-center p-4 bg-green-50 rounded-lg">
              <Text className="text-2xl font-bold text-green-600">
                {analytics.paidInvoices}
              </Text>
              <Text className="text-sm font-medium text-green-800">
                Paid Invoices
              </Text>
            </View>
            <View className="text-center p-4 bg-yellow-50 rounded-lg">
              <Text className="text-2xl font-bold text-yellow-600">
                {analytics.pendingInvoices}
              </Text>
              <Text className="text-sm font-medium text-yellow-800">
                Pending
              </Text>
            </View>
            <View className="text-center p-4 bg-red-50 rounded-lg">
              <Text className="text-2xl font-bold text-red-600">
                {analytics.overdueInvoices}
              </Text>
              <Text className="text-sm font-medium text-red-800">
                Overdue
              </Text>
            </View>
          </View>
        </ChartCard>

        {/* Export Options */}
        <View className="mt-8">
          <Card className="p-6">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Export Reports
            </Text>
            <View className="flex-row space-x-4">
              <Button variant="outline" onPress={() => {}} className="flex items-center gap-2">
                <FiBarChart2 className="w-4 h-4" /> Export CSV
              </Button>
              <Button variant="outline" onPress={() => {}} className="flex items-center gap-2">
                <FiTrendingUp className="w-4 h-4" /> Export PDF Report
              </Button>
              <Button variant="outline" onPress={() => {}} className="flex items-center gap-2">
                <FiMail className="w-4 h-4" /> Email Report
              </Button>
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );

  return content;
};

export default AnalyticsDashboard;