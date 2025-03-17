// src/utils/pooledLiquidity.js
import ammInstance from './amm';
import optionsPricingEngine from './optionsPricing';

// Enhanced Pooled Liquidity System for options
class PooledLiquidity {
  constructor() {
    // Main pool state
    this.pool = {
      totalLiquidity: 2000, // Starting with mock liquidity
      providers: {},        // Map of provider addresses to their contributions
      feeRate: 0.003,       // 0.3% fee rate
      allocationStrategy: 'balanced', // Default global strategy
      lastUpdated: Date.now(),
      // Cached values for optimization
      eligibleOptions: [],     // List of eligible options for liquidity distribution
      optionWeights: {},       // Weights for each option
      providerBalances: {},    // Provider's balances across all options
      distributionHistory: [], // History of liquidity distributions
      rewardsHistory: []       // History of rewards distributions
    };
    
    // Link to the AMM instance
    this.amm = ammInstance;
    this.pricingEngine = optionsPricingEngine;
    this.initialized = false;
  }
  
  // Initialize the pooled liquidity system
  async initialize() {
    if (this.initialized) return Promise.resolve();
    
    try {
      // Make sure AMM and pricing engine are initialized
      if (this.amm && typeof this.amm.initialize === 'function') {
        await this.amm.initialize();
      }
      
      if (this.pricingEngine && typeof this.pricingEngine.initialize === 'function') {
        await this.pricingEngine.initialize();
      }
      
      // Sync with current AMM state if available
      this.syncWithAMM();
      
      this.initialized = true;
      console.log('Pooled Liquidity: Initialized successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Pooled Liquidity: Initialization failed', error);
      return Promise.reject(error);
    }
  }
  
  // Sync with current AMM state
  syncWithAMM() {
    try {
      // Get all pools from AMM
      const ammPools = this.amm.getAllPools();
      
      // Update our list of eligible options
      this.pool.eligibleOptions = Object.keys(ammPools);
      
      // Create initial weights based on existing liquidity
      const weights = {};
      let totalWeight = 0;
      
      for (const optionId of this.pool.eligibleOptions) {
        const pool = ammPools[optionId];
        
        // Weight based on current volume and existing liquidity
        const volumeScore = (pool.buyVolume + pool.sellVolume) || 1;
        const liquidityScore = pool.totalLiquidity || 1;
        
        // Higher score = more liquidity needed 
        const weight = volumeScore / Math.sqrt(liquidityScore);
        weights[optionId] = weight;
        totalWeight += weight;
      }
      
      // Normalize weights
      for (const optionId of this.pool.eligibleOptions) {
        this.pool.optionWeights[optionId] = weights[optionId] / totalWeight;
      }
      
      console.log('Pooled Liquidity: Synced with AMM');
    } catch (error) {
      console.error('Pooled Liquidity: Error syncing with AMM', error);
    }
  }
  
