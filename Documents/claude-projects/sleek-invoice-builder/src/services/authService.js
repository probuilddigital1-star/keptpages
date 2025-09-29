import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { logError, logInfo } from '../utils/errorHandler';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import storage from '../utils/storage';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userProfile = null;
    this.subscriptionTier = 'free';
    this.authCallbacks = [];
  }

  // Initialize user profile in Firestore
  async initializeUserProfile(user, additionalData = {}) {
    try {
      logInfo('AuthService.initializeUserProfile', `Initializing profile for user: ${user.uid}`);

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        logInfo('AuthService.initializeUserProfile', `Creating new user profile for: ${user.uid}`);

        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          avatar: user.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isAdmin: false, // Admin role - manually set to true in Firestore for admin users
          subscription: {
            tier: 'free',
            status: 'active',
            startDate: serverTimestamp()
          },
          usage: {
            invoicesThisMonth: 0,
            templatesUsed: 0,
            lastResetDate: serverTimestamp()
          },
          preferences: {
            theme: 'system',
            defaultLogo: '',
            defaultNotes: ''
          },
          ...additionalData
        };

        await setDoc(userRef, userData);
        logInfo('AuthService.initializeUserProfile', `User profile created successfully for: ${user.uid}`);
        return userData;
      }

      logInfo('AuthService.initializeUserProfile', `User profile already exists for: ${user.uid}`);
      return userDoc.data();
    } catch (error) {
      logError('AuthService.initializeUserProfile', error, { userId: user.uid });
      // Return a minimal profile to allow the app to continue
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        subscription: { tier: 'free', status: 'active' },
        usage: { invoicesThisMonth: 0 }
      };
    }
  }

  // Sign up with email and password
  async signUp(email, password, displayName = '') {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      const userProfile = await this.initializeUserProfile(user, { displayName });
      
      // Cache user data locally
      await storage.setItem('userProfile', JSON.stringify(userProfile));
      
      return { user, userProfile };
    } catch (error) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await this.loadUserProfile(user.uid);
      return user;
    } catch (error) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      this.currentUser = null;
      this.userProfile = null;
      this.subscriptionTier = 'free';
      await storage.removeItem('userProfile');
    } catch (error) {
      throw new Error('Sign out failed');
    }
  }

  // Load user profile from Firestore
  async loadUserProfile(uid) {
    try {
      console.log('[AuthService] Loading user profile for UID:', uid);
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        this.userProfile = userDoc.data();
        this.subscriptionTier = this.userProfile.subscription?.tier || 'free';

        console.log('[AuthService] User profile loaded:', this.userProfile);
        console.log('[AuthService] Subscription tier set to:', this.subscriptionTier);
        console.log('[AuthService] Full subscription data:', this.userProfile.subscription);

        // Cache user data locally
        await storage.setItem('userProfile', JSON.stringify(this.userProfile));

        // Check for monthly usage reset
        await this.checkMonthlyUsageReset();

        return this.userProfile;
      }

      console.log('[AuthService] User document does not exist in Firestore');
      return null;
    } catch (error) {
      logError('AuthService.to', error);
      
      // Try to load from cache if offline
      const cachedProfile = await storage.getItem('userProfile');
      if (cachedProfile) {
        this.userProfile = JSON.parse(cachedProfile);
        this.subscriptionTier = this.userProfile.subscription?.tier || 'free';
        return this.userProfile;
      }
      
      return null;
    }
  }

  // Check and reset monthly usage if needed
  async checkMonthlyUsageReset() {
    if (!this.currentUser || !this.userProfile) return;
    
    const lastReset = this.userProfile.usage?.lastResetDate?.toDate() || new Date(0);
    const now = new Date();
    
    // Reset if it's a new month
    if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        'usage.invoicesThisMonth': 0,
        'usage.templatesUsed': 0,
        'usage.lastResetDate': serverTimestamp()
      });
      
      // Update local profile
      this.userProfile.usage.invoicesThisMonth = 0;
      this.userProfile.usage.templatesUsed = 0;
    }
  }

  // Update user profile
  async updateUserProfile(updates) {
    if (!this.currentUser) throw new Error('No authenticated user');
    
    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);
      this.userProfile = { ...this.userProfile, ...updateData };
      
      // Update cache
      await storage.setItem('userProfile', JSON.stringify(this.userProfile));
      
      return this.userProfile;
    } catch (error) {
      throw new Error('Failed to update profile');
    }
  }

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Alias for resetPassword for compatibility
  async sendPasswordReset(email) {
    return this.resetPassword(email);
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    if (!this.currentUser) throw new Error('No authenticated user');
    
    try {
      const credential = EmailAuthProvider.credential(
        this.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(this.currentUser, credential);
      await updatePassword(this.currentUser, newPassword);
    } catch (error) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Check if user can create more invoices
  canCreateInvoice() {
    if (!this.userProfile) return false;

    const { subscription, usage } = this.userProfile;
    const tier = subscription?.tier || 'free';
    const status = subscription?.status || 'active';

    // Pro tier has unlimited invoices
    if (tier === 'pro' && status === 'active') {
      return true;
    }

    // Starter tier has 50 invoices/month
    if (tier === 'starter' && status === 'active') {
      return (usage?.invoicesThisMonth || 0) < 50;
    }

    // Free tier has 10 invoices/month
    return (usage?.invoicesThisMonth || 0) < 10;
  }

  // Get remaining free invoices
  getRemainingFreeInvoices() {
    if (!this.userProfile) return 0;

    const { subscription, usage } = this.userProfile;
    const tier = subscription?.tier || 'free';
    const status = subscription?.status || 'active';
    const invoicesUsed = usage?.invoicesThisMonth || 0;

    // Pro tier has unlimited
    if (tier === 'pro' && status === 'active') {
      return -1; // Unlimited
    }

    // Starter tier has 50/month
    if (tier === 'starter' && status === 'active') {
      return Math.max(0, 50 - invoicesUsed);
    }

    // Free tier has 10/month
    return Math.max(0, 10 - invoicesUsed);
  }

  // Check if user can use templates
  canUseTemplates() {
    if (!this.userProfile) return false;

    const { subscription, usage } = this.userProfile;
    const tier = subscription?.tier || 'free';
    const status = subscription?.status || 'active';

    // Pro tier has unlimited templates
    if (tier === 'pro' && status === 'active') {
      return true;
    }

    // Starter tier has 3 templates
    if (tier === 'starter' && status === 'active') {
      return (usage?.templatesUsed || 0) < 3;
    }

    // Free tier has 1 template
    return (usage?.templatesUsed || 0) < 1;
  }

  // Increment invoice usage
  async incrementInvoiceUsage() {
    try {
      // Must have a current user
      if (!this.currentUser) {
        console.error('[AuthService] No current user for incrementInvoiceUsage');
        return;
      }

      // Check monthly reset first
      await this.checkMonthlyUsageReset();

      // Load profile if not available
      if (!this.userProfile) {
        await this.loadUserProfile(this.currentUser.uid);
      }

      // Still no profile? Initialize it
      if (!this.userProfile) {
        await this.initializeUserProfile(this.currentUser);
        await this.loadUserProfile(this.currentUser.uid);
      }

      const userRef = doc(db, 'users', this.currentUser.uid);
      const currentCount = this.userProfile?.usage?.invoicesThisMonth || 0;
      const newCount = currentCount + 1;

      console.log('[AuthService] Incrementing invoice usage:', { currentCount, newCount });

      await updateDoc(userRef, {
        'usage.invoicesThisMonth': newCount,
        'usage.lastUpdated': serverTimestamp()
      });

      // Update local profile
      if (this.userProfile && this.userProfile.usage) {
        this.userProfile.usage.invoicesThisMonth = newCount;
      }

      console.log('[AuthService] Invoice usage incremented successfully');
      return newCount;
    } catch (error) {
      console.error('[AuthService] Failed to increment invoice usage:', error);
      logError('AuthService.incrementInvoiceUsage', error);
      throw error;
    }
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback) {
    this.authCallbacks.push(callback);
    
    return onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        await this.loadUserProfile(user.uid);
      } else {
        this.userProfile = null;
        this.subscriptionTier = 'free';
      }
      
      this.authCallbacks.forEach(cb => cb(user, this.userProfile));
    });
  }

  // Get user-friendly error messages
  getAuthErrorMessage(errorCode) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/too-many-requests': 'Too many failed attempts. Try again later',
      'auth/requires-recent-login': 'Please sign in again to complete this action',
      'auth/network-request-failed': 'Network error. Please check your connection'
    };
    
    return errorMessages[errorCode] || 'An error occurred during authentication';
  }

  // Check if user is premium
  isPremium() {
    if (!this.userProfile?.subscription) return false;

    const tier = this.userProfile.subscription.tier || 'free';
    const status = this.userProfile.subscription.status || 'active';

    // Both starter and pro tiers are considered premium (paid)
    return (tier === 'starter' || tier === 'pro') && status === 'active';
  }

  // Check if current user is admin
  isAdmin() {
    // Handle both boolean true and string "true" (for backwards compatibility)
    return this.userProfile?.isAdmin === true || this.userProfile?.isAdmin === 'true';
  }

  // Check if user can use logo feature (starter or pro subscription)
  canUseLogo() {
    console.log('[AuthService] canUseLogo called');
    console.log('[AuthService] userProfile:', this.userProfile);
    console.log('[AuthService] subscription:', this.userProfile?.subscription);

    if (!this.userProfile?.subscription) {
      console.log('[AuthService] No subscription found - returning false');
      return false;
    }

    const tier = this.userProfile.subscription.tier;
    const status = this.userProfile.subscription.status;
    const canUse = status === 'active' && (tier === 'starter' || tier === 'pro');

    console.log('[AuthService] Subscription tier:', tier);
    console.log('[AuthService] Subscription status:', status);
    console.log('[AuthService] Can use logo:', canUse);

    return canUse;
  }

  // Get subscription status
  getSubscriptionStatus() {
    if (!this.userProfile?.subscription) {
      return { tier: 'free', status: 'active' };
    }

    const subscription = this.userProfile.subscription;
    const tier = subscription.tier || 'free';
    const status = subscription.status || 'active';
    const type = subscription.type || 'monthly';

    // Handle free tier
    if (tier === 'free') {
      return { tier: 'free', status: 'active' };
    }

    // Handle lifetime purchases
    if (type === 'lifetime') {
      return {
        tier: tier,
        status: 'active',
        type: 'lifetime'
      };
    }

    // Check for expiration using currentPeriodEnd
    if (subscription.currentPeriodEnd) {
      const now = new Date();
      let endDate;

      // Handle Firestore Timestamp
      if (subscription.currentPeriodEnd.toDate) {
        endDate = subscription.currentPeriodEnd.toDate();
      } else if (subscription.currentPeriodEnd.seconds) {
        endDate = new Date(subscription.currentPeriodEnd.seconds * 1000);
      } else {
        endDate = new Date(subscription.currentPeriodEnd);
      }

      if (endDate < now && !subscription.cancelAtPeriodEnd) {
        return {
          tier: tier,
          status: 'expired',
          type: type,
          endDate: endDate
        };
      }
    }

    return {
      tier: tier,
      status: status,
      type: type,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    };
  }
}

export default new AuthService();