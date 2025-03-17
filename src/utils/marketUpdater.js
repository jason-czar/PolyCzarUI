// src/utils/marketUpdater.js

/**
 * Market Updater Utility
 * 
 * This module provides functionality to handle real-time market data updates
 * from Polymarket, ensuring the application always displays the latest
 * probability data.
 */

import polymarketUtils from './polymarket';

class MarketUpdater {
  constructor() {
    this.updateIntervals = {}; // Store update intervals by market URL
    this.listeners = {}; // Store update listeners by market URL
    this.lastFetchedData = {}; // Cache of last fetched data by market URL
    this.isPolling = {}; // Tracking which markets are being polled
    this.defaultPollingInterval = 30000; // Poll every 30 seconds by default
  }

  /**
   * Start polling for market updates
   * @param {string} marketUrl - The Polymarket event URL
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<object>} - Initial market data
   */
  async startPolling(marketUrl, interval = this.defaultPollingInterval) {
    if (!marketUrl) {
      throw new Error('No market URL provided for polling');
    }

    // Clear any existing interval for this market
    this.stopPolling(marketUrl);
    
    // Create a timeout promise to prevent hanging
    const fetchWithTimeout = async (url, timeoutMs = 10000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const result = await Promise.race([
          polymarketUtils.getCurrentMarketData(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fetch timed out')), timeoutMs)
          )
        ]);
        clearTimeout(timeoutId);
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Fetch initial data with timeout
    try {
      // Use default data in case of error
      let initialData;
      let fetchError = null;
      
      try {
        initialData = await fetchWithTimeout(marketUrl);
        console.log('Successfully fetched initial market data');
      } catch (error) {
        fetchError = error;
        console.warn(`Initial fetch failed: ${error.message || 'Unknown error'}`);
        // Provide default data structure to prevent app from getting stuck
        initialData = {
          title: 'Default Event',
          currentPrice: 0.5,
          probability: 50,
          liquidityProvided: 100,
          tradingVolume24h: 500,
          dates: [
            new Date().toISOString().split('T')[0],
            new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
          ],
          options: this._generateDefaultOptions()
        };
      }
      
      this.lastFetchedData[marketUrl] = initialData;
      
      // Set up polling interval with better error handling
      this.isPolling[marketUrl] = true;
      
      // Track consecutive failures for exponential backoff
      let consecutiveFailures = 0;
      const maxBackoff = 5; // Max number of backoff increases
      const baseInterval = interval;
      let currentInterval = baseInterval;
      
      const updateFn = async () => {
        if (!this.isPolling[marketUrl]) {
          return;
        }
        
        try {
          console.log(`Polling for updates (${marketUrl})...`);
          const updatedData = await fetchWithTimeout(marketUrl);
          
          // Reset failures counter and interval on success
          consecutiveFailures = 0;
          currentInterval = baseInterval;
          
          // Only update if probability has changed
          if (updatedData.probability !== this.lastFetchedData[marketUrl].probability) {
            console.log(`Market probability updated: ${this.lastFetchedData[marketUrl].probability}% -> ${updatedData.probability}%`);
            this.lastFetchedData[marketUrl] = updatedData;
            
            // Notify all listeners
            if (this.listeners[marketUrl]) {
              this.listeners[marketUrl].forEach(listener => listener(updatedData));
            }
          }
        } catch (error) {
          consecutiveFailures++;
          
          // Implement exponential backoff
          if (consecutiveFailures <= maxBackoff) {
            const backoffFactor = Math.pow(2, consecutiveFailures - 1);
            currentInterval = Math.min(baseInterval * backoffFactor, 300000); // Cap at 5 minutes
            console.warn(`Fetch attempt ${consecutiveFailures} failed: ${error.message || 'Unknown error'}. Retrying in ${currentInterval/1000}s`);
          } else {
            console.error(`Maximum retry attempts (${maxBackoff}) reached. Will continue with last known data.`);
          }
        } finally {
          // Schedule next update with potentially adjusted interval
          if (this.isPolling[marketUrl]) {
            setTimeout(updateFn, currentInterval);
          }
        }
      };
      
      // Start the polling process
      setTimeout(updateFn, currentInterval);
      
      // If there was an error with the initial fetch, propagate it for better error handling in the UI
      if (fetchError && fetchError.message.includes('Failed to fetch from Polymarket API')) {
        console.warn('Using default data due to API fetch failure, but propagating error for UI handling');
        initialData._fetchError = fetchError.message;
      }
      
      return initialData;
    } catch (error) {
      console.error('Error starting market polling:', error);
      throw error;
    }
  }

  /**
   * Stop polling for a specific market
   * @param {string} marketUrl - The Polymarket event URL
   */
  stopPolling(marketUrl) {
    if (this.updateIntervals[marketUrl]) {
      clearInterval(this.updateIntervals[marketUrl]);
      delete this.updateIntervals[marketUrl];
      this.isPolling[marketUrl] = false;
    }
  }

  /**
   * Stop all active polling
   */
  stopAllPolling() {
    Object.keys(this.updateIntervals).forEach(url => {
      this.stopPolling(url);
    });
  }

  /**
   * Add a listener for market updates
   * @param {string} marketUrl - The Polymarket event URL
   * @param {Function} listener - Callback function to be called with updated data
   */
  addListener(marketUrl, listener) {
    if (!this.listeners[marketUrl]) {
      this.listeners[marketUrl] = [];
    }
    this.listeners[marketUrl].push(listener);
  }

  /**
   * Remove a listener
   * @param {string} marketUrl - The Polymarket event URL
   * @param {Function} listener - The listener function to remove
   */
  removeListener(marketUrl, listener) {
    if (this.listeners[marketUrl]) {
      this.listeners[marketUrl] = this.listeners[marketUrl].filter(l => l !== listener);
    }
  }

  /**
   * Notify all registered listeners with updated data
   * @param {string} marketUrl - The Polymarket event URL
   * @param {object} data - Updated market data
   */
  notifyListeners(marketUrl, data) {
    if (this.listeners[marketUrl]) {
      this.listeners[marketUrl].forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in market update listener:', error);
        }
      });
    }
  }

  /**
   * Get the latest cached data for a market
   * @param {string} marketUrl - The Polymarket event URL
   * @returns {object|null} - The latest market data or null if not available
   */
  getLatestData(marketUrl) {
    return this.lastFetchedData[marketUrl] || null;
  }

  /**
   * Manually force a data refresh
   * @param {string} marketUrl - The Polymarket event URL
   * @returns {Promise<object>} - Updated market data
   */
  async forceRefresh(marketUrl) {
    try {
      const updatedData = await polymarketUtils.getCurrentMarketData(marketUrl);
      this.lastFetchedData[marketUrl] = updatedData;
      this.notifyListeners(marketUrl, updatedData);
      return updatedData;
    } catch (error) {
      console.error('Error forcing market data refresh:', error);
      throw error;
    }
  }

  /**
   * Adjust polling interval for a specific market
   * @param {string} marketUrl - The Polymarket event URL
   * @param {number} newInterval - New polling interval in milliseconds
   */
  adjustPollingInterval(marketUrl, newInterval) {
    if (this.updateIntervals[marketUrl]) {
      this.stopPolling(marketUrl);
      this.startPolling(marketUrl, newInterval);
    }
  }

  /**
   * Generate default options data as fallback
   * @private
   * @returns {Array} - Array of default option objects
   */
  _generateDefaultOptions() {
    return [
      ...Array.from({ length: 9 }, (_, i) => {
        const strike = Number((i + 1) * 10); // 10, 20, 30, 40, 50, 60, 70, 80, 90
        const basePrice = Number(((100 - strike) * 0.01).toFixed(2));
        return {
          strike: strike,
          price: basePrice,
          type: 'call',
          volume: Math.floor(Math.random() * 30000) + 10000,
          openInterest: Math.floor(Math.random() * 40000) + 20000,
          liquidityDepth: Math.floor(Math.random() * 100) + 10,
          dailyChangePercent: (Math.random() * 14 - 7).toFixed(2)
        };
      }),
      ...Array.from({ length: 9 }, (_, i) => {
        const strike = Number((i + 1) * 10); // 10, 20, 30, 40, 50, 60, 70, 80, 90
        const basePrice = Number((strike * 0.01).toFixed(2));
        return {
          strike: strike,
          price: basePrice,
          type: 'put',
          volume: Math.floor(Math.random() * 30000) + 10000,
          openInterest: Math.floor(Math.random() * 40000) + 20000,
          liquidityDepth: Math.floor(Math.random() * 100) + 10,
          dailyChangePercent: (Math.random() * 14 - 7).toFixed(2)
        };
      })
    ];
  }
}

// Create a singleton instance
const marketUpdater = new MarketUpdater();

export default marketUpdater;