// src/utils/volatility.js
/**
 * Volatility service for calculating and managing volatility estimates
 * Used by the options pricing model to determine appropriate volatility values
 */

import historicalDataService from './historicalData';

class VolatilityService {
  constructor(historicalDataService) {
    this.historicalDataService = historicalDataService;
    this.volatilityCache = new Map();
    this.defaultVolatility = 0.50; // 50% annual volatility as default
    this.minVolatility = 0.25; // 25% minimum volatility floor
  }

  /**
   * Calculate volatility for a market using specified method
   * @param {string} marketId - Market identifier
   * @param {string} method - Volatility calculation method
   * @returns {Promise<number>} Promise that resolves to volatility value
   */
  async calculateVolatility(marketId, method = 'historical') {
    try {
      switch (method) {
        case 'historical':
          return await this.calculateHistoricalVolatility(marketId);
        case 'garch':
          return await this.calculateGARCHVolatility(marketId);
        case 'ewma':
          return await this.calculateEWMAVolatility(marketId);
        default:
          return this.defaultVolatility;
      }
    } catch (error) {
      console.error(`VolatilityService: Error calculating volatility for market ${marketId}`, error);
      return this.defaultVolatility;
    }
  }

  /**
   * Get dynamic volatility adjusted for time to expiry and market conditions
   * @param {string} marketId - Market identifier
   * @param {number} timeToExpiry - Time to expiry in years
   * @returns {Promise<number>} Promise that resolves to adjusted volatility
   */
  async getDynamicVolatility(marketId, timeToExpiry) {
    try {
      // Try to use cached volatility if available and recent
      const cachedVol = this.volatilityCache.get(marketId);
      const now = Date.now();

      if (cachedVol && (now - cachedVol.timestamp < 3600000)) { // Valid for 1 hour
        // Apply term structure to cached volatility
        return this.applyTermStructure(cachedVol.value, timeToExpiry);
      }

      // Calculate new volatility
      const baseVolatility = await this.calculateVolatility(marketId);
      
      // Cache the result
      this.volatilityCache.set(marketId, {
        value: baseVolatility,
        timestamp: now
      });

      // Apply term structure adjustments
      return this.applyTermStructure(baseVolatility, timeToExpiry);
    } catch (error) {
      console.error(`VolatilityService: Error getting dynamic volatility for market ${marketId}`, error);
      return this.applyTermStructure(this.defaultVolatility, timeToExpiry);
    }
  }

  /**
   * Update volatility estimate for a market
   * @param {string} marketId - Market identifier
   * @returns {Promise<number>} Promise that resolves to the new volatility estimate
   */
  async updateVolatilityEstimate(marketId) {
    try {
      const baseVolatility = await this.calculateVolatility(marketId);
      
      this.volatilityCache.set(marketId, {
        value: baseVolatility,
        timestamp: Date.now()
      });
      
      return baseVolatility;
    } catch (error) {
      console.error(`VolatilityService: Error updating volatility for market ${marketId}`, error);
      return this.defaultVolatility;
    }
  }

  /**
   * Calculate historical volatility from market data
   * @param {string} marketId - Market identifier
   * @param {number} days - Number of days of history to use
   * @returns {Promise<number>} Promise that resolves to calculated volatility
   */
  async calculateHistoricalVolatility(marketId, days = 30) {
    try {
      // Get historical data
      const historicalData = await this.historicalDataService.getHistoricalData(marketId, days);
      
      if (historicalData.length < 2) {
        console.warn(`VolatilityService: Insufficient data for market ${marketId}, using default volatility`);
        return this.defaultVolatility;
      }

      // Calculate daily returns as ln(Pt/Pt-1)
      const returns = [];
      for (let i = 1; i < historicalData.length; i++) {
        const prevProb = historicalData[i-1].probability / 100; // Convert to decimal
        const currProb = historicalData[i].probability / 100;
        
        // Skip if probabilities are 0 or 1 (would lead to -Infinity or NaN)
        if (prevProb <= 0 || prevProb >= 1 || currProb <= 0 || currProb >= 1) {
          continue;
        }
        
        // Calculate log return
        returns.push(Math.log(currProb / prevProb));
      }
      
      if (returns.length < 2) {
        return this.defaultVolatility;
      }
      
      // Calculate standard deviation of returns
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
      const dailyVol = Math.sqrt(variance);
      
      // Annualize volatility (multiply by sqrt of days in a year)
      const annualizedVol = dailyVol * Math.sqrt(365);
      
      // Apply a minimum volatility floor
      return Math.max(this.minVolatility, annualizedVol);
    } catch (error) {
      console.error(`VolatilityService: Error calculating historical volatility for market ${marketId}`, error);
      return this.defaultVolatility;
    }
  }

