// Utility to manually update user subscription in Firestore
// This can be used to fix subscription data for testing

import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Update a user's subscription tier in Firestore
 * @param {string} userId - The user's UID
 * @param {string} tier - The subscription tier ('free', 'starter', or 'pro')
 * @param {string} type - The subscription type ('monthly', 'yearly', or 'lifetime')
 */
export async function updateUserSubscription(userId, tier = 'starter', type = 'monthly') {
  try {
    console.log(`[UpdateSubscription] Updating user ${userId} to ${tier} (${type})`);

    const userRef = doc(db, 'users', userId);

    // First check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('[UpdateSubscription] User document not found');
      return false;
    }

    const currentData = userDoc.data();
    console.log('[UpdateSubscription] Current subscription:', currentData.subscription);

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = null;

    if (type === 'monthly') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (type === 'yearly') {
      endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    // For lifetime, endDate remains null

    // Update subscription data
    const subscriptionData = {
      'subscription.tier': tier,
      'subscription.status': 'active',
      'subscription.type': type,
      'subscription.startDate': serverTimestamp(),
      'subscription.updatedAt': serverTimestamp()
    };

    if (endDate && type !== 'lifetime') {
      subscriptionData['subscription.endDate'] = endDate;
    }

    // Update the document
    await updateDoc(userRef, subscriptionData);

    console.log('[UpdateSubscription] Subscription updated successfully');
    console.log('[UpdateSubscription] New subscription:', {
      tier,
      status: 'active',
      type,
      startDate: startDate.toISOString(),
      endDate: endDate ? endDate.toISOString() : 'N/A (lifetime)'
    });

    // Verify the update
    const updatedDoc = await getDoc(userRef);
    const updatedData = updatedDoc.data();
    console.log('[UpdateSubscription] Verified subscription:', updatedData.subscription);

    return true;
  } catch (error) {
    console.error('[UpdateSubscription] Error updating subscription:', error);
    return false;
  }
}

/**
 * Helper function to update user by email instead of UID
 */
export async function updateUserSubscriptionByEmail(email, tier = 'starter', type = 'monthly') {
  // This would need to query the users collection by email
  // Firebase doesn't allow direct email queries without an index
  // So this is mainly for reference - use the UID version instead
  console.log(`[UpdateSubscription] Note: Use updateUserSubscription with UID instead`);
  console.log(`[UpdateSubscription] Email provided: ${email}`);
  console.log(`[UpdateSubscription] You can find the UID in Firebase Console or from auth state`);
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.updateUserSubscription = updateUserSubscription;
  window.updateUserSubscriptionByEmail = updateUserSubscriptionByEmail;

  console.log('[UpdateSubscription] Functions available in console:');
  console.log('- updateUserSubscription(userId, tier, type)');
  console.log('- Example: updateUserSubscription("abc123", "starter", "monthly")');
  console.log('- Tiers: "free", "starter", "pro"');
  console.log('- Types: "monthly", "yearly", "lifetime"');
}