  // Get pool statistics
  async getPoolStats() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return {
      totalLiquidity: this.pool.totalLiquidity,
      providersCount: Object.keys(this.pool.providers).length,
      feeRate: this.pool.feeRate,
      allocationStrategy: this.pool.allocationStrategy,
      lastUpdated: this.pool.lastUpdated
    };
  }
  
  // Get user's total contribution across all pools
  async getUserContribution(providerAddress) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.pool.providers[providerAddress] || 0;
  }
  
  // Calculate estimated APR based on historical data
  async calculateEstimatedApr() {
    // In a real implementation, this would analyze historical rewards
    // For this mock, we'll return a reasonable value
    return 12.5; // 12.5% APR
  }
  
  // Get all eligible options that can receive liquidity
  async getAllEligibleOptions() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Update eligible options
    this.syncWithAMM();
    return this.pool.eligibleOptions;
  }
  
  // Add liquidity to the pool
  async addLiquidity(providerAddress, amount, strategy = 'balanced') {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Validate inputs
    if (!providerAddress || !amount || amount <= 0) {
      throw new Error('Invalid provider or amount');
    }
    
    try {
      // Update provider's contribution
      if (!this.pool.providers[providerAddress]) {
        this.pool.providers[providerAddress] = 0;
      }
      
      this.pool.providers[providerAddress] += amount;
      this.pool.totalLiquidity += amount;
      this.pool.lastUpdated = Date.now();
      
      // Distribute the new liquidity across options
      await this.distributeLiquidity(providerAddress, amount, strategy);
      
      return {
        success: true,
        totalContribution: this.pool.providers[providerAddress],
        poolSize: this.pool.totalLiquidity
      };
    } catch (error) {
      console.error('Pooled Liquidity: Add liquidity failed', error);
      throw new Error('Failed to add liquidity: ' + error.message);
    }
  }
  
  // Remove liquidity from the pool
  async removeLiquidity(providerAddress, amount) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Validate inputs
    if (!providerAddress || !amount || amount <= 0) {
      throw new Error('Invalid provider or amount');
    }
    
    // Check if provider has sufficient liquidity
    const providerLiquidity = this.pool.providers[providerAddress] || 0;
    if (providerLiquidity < amount) {
      throw new Error('Insufficient liquidity');
    }
    
    try {
      // Update the pool state
      this.pool.providers[providerAddress] -= amount;
      this.pool.totalLiquidity -= amount;
      this.pool.lastUpdated = Date.now();
      
      // Remove liquidity proportionally from all options
      await this.withdrawLiquidity(providerAddress, amount);
      
      return {
        success: true,
        remainingContribution: this.pool.providers[providerAddress],
        poolSize: this.pool.totalLiquidity
      };
    } catch (error) {
      console.error('Pooled Liquidity: Remove liquidity failed', error);
      throw new Error('Failed to remove liquidity: ' + error.message);
    }
  }
  
  // Distribute new liquidity across options based on strategy
  async distributeLiquidity(providerAddress, amount, strategy) {
    try {
      // Get eligible options
      await this.getAllEligibleOptions();
      
      if (this.pool.eligibleOptions.length === 0) {
        console.warn('No eligible options found for liquidity distribution');
        return;
      }
      
      // Calculate weights based on strategy
      const weights = this.calculateWeightsByStrategy(strategy);
      
      // Distribute liquidity according to weights
      for (const optionId of this.pool.eligibleOptions) {
        const weight = weights[optionId] || 0;
        const optionAmount = amount * weight;
        
        if (optionAmount <= 0) continue;
        
        // Get option details from the option ID (format: strike-type-expiry)
        const [strike, type, expiry] = optionId.split('-');
        const optionDetails = {
          strike: parseInt(strike),
          type,
          expiry,
          price: 0.5 // Default price, will be overridden by AMM
        };
        
        // Add liquidity to this option through the AMM
        try {
          await this.amm.addLiquidity(
            optionId,
            providerAddress,
            optionAmount,
            optionDetails
          );
        } catch (err) {
          console.error(`Error adding liquidity to option ${optionId}:`, err);
        }
      }
      
      // Record distribution for tracking
      this.pool.distributionHistory.push({
        provider: providerAddress,
        amount,
        strategy,
        weights,
        timestamp: Date.now()
      });
      
      console.log(`Pooled Liquidity: Distributed ${amount} from ${providerAddress} using ${strategy} strategy`);
    } catch (error) {
      console.error('Pooled Liquidity: Distribution failed', error);
      throw error;
    }
  }
  
  // Calculate weights for options based on selected strategy
  calculateWeightsByStrategy(strategy) {
    const weights = {};
    const options = this.pool.eligibleOptions;
    
    if (options.length === 0) return weights;
    
    // Get current AMM pools for analysis
    const ammPools = this.amm.getAllPools();
    
    switch (strategy) {
      case 'aggressive':
        // Aggressive: Higher weights to higher-volatility options
        for (const optionId of options) {
          const [strike, type] = optionId.split('-');
          const strikeValue = parseInt(strike);
          
          // Higher strikes for CALL, lower strikes for PUT get more weight
          let riskFactor;
          if (type === 'call') {
            // For calls, higher strikes are more aggressive
            riskFactor = strikeValue / 100; // Normalize to 0-1
          } else {
            // For puts, lower strikes are more aggressive
            riskFactor = 1 - (strikeValue / 100);
          }
          
          // Scale up risk factor
          weights[optionId] = Math.pow(riskFactor, 1.5);
        }
        break;
        
      case 'conservative':
        // Conservative: Higher weights to lower-volatility options
        for (const optionId of options) {
          const [strike, type] = optionId.split('-');
          const strikeValue = parseInt(strike);
          
          // Lower strikes for CALL, higher strikes for PUT get more weight
          let safetyFactor;
          if (type === 'call') {
            // For calls, lower strikes are safer
            safetyFactor = 1 - (strikeValue / 100);
          } else {
            // For puts, higher strikes are safer
            safetyFactor = strikeValue / 100;
          }
          
          // Scale up safety factor
          weights[optionId] = Math.pow(safetyFactor, 1.5);
        }
        break;
        
      case 'balanced':
      default:
        // Balanced: Equal distribution with slight adjustment for liquidity needs
        for (const optionId of options) {
          const pool = ammPools[optionId];
          
          // Base weight (equal distribution)
          let weight = 1 / options.length;
          
          // Small adjustment based on current liquidity (more goes to less liquid options)
          if (pool && pool.totalLiquidity) {
            const liquidityFactor = Math.max(0.5, Math.min(1.5, 1000 / pool.totalLiquidity));
            weight *= liquidityFactor;
          }
          
          weights[optionId] = weight;
        }
        break;
    }
    
    // Normalize weights so they sum to 1
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    
    for (const optionId of options) {
      weights[optionId] = (weights[optionId] || 0) / totalWeight;
    }
    
    return weights;
  }
  
  // Withdraw liquidity proportionally from all options
  async withdrawLiquidity(providerAddress, amount) {
    try {
      // Get all pools
      const ammPools = this.amm.getAllPools();
      
      // Find all pools where this provider has liquidity
      let totalProviderLiquidity = 0;
      const providerPools = {};
      
      for (const optionId in ammPools) {
        const pool = ammPools[optionId];
        const providerLiquidity = pool.providers?.[providerAddress] || 0;
        
        if (providerLiquidity > 0) {
          providerPools[optionId] = providerLiquidity;
          totalProviderLiquidity += providerLiquidity;
        }
      }
      
      if (totalProviderLiquidity <= 0) {
        throw new Error('No liquidity found for this provider');
      }
      
      // Withdraw proportionally from each pool
      for (const optionId in providerPools) {
        const poolLiquidity = providerPools[optionId];
        const withdrawRatio = poolLiquidity / totalProviderLiquidity;
        const withdrawAmount = amount * withdrawRatio;
        
        try {
          await this.amm.removeLiquidity(optionId, providerAddress, withdrawAmount);
        } catch (err) {
          console.error(`Error removing liquidity from option ${optionId}:`, err);
        }
      }
      
      console.log(`Pooled Liquidity: Withdrew ${amount} from ${providerAddress}`);
    } catch (error) {
      console.error('Pooled Liquidity: Withdrawal failed', error);
      throw error;
    }
  }
  
  // Calculate rewards for all providers
  async calculateRewards() {
    // This would be called periodically in a real system
    // For this mock, we'll just return sample data
    const rewards = {};
    
    for (const provider in this.pool.providers) {
      const contribution = this.pool.providers[provider];
      const shareOfPool = contribution / this.pool.totalLiquidity;
      
      // Mock calculation based on pool activity
      // In a real system, this would be based on actual trading fees
      const mockFees = this.pool.totalLiquidity * 0.001; // Assume 0.1% daily fees
      rewards[provider] = mockFees * shareOfPool;
    }
    
    // Record for historical tracking
    this.pool.rewardsHistory.push({
      rewards,
      timestamp: Date.now()
    });
    
    return rewards;
  }
  
  // Update allocation weights based on market data and activity
  async updateAllocationWeights() {
    await this.syncWithAMM();
    console.log('Pooled Liquidity: Updated allocation weights');
  }
}

export const pooledLiquidityInstance = new PooledLiquidity();
export default pooledLiquidityInstance;