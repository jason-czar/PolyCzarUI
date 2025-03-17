// amm.js
// Enhanced AMM Pricing Engine with options pricing model integration

const SPREAD = 0.05; // $0.05 spread

import ammOptionsPricing from './optionsPricingModel';

// Automated Market Maker model for options pricing
class AMM {
  constructor() {
    // Initialize liquidity pools with mock data
    this.liquidityPools = {};
    this.pricingEngine = ammOptionsPricing;
    this.initialized = false;
  }
  
  // Initialize the AMM
  async initialize() {
    if (this.initialized) return Promise.resolve();
    
    try {
      // Initialize the pricing engine
      await this.pricingEngine.initialize();
      this.initialized = true;
      console.log('AMM: Initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('AMM: Initialization failed', error);
      return Promise.reject(error);
    }
  }
  
  // Initialize a liquidity pool for an option
  initializeLiquidityPool(optionId, initialPrice) {
    if (!this.liquidityPools[optionId]) {
      this.liquidityPools[optionId] = {
        price: initialPrice,
        totalLiquidity: 1000, // Start with mock liquidity
        buyVolume: 0,
        sellVolume: 0,
        providers: {},
        lastUpdate: Date.now()
      };
    }
    return this.liquidityPools[optionId];
  }
  
  // Calculate price with spread
  calculatePriceWithSpread(basePrice) {
    // Apply half the spread to each side
    const halfSpread = SPREAD / 2;
    return {
      bidPrice: Math.max(0, Number((basePrice - halfSpread).toFixed(2))),
      askPrice: Number((basePrice + halfSpread).toFixed(2))
    };
  }
  
  // Calculate liquidity factor based on pool data
  calculateLiquidityFactor(pool) {
    // Simple liquidity factor calculation
    // Lower liquidity = higher factor = wider spread
    const volumeScore = Math.min(1, (pool.buyVolume + pool.sellVolume) / 10000);
    const depthScore = Math.min(1, pool.totalLiquidity / 100000);
    
    // Inverse relation - lower scores mean higher liquidity factor
    return Math.max(0, 1 - ((volumeScore + depthScore) / 2));
  }
  
  // Get price for a specific option using the AMM pricing model
  async getPrice(optionId, optionDetails) {
    // If not initialized, initialize first
    if (!this.initialized) {
      await this.initialize();
    }
    
    // If pool doesn't exist, initialize it
    if (!this.liquidityPools[optionId]) {
      this.initializeLiquidityPool(optionId, optionDetails.price);
    }
    
    const pool = this.liquidityPools[optionId];
    
    // Calculate liquidity factor
    const liquidityFactor = this.calculateLiquidityFactor(pool);
    
    try {
      // Get price from AMM pricing engine
      const enhancedDetails = {
        ...optionDetails,
        liquidityFactor,
        marketId: optionDetails.marketId || 'default',
        // Convert properties for AMM model compatibility
        timeToExpiry: this._calculateTimeToExpiry(optionDetails.expiry),
        currentPrice: optionDetails.currentPrice || 0.5,
        strike: optionDetails.strike,
        type: optionDetails.type
      };
      
      // Use calculatePrice instead of getPriceForOption for new AMM model
      const price = await this.pricingEngine.calculatePrice(enhancedDetails);
      
      // Update pool price with the new mid price
      pool.price = price.midPrice;
      pool.lastUpdate = Date.now();
      
      return {
        bidPrice: price.bidPrice,
        askPrice: price.askPrice
      };
    } catch (error) {
      console.error(`AMM: Error getting price for option ${optionId}`, error);
      
      // Fall back to simple pricing method if model fails
      const basePrice = pool.price;
      return this.calculatePriceWithSpread(basePrice);
    }
  }
  
  // Add liquidity to a pool using AMM constant product model
  async addLiquidity(optionId, provider, amount, optionDetails) {
    // If not initialized, initialize first
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Initialize pool if it doesn't exist
    if (!this.liquidityPools[optionId]) {
      this.initializeLiquidityPool(optionId, optionDetails.price);
    }
    
    const pool = this.liquidityPools[optionId];
    
    try {
      // Prepare option details for the AMM model
      const enhancedDetails = {
        ...optionDetails,
        timeToExpiry: this._calculateTimeToExpiry(optionDetails.expiry),
        currentPrice: optionDetails.currentPrice || 0.5,
        strike: optionDetails.strike,
        type: optionDetails.type
      };
      
      // Add liquidity using the AMM model
      const result = await this.pricingEngine.addLiquidity(
        optionId,
        provider,
        amount,
        enhancedDetails
      );
      
      // Update the internal pool state
      if (!pool.providers[provider]) {
        pool.providers[provider] = 0;
      }
      
      pool.providers[provider] += amount;
      pool.totalLiquidity += amount;
      pool.lastUpdate = Date.now();
      
      return {
        pool: pool,
        providerShare: pool.providers[provider],
        totalLiquidity: pool.totalLiquidity
      };
    } catch (error) {
      console.error(`AMM: Error adding liquidity to ${optionId}`, error);
      
      // Fallback to simple liquidity addition
      if (!pool.providers[provider]) {
        pool.providers[provider] = 0;
      }
      
      pool.providers[provider] += amount;
      pool.totalLiquidity += amount;
      
      return {
        pool: pool,
        providerShare: pool.providers[provider],
        totalLiquidity: pool.totalLiquidity
      };
    }
  }
  
  // Remove liquidity from a pool with AMM model integration
  async removeLiquidity(optionId, provider, amount, optionDetails = null) {
    // If not initialized, initialize first
    if (!this.initialized) {
      await this.initialize();
    }
    
    const pool = this.liquidityPools[optionId];
    
    if (!pool) {
      throw new Error('Liquidity pool does not exist');
    }
    
    if (!pool.providers[provider] || pool.providers[provider] < amount) {
      throw new Error('Insufficient liquidity');
    }
    
    try {
      if (optionDetails && this.pricingEngine.removeLiquidity) {
        // Prepare option details for the AMM model
        const enhancedDetails = {
          ...optionDetails,
          timeToExpiry: this._calculateTimeToExpiry(optionDetails.expiry),
          currentPrice: optionDetails.currentPrice || 0.5,
          strike: optionDetails.strike,
          type: optionDetails.type
        };
        
        // Remove liquidity using the AMM model
        await this.pricingEngine.removeLiquidity(optionId, provider, amount, enhancedDetails);
      } 
      
      // Update internal pool state
      pool.providers[provider] -= amount;
      pool.totalLiquidity -= amount;
      pool.lastUpdate = Date.now();
      
      return {
        pool: pool,
        providerShare: pool.providers[provider],
        totalLiquidity: pool.totalLiquidity
      };
    } catch (error) {
      console.error(`AMM: Error removing liquidity from ${optionId}`, error);
      
      // Proceed with removal even if AMM model fails
      pool.providers[provider] -= amount;
      pool.totalLiquidity -= amount;
      
      return {
        pool: pool,
        providerShare: pool.providers[provider],
        totalLiquidity: pool.totalLiquidity
      };
    }
  }
  
  // Helper method to calculate time to expiry in years
  _calculateTimeToExpiry(expiryDate) {
    if (!expiryDate) return 0.1; // Default if no expiry provided
    
    const currentDate = new Date();
    const expiryDateTime = new Date(expiryDate);
    const millisecondsPerYear = 1000 * 60 * 60 * 24 * 365;
    
    return Math.max(0.01, (expiryDateTime - currentDate) / millisecondsPerYear);
  }

  // Execute a trade and update pool state using AMM constant product model
  async executeTrade(optionId, isBuy, amount, optionDetails) {
    // If not initialized, initialize first
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Initialize pool if it doesn't exist
    if (!this.liquidityPools[optionId]) {
      this.initializeLiquidityPool(optionId, optionDetails.price);
    }
    
    const pool = this.liquidityPools[optionId];
    
    try {
      // Prepare option details for the AMM model
      const enhancedDetails = {
        ...optionDetails,
        timeToExpiry: this._calculateTimeToExpiry(optionDetails.expiry),
        currentPrice: optionDetails.currentPrice || 0.5,
        strike: optionDetails.strike,
        type: optionDetails.type
      };
      
      // Execute the trade using the AMM constant product model
      const tradeResult = await this.pricingEngine.executeTrade(
        optionId,
        isBuy,
        amount,
        enhancedDetails
      );
      
      // Update pool state with trade information
      if (isBuy) {
        pool.buyVolume += amount;
      } else {
        pool.sellVolume += amount;
      }
      
      // Update the pool price based on the execution
      pool.price = tradeResult.price;
      pool.lastUpdate = Date.now();
      
      // Return trade execution details
      return {
        price: tradeResult.price,
        totalCost: isBuy ? tradeResult.totalCost : tradeResult.totalReceived,
        priceImpact: tradeResult.priceImpact,
        fee: tradeResult.fee,
        timestamp: tradeResult.timestamp
      };
    } catch (error) {
      console.error(`AMM: Error executing trade for ${optionId}`, error);
      
      // Fall back to simplified execution if AMM model fails
      const { bidPrice, askPrice } = await this.getPrice(optionId, optionDetails);
      
      // Simple price impact calculation
      const priceImpact = (amount / (pool.totalLiquidity + 1)) * 0.1;
      
      if (isBuy) {
        pool.buyVolume += amount;
        pool.price = Math.min(1, pool.price + priceImpact);
        return {
          price: askPrice,
          totalCost: askPrice * amount,
          priceImpact: priceImpact * 100,
          fee: amount * 0.003, // 0.3% fee
          timestamp: Date.now()
        };
      } else {
        pool.sellVolume += amount;
        pool.price = Math.max(0, pool.price - priceImpact);
        return {
          price: bidPrice,
          totalRevenue: bidPrice * amount,
          priceImpact: priceImpact * 100,
          fee: bidPrice * amount * 0.003, // 0.3% fee
          timestamp: Date.now()
        };
      }
    }
  }
  
  // Get all liquidity pools info
  getAllPools() {
    return this.liquidityPools;
  }
  
  // Get specific pool info
  getPoolInfo(optionId) {
    return this.liquidityPools[optionId] || null;
  }
  
  // Get provider's liquidity in a pool
  getProviderLiquidity(optionId, provider) {
    const pool = this.liquidityPools[optionId];
    if (!pool) return 0;
    return pool.providers[provider] || 0;
  }
  
  // Calculate impermanent loss using enhanced AMM model
  async calculateImpermanentLoss(optionId, initialPrice, optionDetails = null) {
    const pool = this.liquidityPools[optionId];
    if (!pool) return 0;
    
    try {
      // If optionDetails provided and AMM model has impermanent loss calculation
      if (optionDetails && this.pricingEngine.calculateImpermanentLoss) {
        // Prepare option details for the AMM model
        const enhancedDetails = {
          ...optionDetails,
          timeToExpiry: this._calculateTimeToExpiry(optionDetails.expiry),
          currentPrice: optionDetails.currentPrice || 0.5,
          strike: optionDetails.strike,
          type: optionDetails.type,
          initialPrice: initialPrice
        };
        
        // Use AMM model to calculate impermanent loss
        return await this.pricingEngine.calculateImpermanentLoss(optionId, enhancedDetails);
      }
      
      // Fallback to simplified calculation
      const currentPrice = pool.price;
      const priceRatio = currentPrice / initialPrice;
      
      if (Math.abs(priceRatio - 1) < 0.001) return 0;
      
      // Enhanced impermanent loss calculation for options
      // Accounts for time decay and volatility
      let impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
      
      // Adjust for option-specific factors if details available
      if (optionDetails && optionDetails.expiry) {
        const timeToExpiry = this._calculateTimeToExpiry(optionDetails.expiry);
        // Options closer to expiry have higher impermanent loss risk
        if (timeToExpiry < 0.05) { // Less than ~18 days
          impermanentLoss *= 1.5; // Increase IL for near-expiry options
        }
      }
      
      return Math.abs(impermanentLoss);
    } catch (error) {
      console.error(`AMM: Error calculating impermanent loss for ${optionId}`, error);
      
      // Return a basic calculation if the enhanced method fails
      const currentPrice = pool.price;
      const priceRatio = currentPrice / initialPrice;
      
      if (priceRatio === 1) return 0;
      
      const impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
      return Math.abs(impermanentLoss);
    }
  }
}

export const ammInstance = new AMM();
export default ammInstance;