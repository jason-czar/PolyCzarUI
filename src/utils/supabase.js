import { createClient } from '@supabase/supabase-js';

/**
 * Supabase utility for integration with Clerk authentication
 * This file handles secure connection between Clerk and Supabase
 */

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if the Supabase configuration is available
const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey);

// Initialize the client with anonymous key (for public operations)
const supabaseClient = hasSupabaseConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Gets a Supabase client with the user's JWT for authenticated requests
 * @param {string} supabaseAccessToken - JWT token from Clerk
 * @returns {Object} Authenticated Supabase client
 */
export const getSupabaseClient = (supabaseAccessToken) => {
  if (!hasSupabaseConfig) {
    console.error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
    return null;
  }
  
  // Return a new Supabase client with the auth token
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`
      }
    }
  });
};

/**
 * Gets the current user's Supabase access token from Clerk
 * @param {Object} auth - Clerk auth object
 * @returns {Promise<string>} Supabase access token
 */
export const getSupabaseToken = async (auth) => {
  if (!auth || !auth.getToken) {
    console.error('Clerk auth object is not available');
    return null;
  }
  
  try {
    // Get the JWT token for Supabase from Clerk
    // The template name must match what's configured in Clerk dashboard
    const token = await auth.getToken({ template: 'supabase' });
    return token;
  } catch (error) {
    console.error('Error getting Supabase token from Clerk:', error);
    return null;
  }
};

/**
 * Get an authenticated Supabase client for use in components
 * @param {Object} auth - Clerk auth object
 * @returns {Object|null} Authenticated Supabase client or null
 */
export const getAuthenticatedSupabaseClient = async (auth) => {
  // For development mode without Clerk
  if (!hasSupabaseConfig) {
    console.warn('Development mode: Supabase integration is bypassed');
    return supabaseClient;
  }

  try {
    const token = await getSupabaseToken(auth);
    if (!token) return supabaseClient; // Fallback to anonymous client
    
    return getSupabaseClient(token);
  } catch (error) {
    console.error('Error initializing authenticated Supabase client:', error);
    return supabaseClient; // Fallback to anonymous client
  }
};

/**
 * Synchronizes Clerk user data with Supabase user profile
 * @param {Object} user - Clerk user object
 * @param {Object} auth - Clerk auth object
 * @returns {Promise<Object|null>} Created/updated user record or null on error
 */
export const syncUserWithSupabase = async (user, auth) => {
  if (!user || !auth) {
    console.warn('Cannot sync user: Missing user or auth object');
    return null;
  }

  try {
    // Get authenticated Supabase client
    const supabase = await getAuthenticatedSupabaseClient(auth);
    if (!supabase) return null;
    
    // Extract user data from Clerk
    const userData = {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      full_name: `${user.firstName} ${user.lastName}`,
      avatar_url: user.imageUrl,
      // Add any additional user data you want to store
      updated_at: new Date().toISOString(),
    };
    
    // Insert or update user in Supabase
    const { data, error } = await supabase
      .from('polymarket_pa09bd_profiles') // Use our session-specific table name
      .upsert(userData)
      .select()
      .single();
      
    if (error) {
      console.error('Error syncing user with Supabase:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in syncUserWithSupabase:', error);
    return null;
  }
};

/**
 * Initializes Supabase with Clerk integration
 * Call this function in your app initialization
 */
export const initSupabaseClerk = () => {
  if (!hasSupabaseConfig) {
    console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
    return;
  }
  
  // You can add any additional initialization code here
  console.info('Supabase-Clerk integration initialized');
};

// Export the public client for unauthenticated requests
export default supabaseClient;