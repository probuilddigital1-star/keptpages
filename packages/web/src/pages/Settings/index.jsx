import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { PLANS } from '@/config/plans';
import { formatDate } from '@/utils/formatters';

export default function Settings() {
  // Auth state
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Subscription state
  const tier = useSubscriptionStore((s) => s.tier);
  const usage = useSubscriptionStore((s) => s.usage);
  const limits = useSubscriptionStore((s) => s.limits);
  const subLoading = useSubscriptionStore((s) => s.loading);
  const fetchSubscription = useSubscriptionStore((s) => s.fetchSubscription);
  const purchaseKeeperPass = useSubscriptionStore((s) => s.purchaseKeeperPass);

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    fetchSubscription().catch(() => {});
  }, [fetchSubscription]);

  // Scroll to subscription card when navigated with #subscription hash
  useEffect(() => {
    if (window.location.hash === '#subscription') {
      const el = document.getElementById('subscription');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.name || '');
      setAvatarPreview(user.user_metadata?.avatar_url || null);
    }
  }, [user]);

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    setSaving(true);
    try {
      const formData = { name: displayName.trim() };
      if (avatarFile) {
        const uploadResult = await api.upload('/user/avatar', avatarFile);
        formData.avatar_url = uploadResult.url;
      }
      await api.put('/user/profile', formData);
      toast('Profile updated!');
    } catch {
      toast('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  }, [displayName, avatarFile]);

  // Handle avatar file selection
  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    setUploadingAvatar(true);
    try {
      const uploadResult = await api.upload('/user/avatar', file);
      setAvatarPreview(uploadResult.url);
    } catch {
      toast('Failed to upload avatar.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  }, []);

  // Upgrade to Keeper Pass
  const handleUpgrade = useCallback(async () => {
    try {
      const result = await purchaseKeeperPass();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      toast('Failed to start upgrade. Please try again.', 'error');
    }
  }, [purchaseKeeperPass]);

  // Export data
  const handleExportData = useCallback(async () => {
    setExportingData(true);
    try {
      const result = await api.post('/user/export');
      if (result?.url) {
        const blob = await api.getBlob(result.url);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = 'keptpages-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }
      toast('Your data export is ready!');
    } catch {
      toast('Failed to export data.', 'error');
    } finally {
      setExportingData(false);
    }
  }, []);

  // Delete account
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.delete('/user/account');
      await logout();
      toast('Account deleted.');
    } catch {
      toast('Failed to delete account.', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }, [deleteConfirm, logout]);

  const email = user?.email || '';
  const planInfo =
    tier === 'keeper'
      ? PLANS.KEEPER_PASS
      : tier === 'book_purchaser'
        ? PLANS.BOOK_PURCHASER
        : PLANS.FREE;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-container-md mx-auto">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-walnut mb-8">
        Settings
      </h1>

      {/* ================================================================= */}
      {/* Profile Section                                                   */}
      {/* ================================================================= */}
      <section className="mb-10">
        <h2 className="section-label mb-4">Profile</h2>
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar
                  src={avatarPreview}
                  name={displayName || email}
                  size="lg"
                />
                {uploadingAvatar && (
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"
                    data-testid="avatar-upload-spinner"
                  >
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
              </div>
              <label className="font-ui text-xs text-terracotta cursor-pointer hover:text-terracotta-hover transition-colors">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            {/* Fields */}
            <div className="flex-1 flex flex-col gap-4">
              <Input
                label="Display Name"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input
                label="Email"
                value={email}
                disabled
                className="opacity-70"
              />
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSaveProfile} loading={saving}>
              Save Changes
            </Button>
          </div>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* Subscription Section                                              */}
      {/* ================================================================= */}
      <section className="mb-10">
        <h2 className="section-label mb-4">Subscription</h2>
        <Card id="subscription" className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-ui text-sm font-medium text-walnut">
              Current Plan:
            </span>
            <Badge variant={tier === 'keeper' ? 'terracotta' : 'default'}>
              {planInfo.name}
            </Badge>
            {tier === 'keeper' && (
              <Badge variant="sage">Active</Badge>
            )}
          </div>

          {/* Usage stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-cream-alt rounded-md p-4 text-center">
              <p className="font-display text-2xl font-bold text-walnut">
                {usage.scans || 0}
              </p>
              <p className="font-ui text-xs text-walnut-secondary mt-1">
                {tier === 'keeper' ? 'Scans (unlimited)' : `of ${limits?.scans ?? 40} scans`}
              </p>
            </div>
            <div className="bg-cream-alt rounded-md p-4 text-center">
              <p className="font-display text-2xl font-bold text-walnut">
                {usage.collections || 0}
              </p>
              <p className="font-ui text-xs text-walnut-secondary mt-1">
                {tier === 'keeper' ? 'Collections (unlimited)' : `of ${limits?.collections ?? 2} collections`}
              </p>
            </div>
          </div>

          {/* Keeper users: active info */}
          {tier === 'keeper' && (
            <div className="bg-sage-light border border-sage/20 rounded-md p-5">
              <p className="font-ui text-sm text-walnut">
                You have unlimited access to all KeptPages features and{' '}
                <span className="font-semibold text-terracotta">15% off all book orders</span>.
              </p>
            </div>
          )}

          {/* Free / Book Purchaser users: Keeper Pass upsell */}
          {tier !== 'keeper' && (
            <div className="bg-terracotta-light border border-terracotta/20 rounded-md p-6">
              <h3 className="font-display text-lg font-semibold text-walnut mb-1">
                Get Keeper Pass
              </h3>
              <p className="font-body text-sm text-walnut-secondary mb-4">
                Unlock the full power of KeptPages for your family with a one-time purchase.
              </p>
              <ul className="space-y-2 mb-5">
                {PLANS.KEEPER_PASS.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 font-ui text-sm text-walnut"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-sage shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-2 mb-4">
                <span className="font-display text-3xl font-bold text-terracotta">
                  ${PLANS.KEEPER_PASS.price}
                </span>
                <span className="font-ui text-sm text-walnut-secondary pb-1">
                  one-time
                </span>
              </div>
              <Button onClick={handleUpgrade} loading={subLoading} size="lg">
                Get Keeper Pass
              </Button>
            </div>
          )}
        </Card>
      </section>

      {/* ================================================================= */}
      {/* Account Section                                                   */}
      {/* ================================================================= */}
      <section className="mb-10">
        <h2 className="section-label mb-4">Account</h2>
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={handleExportData}
              loading={exportingData}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export All Data
            </Button>

            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete Account
            </Button>
          </div>
        </Card>
      </section>

      {/* ================================================================= */}
      {/* Delete Account Modal                                              */}
      {/* ================================================================= */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirm('');
        }}
        title="Delete Account"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600 font-ui">
            This action is permanent and cannot be undone. All your data,
            collections, and scans will be deleted.
          </div>

          <p className="font-body text-walnut-secondary">
            Type <strong className="text-walnut">DELETE</strong> below to
            confirm.
          </p>

          <Input
            placeholder="Type DELETE to confirm"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoFocus
          />

          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm('');
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={deleteConfirm !== 'DELETE'}
              loading={deleting}
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
