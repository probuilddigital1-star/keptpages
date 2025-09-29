import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import authService from '../services/authService';
import Button from '../components/ui/Button';

const AdminUsers = ({ onNavigate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Modification form state
  const [modifyForm, setModifyForm] = useState({
    tier: '',
    duration: 'month',
    customEndDate: '',
    reason: '',
    additionalInvoices: 0,
    resetCount: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (search = '') => {
    setLoading(true);
    setError(null);

    try {
      const getUsers = httpsCallable(functions, 'adminGetUsers');
      const result = await getUsers({ searchTerm: search });
      setUsers(result.data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers(searchTerm);
  };

  const handleModifySubscription = async () => {
    if (!selectedUser) return;

    try {
      const modifySubscription = httpsCallable(functions, 'adminModifySubscription');
      await modifySubscription({
        userId: selectedUser.id,
        tier: modifyForm.tier,
        duration: modifyForm.duration,
        customEndDate: modifyForm.customEndDate,
        reason: modifyForm.reason
      });

      // Adjust invoice limits if needed
      if (modifyForm.additionalInvoices > 0 || modifyForm.resetCount) {
        const adjustLimits = httpsCallable(functions, 'adminAdjustInvoiceLimits');
        await adjustLimits({
          userId: selectedUser.id,
          additionalInvoices: modifyForm.additionalInvoices,
          resetCount: modifyForm.resetCount,
          reason: modifyForm.reason
        });
      }

      alert('User subscription updated successfully!');
      setShowModifyModal(false);
      loadUsers(searchTerm);
    } catch (err) {
      console.error('Failed to modify subscription:', err);
      alert('Failed to modify subscription: ' + err.message);
    }
  };

  const handleGrantReferral = async (userId, rewardType) => {
    try {
      const grantReward = httpsCallable(functions, 'adminGrantReferralReward');
      await grantReward({
        referrerId: userId,
        rewardType: rewardType,
        rewardValue: rewardType === 'bonus_invoices' ? 10 : 1,
        reason: 'Admin manual grant'
      });

      alert('Referral reward granted successfully!');
      loadUsers(searchTerm);
    } catch (err) {
      console.error('Failed to grant reward:', err);
      alert('Failed to grant reward: ' + err.message);
    }
  };

  const loadUserDetails = async (userId) => {
    try {
      const getUserDetails = httpsCallable(functions, 'adminGetUserDetails');
      const result = await getUserDetails({ userId });
      setSelectedUser(result.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to load user details:', err);
      alert('Failed to load user details: ' + err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() :
                 timestamp.seconds ? new Date(timestamp.seconds * 1000) :
                 new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!authService.isAdmin()) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-red-800 font-semibold">Access Denied</h2>
            <p className="text-red-600">You do not have admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <Button variant="secondary" onClick={() => onNavigate('admin')}>
              Back to Dashboard
            </Button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <Button type="submit">Search</Button>
          </form>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.displayName || 'No name'}
                        </div>
                        {user.isAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.subscription?.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
                        user.subscription?.tier === 'starter' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.subscription?.tier || 'free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.usage?.invoicesThisMonth || 0} invoices
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadUserDetails(user.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModifyForm({
                              tier: user.subscription?.tier || 'free',
                              duration: 'month',
                              customEndDate: '',
                              reason: '',
                              additionalInvoices: 0,
                              resetCount: false
                            });
                            setShowModifyModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Modify
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modify Subscription Modal */}
        {showModifyModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Modify User: {selectedUser.email}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={modifyForm.tier}
                    onChange={(e) => setModifyForm({ ...modifyForm, tier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={modifyForm.duration}
                    onChange={(e) => setModifyForm({ ...modifyForm, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="week">1 Week</option>
                    <option value="month">1 Month</option>
                    <option value="year">1 Year</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Invoices
                  </label>
                  <input
                    type="number"
                    value={modifyForm.additionalInvoices}
                    onChange={(e) => setModifyForm({ ...modifyForm, additionalInvoices: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={modifyForm.resetCount}
                      onChange={(e) => setModifyForm({ ...modifyForm, resetCount: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Reset invoice count
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={modifyForm.reason}
                    onChange={(e) => setModifyForm({ ...modifyForm, reason: e.target.value })}
                    placeholder="Customer service, testing, etc."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleModifySubscription}>
                    Apply Changes
                  </Button>
                  <Button variant="secondary" onClick={() => setShowModifyModal(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showDetailsModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Details: {selectedUser.user?.email}
              </h3>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Statistics</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Total Invoices:</span>
                      <span className="ml-2 font-medium">{selectedUser.stats?.totalInvoices || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">This Month:</span>
                      <span className="ml-2 font-medium">{selectedUser.stats?.invoicesThisMonth || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Bonus Invoices:</span>
                      <span className="ml-2 font-medium">{selectedUser.stats?.bonusInvoices || 0}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleGrantReferral(selectedUser.user?.id, 'free_month')}
                    >
                      Grant Free Month
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleGrantReferral(selectedUser.user?.id, 'bonus_invoices')}
                    >
                      Add 10 Invoices
                    </Button>
                  </div>
                </div>

                {selectedUser.recentActivity && selectedUser.recentActivity.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Invoices</h4>
                    <div className="space-y-2">
                      {selectedUser.recentActivity.map((invoice) => (
                        <div key={invoice.id} className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-sm">
                          <div className="flex justify-between">
                            <span>{invoice.number}</span>
                            <span>{invoice.clientName}</span>
                            <span>${invoice.total}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;