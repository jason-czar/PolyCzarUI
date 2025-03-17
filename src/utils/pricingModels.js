// src/utils/pricingModels.js
/**
 * Pricing models for binary options in prediction markets
 * Implements the Modified Black-Scholes model for binary options
 */

/**
 * Interface for pricing models
 */
export class PricingModel {
  calculatePrice(params) {
    throw new Error('Method not implemented');
  }
}

/**
 * Black-Scholes model adapted for binary options
 */
export class BlackScholesBinaryModel extends PricingModel {
  /**
   * Calculate binary option price using Modified Black-Scholes
   * @param {Object} params - Pricing parameters
   * @param {number} params.currentProbability - Current probability (0-100%)
   * @param {number} params.strikeProbability - Strike probability (0-100%)
   * @param {number} params.timeToExpiry - Time to expiry in years
   * @param {number} params.volatility - Annualized volatility (e.g. 0.5 for 50%)
   * @param {number} params.riskFreeRate - Annual risk-free rate (e.g. 0.05 for 5%)
   * @param {string} params.optionType - 'call' or 'put'
   * @param {number} params.liquidityFactor - Liquidity adjustment factor (0-1)
   * @returns {Object} Option price information with bid and ask prices
   */
  calculatePrice(params) {
    const {
      currentProbability,  // 0-100%
      strikeProbability,   // 0-100%
      timeToExpiry,        // in years
      volatility,          // annualized, e.g., 0.5 for 50%
      riskFreeRate,        // annualized, e.g., 0.05 for 5%
      optionType,          // 'call' or 'put'
      liquidityFactor = 0.1  // 0-1, higher means less liquid
    } = params;
    
    // Convert percentages to decimals
    const S = currentProbability / 100;
    const K = strikeProbability / 100;
    
    // Handle edge cases
    if (timeToExpiry <= 0) {
      // At expiration, option is worth 1 if in the money, 0 otherwise
      if (optionType === 'call') {
        const midPrice = S > K ? 1 : 0;
        return {
          midPrice,
          bidPrice: midPrice,
          askPrice: midPrice,
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          timestamp: new Date()
        };
      } else { // put
        const midPrice = S < K ? 1 : 0;
        return {
          midPrice,
          bidPrice: midPrice,
          askPrice: midPrice,
          delta: 0,
          gamma: 0,
          theta: 0,
          vega: 0,
          timestamp: new Date()
        };
      }
    }

    // Very low probability case - numerical stability
    if (S < 0.001) {
      if (optionType === 'call') {
        return {
          midPrice: 0.001,
          bidPrice: 0,
          askPrice: 0.002,
          delta: 0.01,
          gamma: 0.01,
          theta: -0.001,
          vega: 0.001,
          timestamp: new Date()
        };
      }
    }
    
    // Very high probability case - numerical stability
    if (S > 0.999) {
      if (optionType === 'put') {
        return {
          midPrice: 0.001,
          bidPrice: 0,
          askPrice: 0.002,
          delta: -0.01,
          gamma: 0.01,
          theta: -0.001,
          vega: 0.001,
          timestamp: new Date()
        };
      }
    }
    
    // Calculate d1 and d2
    const { d1, d2 } = this.calculateD1D2({
      S, K, timeToExpiry, volatility, riskFreeRate
    });
    
    // Calculate theoretical price
    let midPrice, delta, gamma, theta, vega;
    
    if (optionType === 'call') {
      // For binary call: e^(-rT) * N(d2)
      midPrice = Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);
      delta = Math.exp(-riskFreeRate * timeToExpiry) * this.normalPDF(d2) / (S * volatility * Math.sqrt(timeToExpiry));
      gamma = -delta * d1 / (S * volatility * Math.sqrt(timeToExpiry));
    } else { // put
      // For binary put: e^(-rT) * N(-d2)
      midPrice = Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2);
      delta = -Math.exp(-riskFreeRate * timeToExpiry) * this.normalPDF(d2) / (S * volatility * Math.sqrt(timeToExpiry));
      gamma = -delta * d1 / (S * volatility * Math.sqrt(timeToExpiry));
    }
    
    // Calculate the Greeks
    vega = Math.exp(-riskFreeRate * timeToExpiry) * this.normalPDF(d2) * Math.sqrt(timeToExpiry);
    theta = -Math.exp(-riskFreeRate * timeToExpiry) * this.normalPDF(d2) * 
            (riskFreeRate * this.normalCDF(d2) + 
             volatility * S * this.normalPDF(d2) / (2 * Math.sqrt(timeToExpiry)));

    // Ensure the price is between 0 and 1
    midPrice = Math.max(0, Math.min(1, midPrice));
    
    // Apply liquidity adjustment
    const baseBidAskSpread = 0.05; // $0.05 spread
    const dynamicSpread = baseBidAskSpread * (1 + liquidityFactor);
    
    // Return bid and ask prices
    return {
      midPrice: midPrice,
      bidPrice: Math.max(0, midPrice - (dynamicSpread / 2)),
      askPrice: Math.min(1, midPrice + (dynamicSpread / 2)),
      delta: delta,
      gamma: gamma,
      theta: theta,
      vega: vega,
      timestamp: new Date()
    };
  }

  /**
   * Calculate d1 and d2 parameters for Black-Scholes
   */
  calculateD1D2(params) {
    const { S, K, timeToExpiry, volatility, riskFreeRate } = params;
    
    // Handle edge case with extreme prices or low volatility
    if (S === 0 || S === 1 || volatility < 0.01 || timeToExpiry < 0.001) {
      return { d1: 0, d2: 0 };
    }
    
    const d1 = (Math.log(S / K) + (riskFreeRate + 0.5 * Math.pow(volatility, 2)) * timeToExpiry) / 
              (volatility * Math.sqrt(timeToExpiry));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiry);
    
    return { d1, d2 };
  }
  
  /**
   * Standard normal cumulative distribution function
   */
  normalCDF(x) {
    // Approximation of the normal CDF
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    if (x > 0) {
      prob = 1 - prob;
    }
    
    return prob;
  }
  
  /**
   * Standard normal probability density function
   */
  normalPDF(x) {
    return Math.exp(-Math.pow(x, 2) / 2) / Math.sqrt(2 * Math.PI);
  }
}

