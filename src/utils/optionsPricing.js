// src/utils/optionsPricing.js
/**
 * Options Pricing Engine for PolyCzar
 * Central component that orchestrates option price calculations
 */

import { BlackScholesBinaryModel, BinomialModel, PricingModelFactory } from './pricingModels';
import historicalDataService from './historicalData';
import volatilityService from './volatility';
import marketMonitor from './marketMonitor';

/**
 * Main options pricing engine
 * Coordinates pricing models, volatility calculation, and market data
 */
export class OptionsPricingEngine {
  constructor() {
    this.pricingModel = new BlackScholesBinaryModel();
    this.historicalDataService = historicalDataService;
    this.volatilityService = volatilityService;
    this.marketMonitor = marketMonitor;
    this.listeners = [];
    this.initialized = false;
    this.riskFreeRate = 0.05; // 5% annual rate, could be updated from external source
    
    // Bind methods to ensure correct 'this' context
    this.handleMarketUpdate = this.handleMarketUpdate.bind(this);
  }

  /**
   * Initialize the pricing engine and related services
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  async initialize() {
    if (this.initialized) return Promise.resolve();
    
    try {
      // Initialize historical data service
      await this.historicalDataService.initialize();
      
      // Add listener for market updates
      this.marketMonitor.addListener(this.handleMarketUpdate);
      
      this.initialized = true;
      console.log('OptionsPricingEngine: Initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('OptionsPricingEngine: Initialization failed', error);
      return Promise.reject(error);
    }
  }

  /**
   * Handle market updates from market monitor
   * @param {string} marketId - Market identifier
   * @param {Object} data - Updated market data
   * @param {string} updateType - Type of update
   */
  handleMarketUpdate(marketId, data, updateType) {
    // Update volatility estimate on significant changes
    if (updateType === 'significant-change') {
      this.volatilityService.updateVolatilityEstimate(marketId);
    }
    
    // Notify listeners of the update
    this.notifyListeners(marketId, updateType);
  }

