// src/utils/marketMonitor.js
/**
 * Market Monitor for tracking real-time price updates
 * Polls Polymarket API for market data and notifies listeners of updates
 */

import polymarketUtils from './polymarket';
import historicalDataService from './historicalData';

class MarketMonitor {
  constructor() {
    this.markets = new Map();
    this.pollingIntervals = new Map();
    this.listeners = [];
    this.defaultPollingInterval = 60000; // 60 seconds
    this.backoffFactor = 2;
    this.maxBackoff = 300000; // 5 minutes
    this.failedAttempts = new Map();
  }

  /**
   * Start monitoring a market for price updates
   * @param {string} marketId - Market identifier or URL
   * @param {number} pollingInterval - Polling interval in milliseconds
   */
  startMonitoring(marketId, pollingInterval = this.defaultPollingInterval) {
    // If already monitoring, clear existing interval
    if (this.pollingIntervals.has(marketId)) {
      this.stopMonitoring(marketId);
    }

    // Reset failed attempts counter
    this.failedAttempts.set(marketId, 0);

    // Initial fetch
    this.fetchAndUpdate(marketId);

    // Set up polling
    const intervalId = setInterval(() => {
      this.fetchAndUpdate(marketId);
    }, pollingInterval);

    this.pollingIntervals.set(marketId, {
      intervalId,
      interval: pollingInterval
    });

    console.log(`MarketMonitor: Started monitoring market ${marketId} with ${pollingInterval}ms interval`);
  }

  /**
   * Stop monitoring a market
   * @param {string} marketId - Market identifier or URL
   */
  stopMonitoring(marketId) {
    const polling = this.pollingIntervals.get(marketId);
    if (polling) {
      clearInterval(polling.intervalId);
      this.pollingIntervals.delete(marketId);
      console.log(`MarketMonitor: Stopped monitoring market ${marketId}`);
    }
  }

  /**
   * Fetch market data and update stored state
   * @param {string} marketId - Market identifier or URL
   */
  async fetchAndUpdate(marketId) {
    try {
      // Fetch current market data
      const marketData = await polymarketUtils.getCurrentMarketData(marketId);
      const previousData = this.markets.get(marketId);
      
      // Store data point for historical analysis
      await historicalDataService.storeDataPoint(marketId, {
        timestamp: Date.now(),
        currentPrice: marketData.currentPrice,
        probability: marketData.probability,
        volume: marketData.tradingVolume24h,
        liquidity: marketData.liquidityProvided
      });
      
      // Store new data
      this.markets.set(marketId, marketData);
      
      // Reset failed attempts counter on success
      this.failedAttempts.set(marketId, 0);
      
      // Check for significant changes (>= 2% probability change)
      let updateType = 'update';
      if (previousData && Math.abs(marketData.probability - previousData.probability) >= 2) {
        updateType = 'significant-change';
        console.log(`MarketMonitor: Significant change detected in market ${marketId}`);
      }
      
      // Notify all listeners
      this.notifyListeners(marketId, marketData, updateType);
    } catch (error) {
      // Increment failed attempts counter
      const attempts = (this.failedAttempts.get(marketId) || 0) + 1;
      this.failedAttempts.set(marketId, attempts);
      
      console.error(`MarketMonitor: Error updating market ${marketId} (attempt ${attempts}):`, error);
      
      // Apply exponential backoff if configured
      if (attempts > 2) {
        this.applyBackoff(marketId, attempts);
      }
    }
  }

  /**
   * Apply exponential backoff to polling interval
   * @param {string} marketId - Market identifier
   * @param {number} attempts - Number of failed attempts
   */
  applyBackoff(marketId, attempts) {
    const polling = this.pollingIntervals.get(marketId);
    if (!polling) return;
    
    // Calculate new interval with exponential backoff
    const newInterval = Math.min(
      this.defaultPollingInterval * Math.pow(this.backoffFactor, attempts - 2),
      this.maxBackoff
    );
    
    // Update polling interval
    clearInterval(polling.intervalId);
    
    const intervalId = setInterval(() => {
      this.fetchAndUpdate(marketId);
    }, newInterval);
    
    this.pollingIntervals.set(marketId, {
      intervalId,
      interval: newInterval
    });
    
    console.log(`MarketMonitor: Applied backoff for market ${marketId}, new interval: ${newInterval}ms`);
  }

  /**
   * Add a listener for market updates
   * @param {function} callback - Function to call on updates (marketId, marketData, updateType)
   * @returns {function} Function to remove the listener
   */
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of a market update
   * @param {string} marketId - Market identifier
   * @param {Object} marketData - Updated market data
   * @param {string} updateType - Type of update ('update', 'significant-change', 'trade')
   */
  notifyListeners(marketId, marketData, updateType) {
    for (const listener of this.listeners) {
      try {
        listener(marketId, marketData, updateType);
      } catch (error) {
        console.error('MarketMonitor: Error in listener callback', error);
      }
    }
  }

  /**
   * Get the most recent market data
   * @param {string} marketId - Market identifier
   * @returns {Object|null} Market data or null if not found
   */
  getMarketData(marketId) {
    return this.markets.get(marketId) || null;
  }

  /**
   * Get all currently monitored markets
   * @returns {Object} Map of market IDs to market data
   */
  getAllMarkets() {
    return Object.fromEntries(this.markets);
  }

  /**
   * Force an immediate update for a market
   * @param {string} marketId - Market identifier
   * @returns {Promise} Promise that resolves when update is complete
   */
  async forceUpdate(marketId) {
    return this.fetchAndUpdate(marketId);
  }
}

// Create a singleton instance
export const marketMonitor = new MarketMonitor();
export default marketMonitor;