/**
 * Binomial model for binary options
 * Used for very short-term options (less than 7 days)
 */
export class BinomialModel extends PricingModel {
  /**
   * Calculate binary option price using binomial model
   */
  calculatePrice(params) {
    const {
      currentProbability,  // 0-100%
      strikeProbability,   // 0-100%
      timeToExpiry,        // in years
      volatility,          // annualized, e.g., 0.5 for 50%
      riskFreeRate,        // annualized, e.g., 0.05 for 5%
      optionType,          // 'call' or 'put'
      liquidityFactor = 0.1  // 0-1, higher means less liquid
    } = params;
    
    // Convert percentages to decimals
    const S = currentProbability / 100;
    const K = strikeProbability / 100;

    // For very short-term options, use fewer steps
    const steps = Math.max(5, Math.min(50, Math.ceil(timeToExpiry * 365)));
    
    // Build the binomial tree
    const tree = this.buildTree(steps, { S, K, timeToExpiry, volatility, riskFreeRate });
    
    // Get the option price from the tree
    let midPrice = tree[0][0];
    
    // Apply liquidity adjustment
    const baseBidAskSpread = 0.05; // $0.05 spread
    const dynamicSpread = baseBidAskSpread * (1 + liquidityFactor);
    
    // Return bid and ask prices
    return {
      midPrice: midPrice,
      bidPrice: Math.max(0, midPrice - (dynamicSpread / 2)),
      askPrice: Math.min(1, midPrice + (dynamicSpread / 2)),
      delta: 0.5,  // Simplified Greeks for binomial model
      gamma: 0.1,
      theta: -0.01,
      vega: 0.05,
      timestamp: new Date()
    };
  }
  
  /**
   * Build binomial tree for option pricing
   */
  buildTree(steps, params) {
    const { S, K, timeToExpiry, volatility, riskFreeRate } = params;
    
    const dt = timeToExpiry / steps;
    const u = Math.exp(volatility * Math.sqrt(dt));
    const d = 1 / u;
    const p = (Math.exp(riskFreeRate * dt) - d) / (u - d);
    
    // Initialize tree with final payoffs
    let tree = new Array(steps + 1);
    for (let i = 0; i <= steps; i++) {
      tree[i] = new Array(i + 1);
      const finalProbability = S * Math.pow(u, steps - i) * Math.pow(d, i);
      
      // Binary payoff at expiration (1 or 0)
      tree[i][i] = (finalProbability > K) ? 1 : 0;
    }
    
    // Work backwards through the tree
    for (let j = steps - 1; j >= 0; j--) {
      for (let i = 0; i <= j; i++) {
        // Calculate the option value at this node
        tree[i][j] = Math.exp(-riskFreeRate * dt) * (p * tree[i][j + 1] + (1 - p) * tree[i + 1][j + 1]);
      }
    }
    
    return tree;
  }
}

/**
 * Factory for creating pricing models based on parameters
 */
export class PricingModelFactory {
  static createModel(params) {
    const { timeToExpiry } = params;
    
    // Use binomial model for very short-term options
    if (timeToExpiry < 7 / 365) {
      return new BinomialModel();
    }
    
    // Use Black-Scholes for standard cases
    return new BlackScholesBinaryModel();
  }
}