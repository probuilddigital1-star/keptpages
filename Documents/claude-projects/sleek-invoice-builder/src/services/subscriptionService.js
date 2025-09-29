import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config';
import authService from './authService';
import { logError, logInfo, logWarning } from '../utils/errorHandler';
// Check platform
const isWeb = typeof window !== 'undefined';
const isMobile = !isWeb; // In a real React Native environment, this would be true

// Conditionally import IAP for mobile platforms only
let IAP = null;
if (isMobile) {
  try {
    IAP = require('react-native-iap');
  } catch (error) {
    // console.warn('react-native-iap not available:', error.message);
  }
}

// Product IDs for Google Play
const PRODUCT_IDS = {
  MONTHLY: 'com.sleekInvoice.pro.monthly',
  YEARLY: 'com.sleekInvoice.pro.yearly',
  LIFETIME: 'com.sleekInvoice.pro.lifetime'
};

class SubscriptionService {
  constructor() {
    this.verifyPurchase = httpsCallable(functions, 'verifyPurchase');
    this.cancelSubscription = httpsCallable(functions, 'cancelSubscription');
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
  }

  // Initialize IAP
  async initializeIAP() {
    try {
      if (isMobile && IAP) {
        await IAP.initConnection();
        
        // Get available products
        const products = await IAP.getSubscriptions([
          PRODUCT_IDS.MONTHLY,
          PRODUCT_IDS.YEARLY
        ]);
        
        const inAppProducts = await IAP.getProducts([PRODUCT_IDS.LIFETIME]);
        
        return [...products, ...inAppProducts];
      }
      return [];
    } catch (error) {
      logError('SubscriptionService.initializeIAP', error);
      return [];
    }
  }

  // Setup purchase listeners
  setupPurchaseListeners() {
    if (!isMobile || !IAP) return;

    // Listen for successful purchases
    this.purchaseUpdateSubscription = IAP.purchaseUpdatedListener(
      async (purchase) => {
        const receipt = purchase.transactionReceipt;
        if (receipt) {
          try {
            // Verify purchase with backend
            await this.verifyGooglePlayPurchase(
              purchase.purchaseToken,
              purchase.productId
            );
            
            // Finish the transaction
            await IAP.finishTransaction({ purchase, isConsumable: false });
          } catch (error) {
            logError('SubscriptionService.purchaseVerification', error, { productId });
            // Still finish transaction to avoid blocking
            await IAP.finishTransaction({ purchase, isConsumable: false });
          }
        }
      }
    );

    // Listen for purchase errors
    this.purchaseErrorSubscription = IAP.purchaseErrorListener(
      (error) => {
        logError('SubscriptionService.purchase', error, { productId });
      }
    );
  }

