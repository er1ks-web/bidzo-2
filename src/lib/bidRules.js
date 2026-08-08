/**
 * Bidzo — Bid Validation Rules
 * Central module for all bid increment / max logic.
 * Keep this as the single source of truth so frontend and backend stay in sync.
 */

/**
 * Returns the minimum required increment given the current highest bid.
 * @param {number} currentBid
 * @returns {number} increment in EUR
 */
export function getMinIncrement(currentBid) {
  if (currentBid < 50)   return 1;
  if (currentBid < 200)  return 2;
  if (currentBid < 1000) return 5;
  return 10;
}

/**
 * Returns the minimum valid next bid.
 * @param {number} currentBid
 * @returns {number}
 */
export function getMinNextBid(currentBid) {
  return currentBid + getMinIncrement(currentBid);
}

/**
 * Returns the maximum allowed bid to prevent troll / spam bids.
 * @param {number} currentBid
 * @returns {number}
 */
export function getMaxBid(currentBid) {
  if (currentBid < 50)   return currentBid + 100;
  if (currentBid < 200)  return currentBid + 300;
  if (currentBid < 1000) return currentBid + 1000;
  return currentBid + currentBid * 0.5; // +50%
}

/**
 * Validates a proposed bid amount.
 * Returns { valid: true } or { valid: false, errorKey: string, ...params }
 *
 * Error messages are NOT built here -- this module has no i18n context, so it
 * returns a stable errorKey (+ any interpolation values like min/max) and the
 * caller translates it via t(`bid_panel.${errorKey}`) with the params filled in.
 *
 * @param {number} amount   — the amount the user wants to bid
 * @param {number} currentBid — current highest bid (or starting price if no bids)
 * @returns {{ valid: boolean, errorKey?: string, min?: number, max?: number }}
 */
export function validateBid(amount, currentBid) {
  const min = getMinNextBid(currentBid);
  const max = getMaxBid(currentBid);

  if (isNaN(amount) || amount <= 0) {
    return { valid: false, errorKey: 'errorInvalid' };
  }

  if (amount < min) {
    return { valid: false, errorKey: 'errorTooLow', min };
  }

  if (amount > max) {
    return { valid: false, errorKey: 'errorTooHigh', max };
  }

  return { valid: true };
}