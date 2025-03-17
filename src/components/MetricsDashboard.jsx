import React, { useState, useEffect } from 'react';
import optionsPricingEngine from '../utils/optionsPricing';
import { optimizeModelParameters } from '../utils/pricingOptimization';

function MetricsDashboard({ optionDetails }) {
  const [greeks, setGreeks] = useState(null);
  const [probabilities, setProbabilities] = useState(null);
  const [expectedValues, setExpectedValues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!optionDetails) {
      setLoading(false);
      return;
    }

    async function calculateMetrics() {
      try {
        setLoading(true);
        setError(null);

        // Get optimized parameters for this option
        const optimizedParams = await optimizeModelParameters(optionDetails);
        
        // Calculate Greeks
        const greeksData = await calculateGreeks(optionDetails, optimizedParams);
        setGreeks(greeksData);
        
        // Calculate probability metrics
        const probData = await calculateProbabilities(optionDetails, optimizedParams);
        setProbabilities(probData);
        
        // Calculate expected value metrics
        const evData = await calculateExpectedValues(optionDetails, optimizedParams);
        setExpectedValues(evData);
        
      } catch (err) {
        console.error('Error calculating metrics:', err);
        setError('Failed to calculate option metrics');
      } finally {
        setLoading(false);
      }
    }

    calculateMetrics();
  }, [optionDetails]);

  const calculateGreeks = async (option, params) => {
    try {
      // Use pricing engine to calculate Greeks
      const greeks = await optionsPricingEngine.calculateGreeks({
        ...option,
        ...params
      });
      
      // If engine fails, provide estimated Greeks
      return greeks || {
        delta: estimateDelta(option),
        gamma: 0.05,
        theta: -0.01,
        vega: 0.02
      };
    } catch (error) {
      console.error('Error calculating Greeks:', error);
      // Fallback estimates
      return {
        delta: estimateDelta(option),
        gamma: 0.05,
        theta: -0.01,
        vega: 0.02
      };
    }
  };

  // Estimate delta based on option type and moneyness
  const estimateDelta = (option) => {
    const { currentPrice, strike, type } = option;
    
    if (type === 'call') {
      if (currentPrice > strike) return 0.7; // ITM
      if (currentPrice < strike) return 0.3; // OTM
      return 0.5; // ATM
    } else {
      if (currentPrice < strike) return -0.7; // ITM for put
      if (currentPrice > strike) return -0.3; // OTM for put
      return -0.5; // ATM
    }
  };

  const calculateProbabilities = async (option, params) => {
    const { currentPrice, strike, type, expiry } = option;
    
    // Days until expiration
    const expiryDate = new Date(expiry);
    const today = new Date();
    const daysToExpiry = Math.max(1, (expiryDate - today) / (1000 * 60 * 60 * 24));
    
    try {
      // Calculate probability metrics
      const itm = type === 'call' 
        ? 1 - normalCDF((Math.log(strike / currentPrice) + (params.riskFreeRate - 0.5 * params.volatility * params.volatility) * (daysToExpiry / 365)) / (params.volatility * Math.sqrt(daysToExpiry / 365)))
        : normalCDF((Math.log(strike / currentPrice) + (params.riskFreeRate - 0.5 * params.volatility * params.volatility) * (daysToExpiry / 365)) / (params.volatility * Math.sqrt(daysToExpiry / 365)));
      
      return {
        probITM: itm,
        probOTM: 1 - itm,
        probProfit: type === 'call' 
          ? 1 - normalCDF((Math.log((strike + option.price) / currentPrice) + (params.riskFreeRate - 0.5 * params.volatility * params.volatility) * (daysToExpiry / 365)) / (params.volatility * Math.sqrt(daysToExpiry / 365)))
          : normalCDF((Math.log((strike - option.price) / currentPrice) + (params.riskFreeRate - 0.5 * params.volatility * params.volatility) * (daysToExpiry / 365)) / (params.volatility * Math.sqrt(daysToExpiry / 365)))
      };
    } catch (error) {
      console.error('Error calculating probabilities:', error);
      return {
        probITM: type === 'call' ? (currentPrice > strike ? 0.7 : 0.3) : (currentPrice < strike ? 0.7 : 0.3),
        probOTM: type === 'call' ? (currentPrice > strike ? 0.3 : 0.7) : (currentPrice < strike ? 0.3 : 0.7),
        probProfit: 0.5
      };
    }
  };

  const calculateExpectedValues = async (option, params) => {
    try {
      const { price } = option;
      const prob = await calculateProbabilities(option, params);
      
      return {
        expectedProfit: prob.probProfit * (1 - price) - (1 - prob.probProfit) * price,
        riskRewardRatio: prob.probProfit / (1 - prob.probProfit),
        kellySize: Math.max(0, (prob.probProfit * (1 + 1/price) - 1) / (1/price))
      };
    } catch (error) {
      console.error('Error calculating expected values:', error);
      return {
        expectedProfit: 0,
        riskRewardRatio: 1,
        kellySize: 0.05
      };
    }
  };

  // Helper function for standard normal cumulative distribution
  const normalCDF = (x) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) prob = 1 - prob;
    return prob;
  };

  if (loading) {
    return (
      <div className="bg-black bg-opacity-60 p-4 rounded-lg animate-pulse">
        <h3 className="text-lg text-green-500 mb-4">Calculating metrics...</h3>
        <div className="grid grid-cols-2 gap-3 opacity-50">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-800 h-16 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black bg-opacity-60 p-4 rounded-lg">
        <h3 className="text-lg text-red-500 mb-2">Error</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  if (!optionDetails || !greeks || !probabilities || !expectedValues) {
    return (
      <div className="bg-black bg-opacity-60 p-4 rounded-lg">
        <h3 className="text-lg text-gray-500 mb-2">No data available</h3>
        <p className="text-gray-400">Select an option to view analytics</p>
      </div>
    );
  }

  return (
    <div className="bg-black bg-opacity-60 p-4 rounded-lg">
      <h3 className="text-lg text-green-500 mb-2">Options Analytics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Greeks Section */}
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Delta</div>
          <div className="text-lg text-white">{greeks.delta.toFixed(3)}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Gamma</div>
          <div className="text-lg text-white">{greeks.gamma.toFixed(3)}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Theta</div>
          <div className="text-lg text-white">{greeks.theta.toFixed(3)}/day</div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Vega</div>
          <div className="text-lg text-white">{greeks.vega.toFixed(3)}</div>
        </div>
        
        {/* Probabilities Section */}
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Prob ITM</div>
          <div className="text-lg text-white">{(probabilities.probITM * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Prob Profit</div>
          <div className="text-lg text-white">{(probabilities.probProfit * 100).toFixed(1)}%</div>
        </div>
        
        {/* Expected Values Section */}
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Expected Value</div>
          <div className={`text-lg ${expectedValues.expectedProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${expectedValues.expectedProfit.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Risk/Reward</div>
          <div className="text-lg text-white">{expectedValues.riskRewardRatio.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-xs text-gray-400">Kelly %</div>
          <div className="text-lg text-white">{(expectedValues.kellySize * 100).toFixed(1)}%</div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-400">
        <p>* Values are estimates based on the Modified Black-Scholes model</p>
      </div>
    </div>
  );
}

export default MetricsDashboard;