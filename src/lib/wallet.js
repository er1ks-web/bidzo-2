import { supabase } from '@/supabase'

export const LISTING_FEE = 0.50;
export const MIN_TOPUP = 5;

/**
 * Get the current user's wallet state (balance + free listings).
 * Falls back to 0 / 3 for brand-new users who have never had these fields set.
 */
export async function getWalletState(userId) {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)

  if (error) console.log(error)

  const tx = Array.isArray(data) ? data : []
  const wallet_balance = tx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  const freeUsed = tx.filter(t => t.transaction_type === 'listing_fee' && (Number(t.amount) || 0) === 0).length
  const free_listings_remaining = Math.max(0, 3 - freeUsed)

  return { wallet_balance, free_listings_remaining };
}

/**
 * Check if user can publish. Returns { canPublish, usesFree, usesWallet, reason }
 */
export function checkPublishEligibility({ wallet_balance, free_listings_remaining }) {
  if (free_listings_remaining > 0) {
    return { canPublish: true, usesFree: true, usesWallet: false };
  }
  if (wallet_balance >= LISTING_FEE) {
    return { canPublish: true, usesFree: false, usesWallet: true };
  }
  return {
    canPublish: false,
    usesFree: false,
    usesWallet: false,
    reason: `You need at least €${LISTING_FEE.toFixed(2)} in your wallet to publish. Minimum top-up is €${MIN_TOPUP}.`,
  };
}

/**
 * Deduct listing fee from the user. Handles free listing or wallet deduction.
 */
export async function chargeListingFee(user, walletState, listingId) {
  if (walletState.free_listings_remaining > 0) {
    const { error } = await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      transaction_type: 'listing_fee',
      amount: 0,
      description: 'Free listing used',
      related_listing_id: listingId,
    })

    if (error) console.log(error)
  } else {
    const { error } = await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      transaction_type: 'listing_fee',
      amount: -LISTING_FEE,
      description: 'Listing fee',
      related_listing_id: listingId,
    })

    if (error) console.log(error)
  }
}

/**
 * Top up wallet balance (mock — ready for Stripe integration).
 */
export async function topUpWallet(user, amount, currentBalance) {
  const newBalance = (currentBalance ?? 0) + amount;
  const { error } = await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    transaction_type: 'top_up',
    amount,
    description: `Wallet top-up €${amount.toFixed(2)}`,
  })

  if (error) console.log(error)
  return newBalance;
}

/**
 * Admin: grant promo credit to a user by email.
 */
export async function grantPromoCredit(adminEmail, targetUserEmail, amount, description) {
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', targetUserEmail)
    .limit(1)

  if (profileError) console.log(profileError)

  const profileId = Array.isArray(profileData) ? profileData[0]?.id : null
  if (!profileId) {
    console.log(new Error('User profile not found for promo credit'))
    return
  }

  const { error } = await supabase.from('wallet_transactions').insert({
    user_id: profileId,
    transaction_type: 'promo_credit',
    amount,
    description: description || `Promo credit granted by admin`,
  })

  if (error) console.log(error)
}