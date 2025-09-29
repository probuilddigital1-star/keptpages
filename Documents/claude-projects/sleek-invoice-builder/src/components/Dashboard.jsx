import { logError, logInfo } from '../utils/errorHandler';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, View, Text, Platform, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from '../utils/platformComponents';
import { useInView } from 'react-intersection-observer';
import Icon, { IconSizes, IconColors } from './Icon';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import Card from './Card';
import Button from './Button';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = ({ onCreateInvoice, onSelectInvoice }) => {
  const { isPremium, canUseTemplates } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    invoicesThisMonth: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });
  
  const { ref, inView } = Platform.OS === 'web' ? useInView({ threshold: 0 }) : { ref: null, inView: false };

  const loadInvoices = useCallback(async (pageNum = 1) => {
    try {
      const response = await axios.get(`${process.env.API_URL || 'http://localhost:3000'}/api/invoices?page=${pageNum}`);
      const newInvoices = response.data.invoices;
      
      if (pageNum === 1) {
        setInvoices(newInvoices);
        // Calculate stats on first load
        calculateStats(response.data.allInvoices || newInvoices);
      } else {
        setInvoices(prev => [...prev, ...newInvoices]);
      }
      
      setHasMore(newInvoices.length === 10);
      setPage(pageNum);
    } catch (error) {
      logError('Dashboard.to', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = useCallback((allInvoices) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyInvoices = allInvoices.filter(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
    });

    const totalRevenue = allInvoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const paidCount = allInvoices.filter(invoice => invoice.status === 'paid').length;
    const pendingCount = allInvoices.filter(invoice => invoice.status === 'pending').length;
    const overdueCount = allInvoices.filter(invoice => invoice.status === 'overdue').length;

    setStats({
      totalRevenue,
      invoicesThisMonth: monthlyInvoices.length,
      paidCount,
      pendingCount,
      overdueCount
    });
  }, []);

  useEffect(() => {
    loadInvoices(1);
  }, [loadInvoices]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadInvoices(page + 1);
    }
  }, [inView, hasMore, loading, page, loadInvoices]);

  // Filter invoices based on search and status
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = searchQuery === '' || 
        invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Bulk action handlers
  const toggleInvoiceSelection = useCallback((invoiceId) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  }, []);

  const selectAllInvoices = useCallback(() => {
    const allIds = new Set(filteredInvoices.map(invoice => invoice.id));
    setSelectedInvoices(allIds);
    setShowBulkActions(allIds.size > 0);
  }, [filteredInvoices]);

  const clearSelection = useCallback(() => {
    setSelectedInvoices(new Set());
    setShowBulkActions(false);
  }, []);

  // Premium feature handlers
  const handlePremiumFeature = useCallback((feature) => {
    if (!isPremium()) {
      // Show upgrade modal or redirect to subscription
      alert('This feature requires a premium subscription. Upgrade to unlock advanced analytics, templates, and export capabilities.');
      return;
    }
    
    switch (feature) {
      case 'analytics':
        // console.log('Opening analytics dashboard...');
        break;
      case 'templates':
        // console.log('Opening template library...');
        break;
      case 'export':
        // console.log('Exporting selected invoices...');
        break;
      default:
        break;
    }
  }, [isPremium]);

  // Premium Stats Bar Component
  const StatsBar = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card variant="stats-success" className="text-center animate-slide-up">
        <div className="card-icon success">
          <Icon name="revenue" size={IconSizes.md} color={IconColors.success} />
        </div>
        <div className="card-stats-value text-green-600">
          ${stats.totalRevenue.toLocaleString()}
        </div>
        <div className="card-stats-label">Total Revenue</div>
        <div className="card-stats-change positive">+12.3% this month</div>
      </Card>
      
      <Card variant="stats" className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="card-icon">
          <Icon name="invoice" size={IconSizes.md} color={IconColors.primary} />
        </div>
        <div className="card-stats-value text-primary">
          {stats.invoicesThisMonth}
        </div>
        <div className="card-stats-label">This Month</div>
        <div className="card-stats-change">invoices created</div>
      </Card>
      
      <Card variant="stats-success" className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="card-icon success">
          <Icon name="success" size={IconSizes.md} color={IconColors.success} />
        </div>
        <div className="card-stats-value text-green-600">
          {stats.paidCount}
        </div>
        <div className="card-stats-label">Paid Invoices</div>
        <div className="card-stats-change positive">
          ${(stats.totalRevenue * 0.75).toLocaleString()} collected
        </div>
      </Card>
      
      <Card variant="stats-error" className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="card-icon error">
          <Icon name="warning" size={IconSizes.md} color={IconColors.danger} />
        </div>
        <div className="card-stats-value text-red-600">
          {stats.overdueCount}
        </div>
        <div className="card-stats-label">Overdue</div>
        <div className="card-stats-change negative">
          ${(stats.totalRevenue * 0.1).toLocaleString()} at risk
        </div>
      </Card>
    </div>
  );

  // Enhanced Invoice Item Component
  const InvoiceItem = ({ invoice }) => {
    const isSelected = selectedInvoices.has(invoice.id);
    const statusConfig = {
      paid: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900', icon: 'checkmark-circle' },
      pending: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900', icon: 'time' },
      overdue: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900', icon: 'warning' }
    };
    
    const config = statusConfig[invoice.status] || statusConfig.pending;
    
    return (
      <Card 
        variant="invoice"
        selected={isSelected}
        className="mb-4 animate-fade-in"
      >
        <div className="flex items-start gap-4">
          {/* Checkbox for selection */}
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleInvoiceSelection(invoice.id)}
              className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          
          {/* Invoice Content */}
          <div className="flex-1">
            <div className="flex justify-between items-start mb-3">
              <div>
                <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  Invoice #{invoice.number}
                </Text>
                <Text className="text-lg text-gray-600 dark:text-gray-400">{invoice.clientName}</Text>
              </div>
              
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
                  <Icon name={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'clock' : 'warning'} size={IconSizes.sm} color={config.color.includes('green') ? IconColors.success : config.color.includes('yellow') ? IconColors.warning : IconColors.danger} />
                  {invoice.status.toUpperCase()}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-end">
              <div>
                <Text className="text-2xl font-bold text-primary">${invoice.total.toFixed(2)}</Text>
                <Text className="text-sm text-gray-500 mt-1">
                  Due: {new Date(invoice.dueDate).toLocaleDateString()}
                </Text>
              </div>
              
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Icon name="view" size={IconSizes.md} />
                </button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Icon name="edit" size={IconSizes.md} />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                  <Icon name="delete" size={IconSizes.md} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button 
              onPress={() => handlePremiumFeature('analytics')} 
              variant={isPremium() ? "secondary" : "outline"}
              className="flex items-center gap-2"
            >
              <Icon name="analytics" size={IconSizes.sm} />
              Analytics {!isPremium() && '(Pro)'}
            </Button>
            
            <Button 
              onPress={() => handlePremiumFeature('templates')} 
              variant={isPremium() ? "secondary" : "outline"}
              className="flex items-center gap-2"  
            >
              <Icon name="template" size={IconSizes.sm} />
              Templates {!isPremium() && '(Pro)'}
            </Button>
            
            <Button 
              onPress={() => handlePremiumFeature('export')} 
              variant={isPremium() ? "secondary" : "outline"}
              className="flex items-center gap-2"
            >
              <Icon name="download" size={IconSizes.sm} />
              Export {!isPremium() && '(Pro)'}
            </Button>
            
            <Button onPress={onCreateInvoice} variant="primary">
              <Icon name="add" size={IconSizes.sm} />
              Create Invoice
            </Button>
            <Button onPress={onNavigateToEstimates} variant="secondary">
              <Icon name="document" size={IconSizes.sm} />
              Estimates
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {!loading && <StatsBar />}

        {/* Search and Filter Bar */}
        <Card variant="elevated" className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="search" size={IconSizes.md} color={IconColors.muted} />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Search invoices by number or client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            
            {/* Bulk Actions */}
            {filteredInvoices.length > 0 && (
              <div className="flex gap-2">
                <Button 
                  onPress={selectAllInvoices} 
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  Select All
                </Button>
                {selectedInvoices.size > 0 && (
                  <Button 
                    onPress={clearSelection} 
                    variant="secondary"
                    className="whitespace-nowrap"
                  >
                    Clear ({selectedInvoices.size})
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <Text className="text-blue-800 dark:text-blue-200 font-medium">
                {selectedInvoices.size} invoice{selectedInvoices.size !== 1 ? 's' : ''} selected
              </Text>
              <div className="flex gap-2">
                <Button variant="outline" className="text-sm">
                  <Icon name="mail" size={IconSizes.sm} />
                  Send Reminder
                </Button>
                <Button 
                  variant="outline" 
                  className="text-sm"
                  onPress={() => handlePremiumFeature('export')}
                >
                  <Icon name="download" size={IconSizes.sm} />
                  Export Selected
                </Button>
                <Button variant="secondary" className="text-sm text-red-600">
                  <Icon name="delete" size={IconSizes.sm} />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Content Area */}
        {loading && invoices.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredInvoices.length === 0 && invoices.length > 0 ? (
          <Card className="text-center py-12">
            <Icon name="search" size={IconSizes.xxl} color={IconColors.muted} />
            <Text className="text-xl text-gray-600 dark:text-gray-400 mb-2 mt-4">No invoices found</Text>
            <Text className="text-gray-500 dark:text-gray-500">Try adjusting your search or filter criteria</Text>
          </Card>
        ) : invoices.length === 0 ? (
          <Card className="text-center py-16">
            <div className="mb-6">
              <Icon name="invoice" size={IconSizes.xxl} color={IconColors.light} />
            </div>
            <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Welcome to your invoice dashboard
            </Text>
            <Text className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Create professional invoices in minutes. Track payments, manage clients, and grow your business with our powerful invoicing tools.
            </Text>
            
            {!isPremium() && (
              <Card variant="feature" className="mb-6 mx-auto max-w-md text-center animate-bounce-subtle">
                <div className="card-header">
                  <Icon name="trending" size={30} color={IconColors.primary} className="mb-4 mx-auto" />
                  <div className="card-header-title">Upgrade to Pro</div>
                  <div className="card-header-subtitle">
                    Unlock advanced analytics, custom templates, bulk exports, and more
                  </div>
                </div>
                <div className="card-content">
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1"><Icon name="success" size={IconSizes.sm} color={IconColors.success} /> Unlimited invoices</div>
                    <div className="flex items-center gap-1"><Icon name="success" size={IconSizes.sm} color={IconColors.success} /> Custom templates</div>
                    <div className="flex items-center gap-1"><Icon name="success" size={IconSizes.sm} color={IconColors.success} /> Advanced analytics</div>
                    <div className="flex items-center gap-1"><Icon name="success" size={IconSizes.sm} color={IconColors.success} /> Bulk export</div>
                  </div>
                  <div className="text-2xl font-bold text-primary mb-2">$4.99/month</div>
                  <div className="text-sm text-gray-600">or $39.99/year (save 33%)</div>
                </div>
                <div className="card-actions justify-center">
                  <Button variant="primary" className="px-8 animate-pulse">
                    Upgrade Now
                  </Button>
                </div>
              </Card>
            )}
            
            <Button onPress={onCreateInvoice} variant="primary" className="text-lg px-8 py-4">
              <Icon name="add" size={IconSizes.md} />
              Create Your First Invoice
            </Button>
          </Card>
        ) : (
          <div>
            {filteredInvoices.map(invoice => (
              <div key={invoice.id} onClick={(e) => {
                // Don't trigger selection if clicking on checkbox or action buttons
                if (e.target.type !== 'checkbox' && !e.target.closest('button')) {
                  onSelectInvoice(invoice);
                }
              }}>
                <InvoiceItem invoice={invoice} />
              </div>
            ))}
            {hasMore && (
              <div ref={ref} className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Mobile Stats Component
  const MobileStats = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
      <View className="flex-row gap-4 px-4">
        <Card className="min-w-[140px] text-center">
          <Icon name="revenue" size={IconSizes.md} color={IconColors.success} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text className="text-2xl font-bold text-green-600">${stats.totalRevenue.toLocaleString()}</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</Text>
        </Card>
        
        <Card className="min-w-[140px] text-center">
          <Icon name="invoice" size={IconSizes.md} color={IconColors.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text className="text-2xl font-bold text-blue-600">{stats.invoicesThisMonth}</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">This Month</Text>
        </Card>
        
        <Card className="min-w-[140px] text-center">
          <Icon name="success" size={IconSizes.md} color={IconColors.success} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text className="text-2xl font-bold text-green-600">{stats.paidCount}</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">Paid</Text>
        </Card>
        
        <Card className="min-w-[140px] text-center">
          <Icon name="clock" size={IconSizes.md} color={IconColors.danger} style={{ alignSelf: 'center', marginBottom: 8 }} />
          <Text className="text-2xl font-bold text-red-600">{stats.overdueCount}</Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">Overdue</Text>
        </Card>
      </View>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView className="flex-1">
        <View className="px-4 py-8">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</Text>
            <View className="flex-row">
              <TouchableOpacity onPress={onNavigateToEstimates}>
                <View className="bg-primary rounded-full p-3 mr-2">
                  <MaterialIcons name="description" size={20} color="white" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={onCreateInvoice}>
                <View className="bg-primary rounded-full p-3">
                  <MaterialIcons name="add" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Actions */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className="flex-row gap-3 px-4">
              <TouchableOpacity 
                onPress={() => handlePremiumFeature('analytics')}
                className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2 ${
                  isPremium() ? 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600' : 'border-primary'
                }`}
              >
                <MaterialIcons name="analytics" size={16} color={isPremium() ? "#6b7280" : "#2563eb"} />
                <Text className={isPremium() ? "text-gray-800 dark:text-white" : "text-primary"}>
                  Analytics {!isPremium() && '(Pro)'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => handlePremiumFeature('templates')}
                className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2 ${
                  isPremium() ? 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600' : 'border-primary'
                }`}
              >
                <MaterialIcons name="description" size={16} color={isPremium() ? "#6b7280" : "#2563eb"} />
                <Text className={isPremium() ? "text-gray-800 dark:text-white" : "text-primary"}>
                  Templates {!isPremium() && '(Pro)'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => handlePremiumFeature('export')}
                className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl border-2 ${
                  isPremium() ? 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600' : 'border-primary'
                }`}
              >
                <MaterialIcons name="file-download" size={16} color={isPremium() ? "#6b7280" : "#2563eb"} />
                <Text className={isPremium() ? "text-gray-800 dark:text-white" : "text-primary"}>
                  Export {!isPremium() && '(Pro)'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Stats */}
          {!loading && <MobileStats />}

          {/* Search and Filter */}
          <Card className="mb-6">
            <View className="gap-4">
              <View className="relative">
                <View className="absolute left-3 top-3 z-10">
                  <Icon name="search" size={IconSizes.md} color={IconColors.muted} />
                </View>
                <TextInput
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-white placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              
              <View className="flex-row gap-2">
                {['all', 'paid', 'pending', 'overdue'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-xl ${
                      statusFilter === status 
                        ? 'bg-primary' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      statusFilter === status 
                        ? 'text-white' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>

          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20">
              <View className="flex-row justify-between items-center">
                <Text className="text-blue-800 dark:text-blue-200 font-medium">
                  {selectedInvoices.size} selected
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity className="p-2">
                    <MaterialIcons name="mail" size={20} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity className="p-2" onPress={() => handlePremiumFeature('export')}>
                    <MaterialIcons name="file-download" size={20} color="#2563eb" />
                  </TouchableOpacity>
                  <TouchableOpacity className="p-2">
                    <MaterialIcons name="delete" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
        </View>

        {/* Invoice List */}
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View className="px-4">
              <TouchableOpacity 
                onPress={(e) => {
                  onSelectInvoice(item);
                }}
                activeOpacity={0.7}
              >
                <InvoiceItem invoice={item} />
              </TouchableOpacity>
            </View>
          )}
          onEndReached={() => hasMore && !loading && loadInvoices(page + 1)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={() => (
            <View className="px-4">
              {loading ? (
                <View className="flex justify-center py-12">
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              ) : filteredInvoices.length === 0 && invoices.length > 0 ? (
                <Card className="text-center py-12">
                  <MaterialIcons name="search-off" size={40} color="#6b7280" style={{ alignSelf: 'center' }} />
                  <Text className="text-xl text-gray-600 dark:text-gray-400 mb-2 mt-4">No invoices found</Text>
                  <Text className="text-gray-500 dark:text-gray-500">Try adjusting your search</Text>
                </Card>
              ) : (
                <Card className="text-center py-16">
                  <MaterialIcons name="receipt-long" size={48} color="#e5e7eb" style={{ alignSelf: 'center', marginBottom: 24 }} />
                  <Text className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                    Welcome to your dashboard
                  </Text>
                  <Text className="text-gray-600 dark:text-gray-400 mb-8 text-center">
                    Create professional invoices and track payments with ease.
                  </Text>
                  
                  {!isPremium() && (
                    <View className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-2xl mb-6">
                      <Text className="text-lg font-semibold text-white mb-2">Upgrade to Pro</Text>
                      <Text className="text-sm text-white opacity-90 mb-4">
                        Get analytics, templates, and more for $4.99/month.
                      </Text>
                      <TouchableOpacity className="bg-white rounded-xl py-3 px-6">
                        <Text className="text-blue-600 font-semibold text-center">Upgrade Now</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <Button onPress={onCreateInvoice} variant="primary">
                    Create Your First Invoice
                  </Button>
                </Card>
              )}
            </View>
          )}
          ListFooterComponent={() => loading && hasMore && (
            <View className="py-4">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          )}
          scrollEnabled={false}
        />
      </ScrollView>
    </View>
  );
};

export default Dashboard;