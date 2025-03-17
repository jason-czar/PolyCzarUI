import { getAuthenticatedSupabaseClient } from './supabase';

/**
 * Service for managing user trading history with Supabase
 * Includes functions to record trades and fetch trading history
 */

/**
 * Record a new trade in the user's trading history
 * @param {Object} user - Clerk user object
 * @param {Object} auth - Clerk auth object
 * @param {Object} tradeDetails - Details of the trade to record
 * @returns {Promise<Object>} - The recorded trade
 */
export const recordTradeHistory = async (user, auth, tradeDetails) => {
  if (!user || !auth) {
    console.warn('Cannot record trade: Missing user or auth object');
    return null;
  }

  try {
    const supabase = await getAuthenticatedSupabaseClient(auth);
    if (!supabase) return null;

    const userEmail = user.primaryEmailAddress?.emailAddress;
    if (!userEmail) {
      console.error('User email is required to record trade');
      return null;
    }

    // Extract trade data for database
    const tradeData = {
      user_email: userEmail,
      transaction_type: tradeDetails.orderType || 'unknown', // 'buy' or 'sell'
      market_id: tradeDetails.marketId || null,
      option_id: tradeDetails.optionId || null,
      amount: tradeDetails.quantity || 0,
      price: tradeDetails.price || 0,
      status: tradeDetails.status || 'pending',
      transaction_hash: tradeDetails.transactionHash || null,
      // Supabase will automatically add created_at timestamp
    };

    // Insert trade into database
    const { data, error } = await supabase
      .from('polymarket_pa09bd_transactions')
      .insert(tradeData)
      .select()
      .single();

    if (error) {
      console.error('Error recording trade history:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in recordTradeHistory:', error);
    return null;
  }
};

/**
 * Update an existing trade in the trading history
 * @param {Object} user - Clerk user object
 * @param {Object} auth - Clerk auth object
 * @param {string} tradeId - ID of the trade to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - The updated trade
 */
export const updateTradeHistory = async (user, auth, tradeId, updateData) => {
  if (!user || !auth || !tradeId) {
    console.warn('Cannot update trade: Missing required parameters');
    return null;
  }

  try {
    const supabase = await getAuthenticatedSupabaseClient(auth);
    if (!supabase) return null;

    const userEmail = user.primaryEmailAddress?.emailAddress;
    if (!userEmail) {
      console.error('User email is required to update trade');
      return null;
    }

    // Update the trade record
    const { data, error } = await supabase
      .from('polymarket_pa09bd_transactions')
      .update(updateData)
      .eq('id', tradeId)
      .eq('user_email', userEmail) // Ensure user can only update their own trades
      .select()
      .single();

    if (error) {
      console.error('Error updating trade history:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in updateTradeHistory:', error);
    return null;
  }
};

/**
 * Fetch the user's trading history
 * @param {Object} user - Clerk user object
 * @param {Object} options - Options for filtering the history
 * @returns {Promise<Array>} - Array of trades
 */
export const fetchUserTradeHistory = async (user, options = {}) => {
  if (!user) {
    console.warn('Cannot fetch trade history: Missing user object');
    return [];
  }

  try {
    const { auth } = user;
    const supabase = await getAuthenticatedSupabaseClient(auth);
    if (!supabase) return [];

    const userEmail = user.primaryEmailAddress?.emailAddress;
    if (!userEmail) {
      console.error('User email is required to fetch trade history');
      return [];
    }

    // Start query builder
    let query = supabase
      .from('polymarket_pa09bd_transactions')
      .select('*')
      .eq('user_email', userEmail);

    // Apply filters if provided
    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.type) {
      query = query.eq('transaction_type', options.type);
    }

    if (options.marketId) {
      query = query.eq('market_id', options.marketId);
    }

    if (options.optionId) {
      query = query.eq('option_id', options.optionId);
    }

    // Date range filter
    if (options.fromDate) {
      query = query.gte('created_at', options.fromDate);
    }

    if (options.toDate) {
      query = query.lte('created_at', options.toDate);
    }

    // Sorting
    if (options.sortBy) {
      const direction = options.sortDirection === 'asc' ? true : false;
      query = query.order(options.sortBy, { ascending: direction });
    } else {
      // Default sort by creation date, newest first
      query = query.order('created_at', { ascending: false });
    }

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trade history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchUserTradeHistory:', error);
    return [];
  }
};