  // Cleanup purchase listeners
  cleanupPurchaseListeners() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
  }

  // Purchase a subscription
  async purchaseSubscription(productId) {
    if (!isMobile || !IAP) {
      throw new Error('In-app purchases are only available on Android');
    }

    try {
      await IAP.requestSubscription({ sku: productId });
    } catch (error) {
      if (error.code === 'E_USER_CANCELLED') {
        throw new Error('Purchase cancelled');
      }
      throw error;
    }
  }

  // Purchase lifetime access
  async purchaseLifetime() {
    if (!isMobile || !IAP) {
      throw new Error('In-app purchases are only available on Android');
    }

    try {
      await IAP.requestPurchase({ 
        sku: PRODUCT_IDS.LIFETIME,
        andDangerouslyFinishTransactionAutomaticallyIOS: false
      });
    } catch (error) {
      if (error.code === 'E_USER_CANCELLED') {
        throw new Error('Purchase cancelled');
      }
      throw error;
    }
  }

  // Verify Google Play purchase
  async verifyGooglePlayPurchase(purchaseToken, productId) {
    try {
      const result = await this.verifyPurchase({
        purchaseToken,
        productId,
        platform: 'android'
      });
      
      if (result.data.success) {
        await this.updateUserSubscription(result.data.subscription);
        return result.data;
      }
      
      throw new Error(result.data.error || 'Purchase verification failed');
    } catch (error) {
      logError('SubscriptionService.verifyPurchase', error, { purchaseToken });
      throw error;
    }
  }

  // Update user subscription in Firestore
  async updateUserSubscription(subscriptionData) {
    if (!authService.currentUser) throw new Error('No authenticated user');
    
    try {
      const userRef = doc(db, 'users', authService.currentUser.uid);
      const subscriptionRef = collection(db, 'subscriptions');
      
      // Determine subscription type and duration
      let subscriptionType = 'monthly';
      let endDate = null;
      
      if (subscriptionData.productId === PRODUCT_IDS.YEARLY) {
        subscriptionType = 'yearly';
      } else if (subscriptionData.productId === PRODUCT_IDS.LIFETIME) {
        subscriptionType = 'lifetime';
      }
      
      if (subscriptionType !== 'lifetime' && subscriptionData.expiryTime) {
        endDate = new Date(subscriptionData.expiryTime);
      }
      
      // Update user document
      await updateDoc(userRef, {
        subscription: {
          tier: 'pro',
          status: subscriptionData.status || 'active',
          type: subscriptionType,
          startDate: serverTimestamp(),
          endDate: endDate,
          purchaseToken: subscriptionData.purchaseToken,
          orderId: subscriptionData.orderId,
          autoRenewing: subscriptionData.autoRenewing || false
        },
        updatedAt: serverTimestamp()
      });
      
      // Create subscription record
      await addDoc(subscriptionRef, {
        userId: authService.currentUser.uid,
        ...subscriptionData,
        createdAt: serverTimestamp()
      });
      
      // Reload user profile
      await authService.loadUserProfile(authService.currentUser.uid);
      
    } catch (error) {
      logError('SubscriptionService.updateSubscription', error, { plan });
      throw error;
    }
  }

  // Restore purchases
  async restorePurchases() {
    if (!isMobile || !IAP) {
      throw new Error('Purchase restoration is only available on Android');
    }

    try {
      const purchases = await IAP.getAvailablePurchases();
      
      if (purchases.length === 0) {
        throw new Error('No purchases found to restore');
      }
      
      // Verify the most recent purchase
      const latestPurchase = purchases.sort((a, b) => 
        b.transactionDate - a.transactionDate
      )[0];
      
      await this.verifyGooglePlayPurchase(
        latestPurchase.purchaseToken,
        latestPurchase.productId
      );
      
      return true;
    } catch (error) {
      logError('SubscriptionService.restorePurchases', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelUserSubscription() {
    try {
      const result = await this.cancelSubscription();
      
      if (result.data.success) {
        await authService.loadUserProfile(authService.currentUser.uid);
        return result.data;
      }
      
      throw new Error(result.data.error || 'Cancellation failed');
    } catch (error) {
      logError('SubscriptionService.cancelSubscription', error);
      throw error;
    }
  }

  // Get subscription status
  getSubscriptionStatus() {
    return authService.getSubscriptionStatus();
  }

  // Check if subscription is active
  isSubscriptionActive() {
    const status = this.getSubscriptionStatus();
    return status && status.tier === 'pro' && status.status === 'active';
  }

  // Format price for display
  formatPrice(price) {
    if (typeof price === 'number') {
      return `$${price.toFixed(2)}`;
    }
    return price || 'N/A';
  }

  // Get pricing information
  getPricing() {
    return {
      monthly: {
        price: '$4.99',
        period: 'month',
        features: [
          'Unlimited invoices',
          'All premium templates',
          'Analytics dashboard',
          'Priority support',
          'No watermark'
        ]
      },
      yearly: {
        price: '$39.99',
        period: 'year',
        savings: '33%',
        features: [
          'Everything in monthly',
          'Save $20 per year',
          'Early access to new features'
        ]
      },
      lifetime: {
        price: '$99.99',
        period: 'one-time',
        features: [
          'Everything in Pro',
          'Lifetime updates',
          'No recurring fees',
          'Best value'
        ]
      }
    };
  }
}

export default new SubscriptionService();