  /**
   * Calculate price for an option based on its details
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Option price with bid, ask, and mid prices
   */
  async getPriceForOption(optionDetails) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      marketId,
      currentPrice, // Current probability (0-1)
      strike, // Strike probability (0-100)
      expiry, // Expiration date
      type, // 'call' or 'put'
      liquidityFactor = 0.1 // Optional liquidity factor
    } = optionDetails;
    
    // Calculate time to expiry
    const timeToExpiry = this.calculateTimeToExpiry(expiry);
    
    // Get dynamic volatility from service
    let volatility;
    try {
      volatility = await this.volatilityService.getDynamicVolatility(marketId, timeToExpiry);
    } catch (error) {
      console.warn(`OptionsPricingEngine: Error getting volatility, using default: ${error.message}`);
      volatility = 0.5; // Default volatility of 50%
    }
    
    // Select appropriate pricing model based on parameters
    const model = timeToExpiry < (7/365) ? new BinomialModel() : this.pricingModel;
    
    // Calculate price using the model
    const price = model.calculatePrice({
      currentProbability: currentPrice * 100, // Convert to percentage
      strikeProbability: strike,
      timeToExpiry,
      volatility,
      riskFreeRate: this.riskFreeRate,
      optionType: type,
      liquidityFactor
    });
    
    return price;
  }

  /**
   * Update market data and recalculate prices
   * @param {string} marketId - Market identifier
   * @returns {Promise} Promise that resolves when update is complete
   */
  async updateMarketData(marketId) {
    try {
      await this.marketMonitor.forceUpdate(marketId);
      return true;
    } catch (error) {
      console.error(`OptionsPricingEngine: Error updating market data for ${marketId}`, error);
      return false;
    }
  }

  /**
   * Calculate time to expiration in years
   * @param {string} expiryDate - Expiration date string
   * @returns {number} Time to expiry in years
   */
  calculateTimeToExpiry(expiryDate) {
    const currentDate = new Date();
    const expiryDateTime = new Date(expiryDate);
    const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
    
    return Math.max(0, (expiryDateTime - currentDate) / millisecondsPerYear);
  }

  /**
   * Subscribe to price updates
   * @param {function} callback - Function to call on price updates
   * @returns {function} Function to unsubscribe
   */
  subscribeToUpdates(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify listeners of price updates
   * @param {string} marketId - Market identifier
   * @param {string} updateType - Type of update
   */
  notifyListeners(marketId, updateType) {
    for (const listener of this.listeners) {
      try {
        listener(marketId, updateType);
      } catch (error) {
        console.error('OptionsPricingEngine: Error in listener callback', error);
      }
    }
  }

  /**
   * Calculate option greeks
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Option greeks (delta, gamma, theta, vega)
   */
  async calculateGreeks(optionDetails) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      currentPrice,
      strike,
      expiry,
      type,
      volatility = 0.5
    } = optionDetails;
    
    // Calculate time to expiry
    const timeToExpiry = this.calculateTimeToExpiry(expiry);
    
    // For binary options, greeks calculations
    const S = currentPrice; // Underlying asset price (as probability 0-1)
    const K = strike;      // Strike price (as probability 0-1)
    const T = timeToExpiry;  // Time to expiry in years
    const r = this.riskFreeRate; // Risk-free rate
    const sigma = volatility; // Volatility
    
    try {
      // Standardized calculations for greeks
      const sqrtT = Math.sqrt(T);
      const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
      const d2 = d1 - sigma * sqrtT;
      
      // Standard normal probability density function
      const npdf = (x) => (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
      
      // Standard normal cumulative distribution function approx
      const ncdf = (x) => {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x < 0 ? -1 : 1;
        const absX = Math.abs(x);
        const t = 1.0 / (1.0 + p * absX);
        const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
        return 0.5 * (1 + sign * y);
      };
      
      let delta, gamma, theta, vega;
      
      if (type === 'call') {
        delta = ncdf(d1);
        gamma = npdf(d1) / (S * sigma * sqrtT);
        theta = -((S * npdf(d1) * sigma) / (2 * sqrtT)) - r * K * Math.exp(-r * T) * ncdf(d2);
        vega = S * sqrtT * npdf(d1) / 100; // Divided by 100 for better scale
      } else { // put
        delta = ncdf(d1) - 1;
        gamma = npdf(d1) / (S * sigma * sqrtT);
        theta = -((S * npdf(d1) * sigma) / (2 * sqrtT)) + r * K * Math.exp(-r * T) * ncdf(-d2);
        vega = S * sqrtT * npdf(d1) / 100; // Divided by 100 for better scale
      }
      
      // For binary options, adjust the greeks
      // Binary options have different delta and gamma characteristics
      if (Math.abs(S - K) < 0.05) { // Near the money
        // Binary options have much higher gamma near the money
        gamma *= 3;
      }
      
      // Convert theta to daily value
      theta = theta / 365;
      
      return { delta, gamma, theta, vega };
      
    } catch (error) {
      console.error('Error calculating greeks:', error);
      
      // Fallback values
      return {
        delta: type === 'call' ? 0.5 : -0.5,
        gamma: 0.05,
        theta: -0.01,
        vega: 0.02
      };
    }
  }
  
  /**
   * Get estimated option greeks (legacy method)
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Option greeks (delta, gamma, theta, vega)
   */
  async getOptionGreeks(optionDetails) {
    return this.calculateGreeks(optionDetails);
  }

  /**
   * Calculate bid and ask prices for an option with a spread
   * @param {number} midPrice - The mid price of the option
   * @param {number} spread - The spread between bid and ask (default: 0.05)
   * @param {number} skew - Skew factor to adjust bid/ask asymmetrically (-1 to 1)
   * @returns {Object} Object containing bid and ask prices
   */
  calculateBidAskPrices(midPrice, spread = 0.05, skew = 0) {
    // Validate inputs
    if (typeof midPrice !== 'number' || isNaN(midPrice)) {
      console.warn('Invalid midPrice provided to calculateBidAskPrices:', midPrice);
      midPrice = 0.5; // Default to 0.5 if invalid
    }
    
    // Ensure spread is positive and reasonable
    spread = Math.max(0.01, Math.min(0.2, Math.abs(spread)));
    
    // Ensure skew is between -1 and 1
    skew = Math.max(-1, Math.min(1, skew));
    
    // Calculate half spread, adjusted by skew
    const halfSpread = spread / 2;
    const skewAdjustment = halfSpread * skew;
    
    // Calculate bid and ask prices
    let bid = Math.max(0.01, midPrice - halfSpread + skewAdjustment);
    let ask = Math.min(0.99, midPrice + halfSpread + skewAdjustment);
    
    // Ensure bid is less than ask
    if (bid >= ask) {
      const average = (bid + ask) / 2;
      bid = Math.max(0.01, average - 0.01);
      ask = Math.min(0.99, average + 0.01);
    }
    
    // Round to 2 decimal places
    bid = Math.round(bid * 100) / 100;
    ask = Math.round(ask * 100) / 100;
    
    return { bid, ask };
  }

  /**
   * Set the risk-free rate used in calculations
   * @param {number} rate - New risk-free rate (e.g., 0.05 for 5%)
   */
  setRiskFreeRate(rate) {
    if (rate >= 0 && rate <= 0.2) { // Sanity check: 0-20%
      this.riskFreeRate = rate;
      console.log(`OptionsPricingEngine: Risk-free rate updated to ${rate * 100}%`);
    } else {
      console.warn(`OptionsPricingEngine: Invalid risk-free rate: ${rate}`);
    }
  }
}

// Create a singleton instance
export const optionsPricingEngine = new OptionsPricingEngine();
export default optionsPricingEngine;