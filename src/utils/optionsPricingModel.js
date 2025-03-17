// src/utils/optionsPricingModel.js
/**
 * AMM-based Options Pricing Model
 * 
 * This module implements an advanced constant product formula adapted for options trading.
 * It provides pricing, liquidity management, impermanent loss calculation, and slippage estimation.
 * 
 * The model leverages both constant product AMM principles and option pricing theory to
 * create a sophisticated pricing mechanism for binary options and derivatives.
 */

// Constants
const DEFAULT_BASE_VOLATILITY = 0.65; // Base volatility for option pricing
const DEFAULT_RISK_FREE_RATE = 0.05;  // 5% annual risk-free rate
const LP_FEE_PERCENT = 0.003;         // 0.3% LP fee
const PROTOCOL_FEE_PERCENT = 0.001;   // 0.1% protocol fee
const TOTAL_FEE_PERCENT = LP_FEE_PERCENT + PROTOCOL_FEE_PERCENT;
const MIN_LIQUIDITY = 1000;           // Minimum liquidity to ensure pricing stability
const PRICE_IMPACT_MULTIPLIER = 2;    // Multiplier for price impact calculation

/**
 * AMM Options Pricing Engine
 * Provides pricing and liquidity management for options based on AMM principles
 */
class AMMOptionsPricing {
  constructor() {
    this.liquidityPools = {};
    this.volatilityAdjustments = {};
    this.riskFreeRate = DEFAULT_RISK_FREE_RATE;
    this.systemState = {
      initialized: false,
      lastUpdate: null,
      globalVolatilityFactor: 1.0,
      pricingModel: 'constant-product-amm'
    };
  }

  /**
   * Initialize the pricing engine
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.systemState.initialized) {
      return Promise.resolve();
    }

    try {
      // Initialize system state
      this.systemState.initialized = true;
      this.systemState.lastUpdate = Date.now();
      
      console.log('AMMOptionsPricing: Initialization complete');
      return Promise.resolve();
    } catch (error) {
      console.error('AMMOptionsPricing: Initialization failed', error);
      return Promise.reject(error);
    }
  }

  /**
   * Calculate option price using AMM constant product formula
   * @param {Object} optionDetails - Options parameters
   * @returns {Object} Option price with bid, ask and mid prices
   */
  async calculatePrice(optionDetails) {
    // Ensure system is initialized
    if (!this.systemState.initialized) {
      await this.initialize();
    }

    const {
      marketId = 'default',
      currentPrice = 0.5,    // Current probability (0-1)
      strike = 0.5,          // Strike probability (0-100)
      timeToExpiry = 0.25,   // Time to expiry in years
      type = 'call',         // 'call' or 'put'
      liquidityFactor = 0.1  // Liquidity factor (0-1), higher means lower liquidity
    } = optionDetails;

    try {
      // Get option pool ID
      const optionId = this._getOptionId(marketId, strike, type, timeToExpiry);
      
      // If pool doesn't exist or hasn't been accessed, create it
      if (!this.liquidityPools[optionId]) {
        this._initializePool(optionId, currentPrice);
      }

      // Get volatility for this option
      const volatility = this._calculateImpliedVolatility(currentPrice, strike, timeToExpiry, type);
      
      // Calculate fair value using Black-Scholes principles adapted for binary options
      const fairValue = this._calculateTheoretical(currentPrice, strike, timeToExpiry, volatility, type);
      
      // Calculate liquidity depth factor (0-1) where 1 is deep liquidity
      const liquidityDepth = this._calculateLiquidityDepth(optionId, liquidityFactor);
      
      // Adjust spread based on liquidity depth and time to expiry
      const spread = this._calculateSpread(fairValue, liquidityDepth, timeToExpiry);
      
      // Calculate mid, bid, ask prices
      const midPrice = fairValue;
      const halfSpread = spread / 2;
      const bidPrice = Math.max(0.01, midPrice - halfSpread);
      const askPrice = Math.min(0.99, midPrice + halfSpread);
      
      // Update pool state
      this._updatePoolState(optionId, midPrice, bidPrice, askPrice);
      
      return {
        midPrice,
        bidPrice,
        askPrice,
        theoreticalPrice: fairValue,
        impliedVolatility: volatility,
        liquidityDepth
      };
    } catch (error) {
      console.error('AMMOptionsPricing: Error calculating price', error);
      
      // Fallback to simple pricing
      const midPrice = type === 'call' ? currentPrice : (1 - currentPrice);
      const bidPrice = Math.max(0.01, midPrice * 0.95);
      const askPrice = Math.min(0.99, midPrice * 1.05);
      
      return { midPrice, bidPrice, askPrice };
    }
  }

