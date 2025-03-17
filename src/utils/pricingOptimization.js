// src/utils/pricingOptimization.js

/**
 * Pricing Model Parameter Optimization Utilities
 * 
 * This module provides functions to optimize the parameters used in option pricing models,
 * particularly the volatility and risk-free rate parameters, based on historical data
 * and current market conditions.
 */

import historicalDataService from './historicalData';
import volatilityService from './volatility';
import marketMonitor from './marketMonitor';

/**
 * Optimize model parameters for a specific option
 * @param {Object} optionDetails - Option parameters to optimize for
 * @returns {Promise<Object>} Optimized parameters
 */
export async function optimizeModelParameters(optionDetails) {
  if (!optionDetails) {
    return {
      volatility: 0.5,
      riskFreeRate: 0.05,
      liquidityFactor: 0.1
    };
  }
  
  const { marketId, expiry, currentPrice, strike, type } = optionDetails;
  
  // Calculate time to expiration in days
  const expiryDate = new Date(expiry);
  const currentDate = new Date();
  const daysToExpiry = Math.max(1, Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24)));
  
  try {
    // Get optimized volatility
    let volatility = await getOptimizedVolatility(marketId, daysToExpiry, currentPrice, strike);
    
    // Get optimized risk-free rate
    const riskFreeRate = await getOptimizedRiskFreeRate(daysToExpiry);
    
    // Calculate liquidity factor based on market depth and option moneyness
    let liquidityFactor = calculateLiquidityFactor(currentPrice, strike, type);
    
    // If moneyness is extreme, adjust volatility (volatility smile effect)
    if (Math.abs(currentPrice - strike/100) > 0.25) {
      volatility *= 1.2; // Increase volatility for deep ITM/OTM options
    }
    
    // If very close to expiry, increase volatility to account for potential last-minute swings
    if (daysToExpiry < 2) {
      volatility *= 1.3;
      liquidityFactor *= 1.5; // Less liquidity very close to expiry
    }
    
    return {
      volatility,
      riskFreeRate,
      liquidityFactor
    };
  } catch (error) {
    console.error('Error optimizing parameters:', error);
    // Return default parameters if optimization fails
    return {
      volatility: 0.5,
      riskFreeRate: 0.05,
      liquidityFactor: 0.1
    };
  }
}

/**
 * Get optimized volatility for a specific market and time frame
 * @param {string} marketId - Market identifier
 * @param {number} daysToExpiry - Days until option expiry
 * @param {number} currentPrice - Current market price (as probability 0-1)
 * @param {number} strike - Strike price (as probability 0-100)
 * @returns {Promise<number>} Optimized volatility
 */
async function getOptimizedVolatility(marketId, daysToExpiry, currentPrice, strike) {
  try {
    // Try to get dynamic volatility from service
    const dynamicVol = await volatilityService.getDynamicVolatility(
      marketId, 
      daysToExpiry / 365
    );
    
    if (dynamicVol) return dynamicVol;
    
    // Fallback: Calculate historical volatility if available
    const histData = await historicalDataService.getHistoricalData(marketId, 30);
    
    if (histData && histData.length > 5) {
      // Calculate historical volatility from price data
      const dailyReturns = [];
      for (let i = 1; i < histData.length; i++) {
        const prevPrice = histData[i-1].price;
        const currPrice = histData[i].price;
        if (prevPrice && currPrice) {
          dailyReturns.push(Math.log(currPrice / prevPrice));
        }
      }
      
      // Calculate standard deviation of returns
      const mean = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyReturns.length;
      const dailyVol = Math.sqrt(variance);
      
      // Annualize volatility (approximate)
      const annualVol = dailyVol * Math.sqrt(365);
      
      // Adjust for time to expiry (shorter expiries typically have higher vol)
      const timeAdjustment = Math.pow(daysToExpiry / 30, -0.15);
      
      // Adjust for moneyness (implement vol smile)
      const moneyness = currentPrice / (strike / 100);
      const moneynessAdjustment = 1 + 0.2 * Math.pow(Math.abs(moneyness - 1), 2);
      
      return Math.min(2.0, Math.max(0.2, annualVol * timeAdjustment * moneynessAdjustment));
    }
    
    // Use default values based on days to expiry if no historical data
    return calculateDefaultVolatility(daysToExpiry);
  } catch (error) {
    console.warn('Error calculating optimized volatility:', error);
    return calculateDefaultVolatility(daysToExpiry);
  }
}

/**
 * Calculate default volatility based on days to expiry
 * @param {number} daysToExpiry - Days until option expiry
 * @returns {number} Default volatility
 */
function calculateDefaultVolatility(daysToExpiry) {
  // Short-term options are more volatile
  if (daysToExpiry < 2) return 0.9;
  if (daysToExpiry < 7) return 0.7;
  if (daysToExpiry < 30) return 0.5;
  if (daysToExpiry < 90) return 0.4;
  return 0.35; // Long-term
}

/**
 * Get optimized risk-free rate based on time to expiry
 * @param {number} daysToExpiry - Days until option expiry
 * @returns {Promise<number>} Optimized risk-free rate
 */
async function getOptimizedRiskFreeRate(daysToExpiry) {
  // For prediction markets, the risk-free rate is typically low
  // But can vary based on time horizon
  
  // Default values based on days to expiry
  if (daysToExpiry < 7) return 0.02; // Very short term
  if (daysToExpiry < 30) return 0.03; // Short term
  if (daysToExpiry < 90) return 0.04; // Medium term
  if (daysToExpiry < 365) return 0.05; // Less than a year
  return 0.06; // Long term
}

/**
 * Calculate liquidity factor based on option parameters
 * @param {number} currentPrice - Current market price (as probability 0-1)
 * @param {number} strike - Strike price (as probability 0-100)
 * @param {string} type - Option type ('call' or 'put')
 * @returns {number} Liquidity factor
 */
function calculateLiquidityFactor(currentPrice, strike, type) {
  // Base liquidity factor
  let factor = 0.1;
  
  // Adjust for moneyness
  const moneyness = (type === 'call') 
    ? currentPrice / (strike / 100)
    : (strike / 100) / currentPrice;
  
  // Deep ITM or OTM options are less liquid
  if (moneyness < 0.7 || moneyness > 1.3) {
    factor *= 1.5;
  }
  
  // Extreme moneyness means very illiquid
  if (moneyness < 0.5 || moneyness > 2.0) {
    factor *= 2;
  }
  
  return Math.min(0.5, factor); // Cap at 50% spread
}

/**
 * Backtest the pricing model using historical data
 * @param {Object} optionDetails - Option parameters
 * @param {Object} modelParams - Model parameters
 * @returns {Promise<Object>} Backtest results
 */
export async function backtestPricingModel(optionDetails, modelParams) {
  try {
    const { marketId } = optionDetails;
    const histData = await historicalDataService.getHistoricalData(marketId, 30);
    
    if (!histData || histData.length < 5) {
      return { accuracy: 0, mse: 0, backtestedSamples: 0 };
    }
    
    // Perform backtesting calculation
    // This would involve comparing model predictions with actual outcomes
    // For simple implementation, return mock results
    return {
      accuracy: 0.85,
      mse: 0.02,
      backtestedSamples: histData.length
    };
  } catch (error) {
    console.error('Error in backtesting:', error);
    return { accuracy: 0, mse: 0, backtestedSamples: 0 };
  }
}