  /**
   * Calculate GARCH volatility (simplified implementation)
   * @param {string} marketId - Market identifier
   * @returns {Promise<number>} Promise that resolves to GARCH volatility
   */
  async calculateGARCHVolatility(marketId) {
    // For now, just use historical volatility
    // In a full implementation, this would use a GARCH model
    return await this.calculateHistoricalVolatility(marketId);
  }

  /**
   * Calculate EWMA volatility (Exponentially Weighted Moving Average)
   * @param {string} marketId - Market identifier
   * @returns {Promise<number>} Promise that resolves to EWMA volatility
   */
  async calculateEWMAVolatility(marketId) {
    try {
      // Get historical data
      const historicalData = await this.historicalDataService.getHistoricalData(marketId, 30);
      
      if (historicalData.length < 2) {
        return this.defaultVolatility;
      }

      // Calculate returns
      const returns = [];
      for (let i = 1; i < historicalData.length; i++) {
        const prevProb = historicalData[i-1].probability / 100;
        const currProb = historicalData[i].probability / 100;
        
        // Skip if probabilities are 0 or 1
        if (prevProb <= 0 || prevProb >= 1 || currProb <= 0 || currProb >= 1) {
          continue;
        }
        
        returns.push(Math.log(currProb / prevProb));
      }
      
      if (returns.length < 2) {
        return this.defaultVolatility;
      }

      // EWMA parameters
      const lambda = 0.94; // Standard RiskMetrics decay factor
      let variance = returns[0] * returns[0]; // Initial variance
      
      // Calculate EWMA variance
      for (let i = 1; i < returns.length; i++) {
        variance = lambda * variance + (1 - lambda) * returns[i] * returns[i];
      }
      
      // Annualize volatility
      const annualizedVol = Math.sqrt(variance) * Math.sqrt(365);
      
      // Apply minimum volatility floor
      return Math.max(this.minVolatility, annualizedVol);
    } catch (error) {
      console.error(`VolatilityService: Error calculating EWMA volatility for market ${marketId}`, error);
      return this.defaultVolatility;
    }
  }

  /**
   * Apply term structure adjustments to base volatility
   * @param {number} baseVol - Base volatility
   * @param {number} timeToExpiry - Time to expiry in years
   * @returns {number} Adjusted volatility
   */
  applyTermStructure(baseVol, timeToExpiry) {
    // Convert time to expiry to days
    const daysToExpiry = timeToExpiry * 365;
    
    let volatilityAdjustment = 1.0;
    
    if (daysToExpiry < 7) {
      // Last week - increase volatility
      volatilityAdjustment = 1 + (0.5 * (1 - daysToExpiry / 7));
    } else if (daysToExpiry > 30) {
      // Long term - slightly reduced volatility
      volatilityAdjustment = 0.9;
    }
    
    // Apply adjustment
    const adjustedVol = baseVol * volatilityAdjustment;
    
    // Apply minimum volatility floor
    return Math.max(this.minVolatility, adjustedVol);
  }
}

// Create a singleton instance
export const volatilityService = new VolatilityService(historicalDataService);
export default volatilityService;