  /**
   * Execute a trade and update pool state
   * @param {string} optionId - Option identifier
   * @param {boolean} isBuy - True for buy, false for sell
   * @param {number} amount - Trade size
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Trade execution details
   */
  async executeTrade(optionId, isBuy, amount, optionDetails) {
    // Ensure system is initialized
    if (!this.systemState.initialized) {
      await this.initialize();
    }
    
    try {
      // If pool doesn't exist, create it
      if (!this.liquidityPools[optionId]) {
        this._getOrCreatePool(optionId, optionDetails);
      }
      
      const pool = this.liquidityPools[optionId];
      
      // Calculate current price from pool
      const { midPrice, bidPrice, askPrice } = await this.calculatePrice(optionDetails);
      
      // Calculate trade fee
      const fee = amount * (isBuy ? askPrice : bidPrice) * TOTAL_FEE_PERCENT;
      
      // Calculate price impact using constant product formula
      const effectiveLiquidity = pool.totalLiquidity || MIN_LIQUIDITY;
      let priceImpact = (amount / effectiveLiquidity) * PRICE_IMPACT_MULTIPLIER;
      priceImpact = Math.min(0.15, priceImpact); // Cap at 15%
      
      // Calculate execution price with slippage
      const executionPrice = isBuy 
        ? askPrice * (1 + priceImpact)
        : bidPrice * (1 - priceImpact);
      
      // Update pool state after trade
      if (isBuy) {
        pool.buyVolume = (pool.buyVolume || 0) + amount;
        // Buying increases the price slightly
        pool.price = Math.min(0.99, midPrice + (midPrice * priceImpact));
      } else {
        pool.sellVolume = (pool.sellVolume || 0) + amount;
        // Selling decreases the price slightly
        pool.price = Math.max(0.01, midPrice - (midPrice * priceImpact));
      }
      
      // Update timestamps
      pool.lastUpdate = Date.now();
      
      // Return trade details
      return {
        price: isBuy ? askPrice : bidPrice,
        executionPrice,
        priceImpact: priceImpact * 100, // Return as percentage
        totalCost: isBuy ? executionPrice * amount : null,
        totalReceived: !isBuy ? executionPrice * amount : null,
        fee,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`AMMOptionsPricing: Error executing trade: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add liquidity to the pool
   * @param {string} optionId - Option identifier
   * @param {string} provider - Provider identifier
   * @param {number} amount - Amount to add
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Updated pool state
   */
  async addLiquidity(optionId, provider, amount, optionDetails) {
    // Ensure system is initialized
    if (!this.systemState.initialized) {
      await this.initialize();
    }
    
    try {
      // If pool doesn't exist, create it
      if (!this.liquidityPools[optionId]) {
        this._getOrCreatePool(optionId, optionDetails);
      }
      
      const pool = this.liquidityPools[optionId];
      
      // Add provider to the pool if not exists
      if (!pool.providers) {
        pool.providers = {};
      }
      
      if (!pool.providers[provider]) {
        pool.providers[provider] = {
          amount: 0,
          entryPrice: pool.price,
          lastDeposit: Date.now()
        };
      }
      
      // Update provider's liquidity
      pool.providers[provider].amount += amount;
      pool.providers[provider].lastDeposit = Date.now();
      
      // Update total pool liquidity
      pool.totalLiquidity = (pool.totalLiquidity || MIN_LIQUIDITY) + amount;
      pool.lastUpdate = Date.now();
      
      return {
        pool,
        providerShare: pool.providers[provider].amount,
        totalLiquidity: pool.totalLiquidity,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`AMMOptionsPricing: Error adding liquidity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove liquidity from the pool
   * @param {string} optionId - Option identifier
   * @param {string} provider - Provider identifier
   * @param {number} amount - Amount to remove
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Updated pool state
   */
  async removeLiquidity(optionId, provider, amount, optionDetails) {
    // Ensure system is initialized
    if (!this.systemState.initialized) {
      await this.initialize();
    }
    
    try {
      // Check if pool exists
      if (!this.liquidityPools[optionId]) {
        throw new Error('Pool does not exist');
      }
      
      const pool = this.liquidityPools[optionId];
      
      // Check if provider has sufficient liquidity
      if (!pool.providers || 
          !pool.providers[provider] || 
          pool.providers[provider].amount < amount) {
        throw new Error('Insufficient liquidity');
      }
      
      // Calculate impermanent loss if removing all liquidity
      let impermanentLoss = 0;
      if (pool.providers[provider].amount === amount) {
        impermanentLoss = await this.calculateImpermanentLoss(
          optionId, 
          { ...optionDetails, initialPrice: pool.providers[provider].entryPrice }
        );
      }
      
      // Update provider's liquidity
      pool.providers[provider].amount -= amount;
      
      // If provider removed all liquidity, calculate rewards and clear data
      if (pool.providers[provider].amount <= 0) {
        delete pool.providers[provider];
      }
      
      // Update total pool liquidity
      pool.totalLiquidity = Math.max(MIN_LIQUIDITY, pool.totalLiquidity - amount);
      pool.lastUpdate = Date.now();
      
      return {
        pool,
        providerShare: pool.providers[provider]?.amount || 0,
        totalLiquidity: pool.totalLiquidity,
        impermanentLoss,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`AMMOptionsPricing: Error removing liquidity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate impermanent loss for a liquidity provider
   * @param {string} optionId - Option identifier
   * @param {Object} optionDetails - Option parameters with initialPrice
   * @returns {number} Impermanent loss as a decimal (0.05 = 5%)
   */
  async calculateImpermanentLoss(optionId, optionDetails) {
    if (!optionDetails.initialPrice) {
      throw new Error('Initial price is required to calculate impermanent loss');
    }
    
    try {
      const pool = this.liquidityPools[optionId];
      if (!pool) return 0;
      
      const currentPrice = pool.price;
      const initialPrice = optionDetails.initialPrice;
      
      if (Math.abs(currentPrice - initialPrice) < 0.001) return 0;
      
      const priceRatio = currentPrice / initialPrice;
      
      // Enhanced impermanent loss formula for options
      // This takes into account convexity and time decay
      let impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
      
      // Adjust for time to expiry - options closer to expiry have higher IL risk
      if (optionDetails.timeToExpiry) {
        if (optionDetails.timeToExpiry < 0.05) { // Less than 18 days
          impermanentLoss *= 1.5; // Increase IL for near-expiry options
        } else if (optionDetails.timeToExpiry > 0.5) { // More than 6 months
          impermanentLoss *= 0.8; // Reduce IL for far-expiry options
        }
      }
      
      // Adjust for volatility - higher volatility increases IL
      const volatility = this._calculateImpliedVolatility(
        optionDetails.currentPrice || 0.5,
        optionDetails.strike || 0.5,
        optionDetails.timeToExpiry || 0.25,
        optionDetails.type || 'call'
      );
      
      if (volatility > DEFAULT_BASE_VOLATILITY) {
        impermanentLoss *= (1 + (volatility - DEFAULT_BASE_VOLATILITY));
      }
      
      return Math.abs(impermanentLoss);
    } catch (error) {
      console.error('AMMOptionsPricing: Error calculating impermanent loss', error);
      
      // Fallback to simplified calculation
      const pool = this.liquidityPools[optionId];
      if (!pool) return 0;
      
      const currentPrice = pool.price;
      const initialPrice = optionDetails.initialPrice;
      const priceRatio = currentPrice / initialPrice;
      
      if (priceRatio === 1) return 0;
      
      const impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
      return Math.abs(impermanentLoss);
    }
  }

  /**
   * Get or create a liquidity pool for an option
   * @private
   * @param {string} optionId - Option identifier
   * @param {Object} optionDetails - Option parameters
   * @returns {Object} Pool object
   */
  _getOrCreatePool(optionId, optionDetails) {
    if (!this.liquidityPools[optionId]) {
      const initialPrice = this._calculateInitialPrice(optionDetails);
      this._initializePool(optionId, initialPrice);
    }
    return this.liquidityPools[optionId];
  }

  /**
   * Initialize a new liquidity pool
   * @private
   * @param {string} optionId - Option identifier
   * @param {number} initialPrice - Initial price for the option
   */
  _initializePool(optionId, initialPrice) {
    this.liquidityPools[optionId] = {
      price: initialPrice,
      midPrice: initialPrice,
      bidPrice: initialPrice * 0.95,
      askPrice: initialPrice * 1.05,
      totalLiquidity: MIN_LIQUIDITY,
      buyVolume: 0,
      sellVolume: 0,
      providers: {},
      lastUpdate: Date.now(),
      created: Date.now(),
      k: MIN_LIQUIDITY * MIN_LIQUIDITY // Constant product k
    };
  }

  /**
   * Update pool state with new pricing information
   * @private
   * @param {string} optionId - Option identifier
   * @param {number} midPrice - Mid price
   * @param {number} bidPrice - Bid price
   * @param {number} askPrice - Ask price
   */
  _updatePoolState(optionId, midPrice, bidPrice, askPrice) {
    const pool = this.liquidityPools[optionId];
    if (!pool) return;
    
    pool.price = midPrice;
    pool.midPrice = midPrice;
    pool.bidPrice = bidPrice;
    pool.askPrice = askPrice;
    pool.lastUpdate = Date.now();
  }

  /**
   * Generate a unique option ID
   * @private
   * @param {string} marketId - Market identifier
   * @param {number} strike - Strike price
   * @param {string} type - Option type ('call' or 'put')
   * @param {number} timeToExpiry - Time to expiry in years
   * @returns {string} Unique option ID
   */
  _getOptionId(marketId, strike, type, timeToExpiry) {
    // Convert timeToExpiry to approximately expiration date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (timeToExpiry * 365));
    const expiryStr = expiryDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `${marketId}-${strike}-${type}-${expiryStr}`;
  }

  /**
   * Calculate the initial price for an option
   * @private
   * @param {Object} optionDetails - Option parameters
   * @returns {number} Initial price
   */
  _calculateInitialPrice(optionDetails) {
    const { currentPrice = 0.5, strike = 0.5, type = 'call' } = optionDetails;
    
    // Simple model: for calls, price increases as currentPrice > strike
    // For puts, price increases as currentPrice < strike
    if (type === 'call') {
      // Basic approximation for a call option price
      return Math.max(0.01, Math.min(0.99, (currentPrice - strike) + 0.5));
    } else {
      // Basic approximation for a put option price
      return Math.max(0.01, Math.min(0.99, (strike - currentPrice) + 0.5));
    }
  }

  /**
   * Calculate theoretical option price
   * @private
   * @param {number} currentPrice - Current price
   * @param {number} strike - Strike price
   * @param {number} timeToExpiry - Time to expiry in years
   * @param {number} volatility - Implied volatility
   * @param {string} type - Option type
   * @returns {number} Theoretical price
   */
  _calculateTheoretical(currentPrice, strike, timeToExpiry, volatility, type) {
    // Simplified model for binary options based on Black-Scholes
    if (timeToExpiry <= 0) {
      // At expiry
      if (type === 'call') {
        return currentPrice > strike ? 1 : 0;
      } else {
        return currentPrice < strike ? 1 : 0;
      }
    }
    
    try {
      // Basic variables for B-S calculation
      const S = currentPrice;
      const K = strike;
      const T = timeToExpiry;
      const r = this.riskFreeRate;
      const sigma = volatility;
      
      // Handle extreme cases
      if (sigma <= 0) return type === 'call' ? (S > K ? 1 : 0) : (S < K ? 1 : 0);
      
      // Calculate d1 and d2
      const sqrtT = Math.sqrt(T);
      const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
      const d2 = d1 - sigma * sqrtT;
      
      // Standard normal cumulative distribution function
      const normCDF = (x) => {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        const absX = Math.abs(x);
        
        // Approximation of the cumulative distribution function
        const t = 1.0 / (1.0 + p * absX);
        const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2));
        
        return 0.5 * (1 + sign * y);
      };
      
      // Binary option pricing
      if (type === 'call') {
        // Binary call is the probability of ending in-the-money
        return normCDF(d2);
      } else {
        // Binary put is the probability of ending in-the-money
        return normCDF(-d2);
      }
    } catch (error) {
      console.error('AMMOptionsPricing: Error in theoretical price calculation', error);
      
      // Fallback to simple approximation
      if (type === 'call') {
        return Math.max(0.01, Math.min(0.99, currentPrice - strike + 0.5));
      } else {
        return Math.max(0.01, Math.min(0.99, strike - currentPrice + 0.5));
      }
    }
  }

  /**
   * Calculate spread based on liquidity and time factors
   * @private
   * @param {number} price - Mid price
   * @param {number} liquidityDepth - Pool liquidity depth (0-1)
   * @param {number} timeToExpiry - Time to expiry in years
   * @returns {number} Spread amount
   */
  _calculateSpread(price, liquidityDepth, timeToExpiry) {
    // Base spread is inverse to liquidity depth (0 = deep liquidity = low spread)
    let spread = 0.05 * (1 - liquidityDepth);
    
    // Adjust for time to expiry - shorter time means higher spread due to gamma risk
    if (timeToExpiry < 0.1) { // Less than ~37 days
      spread *= 1.5;
    } else if (timeToExpiry < 0.05) { // Less than ~18 days
      spread *= 2;
    } else if (timeToExpiry > 0.5) { // More than 6 months
      spread *= 0.8;
    }
    
    // Adjust for price proximity to extremes
    if (price < 0.1 || price > 0.9) {
      spread *= 1.5; // Wider spreads near boundaries
    }
    
    return Math.min(0.2, Math.max(0.01, spread)); // Cap between 1-20%
  }

  /**
   * Calculate liquidity depth based on pool data and liquidity factor
   * @private
   * @param {string} optionId - Option identifier
   * @param {number} liquidityFactor - External liquidity factor
   * @returns {number} Liquidity depth (0-1)
   */
  _calculateLiquidityDepth(optionId, liquidityFactor) {
    const pool = this.liquidityPools[optionId];
    if (!pool) return 0.5; // Default medium liquidity
    
    // Calculate based on pool liquidity and volume
    const totalLiquidity = pool.totalLiquidity || MIN_LIQUIDITY;
    const totalVolume = (pool.buyVolume || 0) + (pool.sellVolume || 0);
    
    // Combine internal liquidity metrics with external factor
    const internalLiquidityScore = Math.min(1, totalLiquidity / (MIN_LIQUIDITY * 10));
    const volumeScore = Math.min(1, totalVolume / 10000);
    
    // Weighted average of factors (lower liquidityFactor means higher depth)
    return 0.7 * (1 - liquidityFactor) + 0.2 * internalLiquidityScore + 0.1 * volumeScore;
  }

  /**
   * Calculate implied volatility based on option parameters
   * @private
   * @param {number} currentPrice - Current price
   * @param {number} strike - Strike price
   * @param {number} timeToExpiry - Time to expiry in years
   * @param {string} type - Option type
   * @returns {number} Implied volatility
   */
  _calculateImpliedVolatility(currentPrice, strike, timeToExpiry, type) {
    // Simple model: volatility increases as strike moves away from current price
    // and decreases as time to expiry increases
    
    // Base volatility adjusted by global factor
    let volatility = DEFAULT_BASE_VOLATILITY * this.systemState.globalVolatilityFactor;
    
    // Adjust for moneyness - higher vol for farther OTM options
    const moneyness = Math.abs(currentPrice - strike);
    volatility *= (1 + moneyness);
    
    // Adjust for time to expiry - shorter expiry means higher vol
    if (timeToExpiry < 0.1) { // Less than ~37 days
      volatility *= 1.2;
    } else if (timeToExpiry > 0.5) { // More than 6 months
      volatility *= 0.8;
    }
    
    // Ensure volatility stays in reasonable bounds
    return Math.min(1.5, Math.max(0.2, volatility));
  }

  /**
   * Update the global volatility factor
   * @param {number} factor - New volatility factor
   * @returns {boolean} Success indicator
   */
  setVolatilityFactor(factor) {
    if (isNaN(factor) || factor <= 0) {
      console.error('AMMOptionsPricing: Invalid volatility factor');
      return false;
    }
    
    this.systemState.globalVolatilityFactor = Math.min(2, Math.max(0.5, factor));
    this.systemState.lastUpdate = Date.now();
    
    console.log(`AMMOptionsPricing: Volatility factor updated to ${this.systemState.globalVolatilityFactor}`);
    return true;
  }

  /**
   * Update the risk-free rate
   * @param {number} rate - New risk-free rate
   * @returns {boolean} Success indicator
   */
  setRiskFreeRate(rate) {
    if (isNaN(rate) || rate < 0 || rate > 0.2) {
      console.error('AMMOptionsPricing: Invalid risk-free rate');
      return false;
    }
    
    this.riskFreeRate = rate;
    this.systemState.lastUpdate = Date.now();
    
    console.log(`AMMOptionsPricing: Risk-free rate updated to ${this.riskFreeRate}`);
    return true;
  }
  
  /**
   * Get pool state for an option
   * @param {string} optionId - Option identifier
   * @returns {Object|null} Pool state or null if not found
   */
  getPoolState(optionId) {
    return this.liquidityPools[optionId] || null;
  }
  
  /**
   * Get all liquidity pools
   * @returns {Object} All liquidity pools
   */
  getAllPools() {
    return this.liquidityPools;
  }
}

// Singleton instance
const ammOptionsPricing = new AMMOptionsPricing();
export default ammOptionsPricing;