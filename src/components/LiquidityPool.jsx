// src/components/LiquidityPool.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import walletManager from '../utils/wallet';
import { pooledLiquidityInstance } from '../utils/pooledLiquidity';
import ammInstance from '../utils/amm';

function LiquidityPool({ isOpen, onClose, marketData }) {
  const { user } = useUser();
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [estimatedRewards, setEstimatedRewards] = useState(0);
  const [poolStats, setPoolStats] = useState({
    totalLiquidity: 0,
    userLiquidity: 0,
    optionsCount: 0,
    apr: 0,
    feeRate: 0.3 // 0.3%
  });
  const [selectedAction, setSelectedAction] = useState('add'); // 'add' or 'remove'
  const [allocation, setAllocation] = useState({
    strategy: 'balanced', // balanced, aggressive, conservative
    custom: {}
  });

  useEffect(() => {
    if (isOpen && walletManager.isConnected) {
      fetchBalance();
      fetchPoolStats();
    }
  }, [isOpen, walletManager.isConnected]);

  const fetchBalance = async () => {
    try {
      const ethBalance = await walletManager.getEthBalance();
      setBalance(parseFloat(ethBalance).toFixed(4));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Error fetching balance');
    }
  };

  const fetchPoolStats = async () => {
    try {
      // Get total pool stats
      const poolDetails = await pooledLiquidityInstance.getPoolStats();
      
      // Get user's contribution to the pool
      const userContribution = await pooledLiquidityInstance.getUserContribution(
        walletManager.address || 'unknown'
      );
      
      // Calculate APR based on historical rewards data
      const apr = await pooledLiquidityInstance.calculateEstimatedApr();
      
      // Count options that receive liquidity
      const options = await pooledLiquidityInstance.getAllEligibleOptions();
      
      setPoolStats({
        totalLiquidity: poolDetails.totalLiquidity,
        userLiquidity: userContribution,
        optionsCount: options.length,
        apr: apr,
        feeRate: poolDetails.feeRate || 0.3
      });
    } catch (err) {
      console.error('Error fetching pool stats:', err);
    }
  };

  const calculateEstimatedRewards = (amt) => {
    if (!amt) return 0;
    
    const amount = parseFloat(amt);
    const totalPoolSize = poolStats.totalLiquidity + (selectedAction === 'add' ? amount : 0);
    const userShare = selectedAction === 'add' 
      ? (poolStats.userLiquidity + amount) / totalPoolSize
      : Math.max(0, poolStats.userLiquidity - amount) / Math.max(1, totalPoolSize);
    
    // Calculate annual rewards based on APR
    const annualRewards = totalPoolSize * (poolStats.apr / 100) * userShare;
    
    return annualRewards;
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d*\.?\d*$/).test(value)) {
      setAmount(value);
      
      if (value) {
        const rewards = calculateEstimatedRewards(parseFloat(value));
        setEstimatedRewards(rewards);
      } else {
        setEstimatedRewards(0);
      }
    }
  };

  const handleMaxClick = () => {
    if (selectedAction === 'add') {
      // Leave a small amount for gas
      const maxAmount = Math.max(0, parseFloat(balance) - 0.01).toFixed(4);
      setAmount(maxAmount);
      const rewards = calculateEstimatedRewards(parseFloat(maxAmount));
      setEstimatedRewards(rewards);
    } else {
      // Set the maximum removable amount (user's total contribution)
      const maxRemovable = poolStats.userLiquidity.toFixed(4);
      setAmount(String(maxRemovable));
      const rewards = calculateEstimatedRewards(maxRemovable);
      setEstimatedRewards(rewards);
    }
  };

  const handleAllocationChange = (strategy) => {
    setAllocation({
      ...allocation,
      strategy
    });
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setError('');
    setIsProcessing(true);
    
    try {
      if (selectedAction === 'add') {
        if (parseFloat(amount) > parseFloat(balance)) {
          throw new Error('Insufficient balance');
        }
        
        await pooledLiquidityInstance.addLiquidity(
          walletManager.address,
          parseFloat(amount),
          allocation.strategy
        );
      } else {
        if (parseFloat(amount) > poolStats.userLiquidity) {
          throw new Error('Insufficient liquidity to remove');
        }
        
        await pooledLiquidityInstance.removeLiquidity(
          walletManager.address,
          parseFloat(amount)
        );
      }
      
      await fetchBalance();
      await fetchPoolStats();
      onClose();
    } catch (err) {
      console.error('Liquidity operation failed:', err);
      setError(err.message || 'Liquidity operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Calculate allocation percentages based on strategy
  const getAllocationDisplay = () => {
    switch (allocation.strategy) {
      case 'aggressive':
        return 'Higher allocations to higher-risk options (higher potential returns)';
      case 'conservative':
        return 'Higher allocations to lower-risk options (more stable returns)';
      case 'balanced':
      default:
        return 'Equal distribution across all eligible options';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 w-full max-w-md p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">Unified Liquidity Pool</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <div className="bg-gray-800 p-3 rounded mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Total Pool Size</span>
              <span>{poolStats.totalLiquidity.toFixed(4)} ETH</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Your Liquidity</span>
              <span>{poolStats.userLiquidity.toFixed(4)} ETH</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Options Covered</span>
              <span>{poolStats.optionsCount}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Current APR</span>
              <span className="text-green-500">{poolStats.apr.toFixed(2)}%</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Your Pool Share</div>
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-green-500 h-full" 
                  style={{ 
                    width: `${Math.min(100, (poolStats.userLiquidity / poolStats.totalLiquidity) * 100).toFixed(2)}%` 
                  }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {((poolStats.userLiquidity / poolStats.totalLiquidity) * 100).toFixed(1)}% of pool
              </div>
            </div>
          </div>
          
          <div className="flex bg-gray-800 rounded-lg p-1 mb-4">
            <button
              className={`flex-1 py-2 rounded-md ${selectedAction === 'add' ? 'bg-gray-700' : ''}`}
              onClick={() => setSelectedAction('add')}
            >
              Add
            </button>
            <button
              className={`flex-1 py-2 rounded-md ${selectedAction === 'remove' ? 'bg-gray-700' : ''}`}
              onClick={() => setSelectedAction('remove')}
              disabled={poolStats.userLiquidity <= 0}
            >
              Remove
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">
              {selectedAction === 'add' ? 'Amount to Provide' : 'Amount to Remove'}
            </label>
            <div className="flex bg-gray-800 rounded-lg p-2 items-center">
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                className="bg-transparent flex-grow outline-none text-white"
                placeholder="0.0"
              />
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">ETH</span>
                <button
                  onClick={handleMaxClick}
                  className="bg-gray-700 hover:bg-gray-600 text-sm px-2 py-1 rounded"
                >
                  MAX
                </button>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400 mt-1">
              Balance: {balance} ETH
            </div>
          </div>
          
          {selectedAction === 'add' && (
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">
                Allocation Strategy
              </label>
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  className={`flex-1 py-2 text-sm rounded-md ${allocation.strategy === 'balanced' ? 'bg-gray-700' : ''}`}
                  onClick={() => handleAllocationChange('balanced')}
                >
                  Balanced
                </button>
                <button
                  className={`flex-1 py-2 text-sm rounded-md ${allocation.strategy === 'aggressive' ? 'bg-gray-700' : ''}`}
                  onClick={() => handleAllocationChange('aggressive')}
                >
                  Aggressive
                </button>
                <button
                  className={`flex-1 py-2 text-sm rounded-md ${allocation.strategy === 'conservative' ? 'bg-gray-700' : ''}`}
                  onClick={() => handleAllocationChange('conservative')}
                >
                  Conservative
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {getAllocationDisplay()}
              </div>
            </div>
          )}
          
          <div className="bg-gray-800 p-3 rounded mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Estimated Annual Rewards</span>
              <span className="text-green-500">${estimatedRewards.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Fee Tier</span>
              <span>{(poolStats.feeRate * 100).toFixed(1)}%</span>
            </div>
            
            {/* Rewards projection visualization */}
            {estimatedRewards > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-500 mb-2">Projected Monthly Rewards</div>
                <div className="flex justify-between items-end h-12">
                  {[1, 2, 3, 4, 5, 6].map((month) => (
                    <div key={month} className="flex flex-col items-center w-full">
                      <div 
                        className="w-6 bg-green-600 rounded-sm" 
                        style={{ 
                          height: `${Math.min(100, (estimatedRewards / 12) * month * 0.8)}%`,
                          opacity: 0.5 + (month * 0.08)
                        }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1">{month}m</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !amount}
            className={`w-full py-3 bg-green-500 text-black rounded-lg font-medium ${
              isProcessing || !amount ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {selectedAction === 'add' ? 'Adding Liquidity...' : 'Removing Liquidity...'}
              </div>
            ) : (
              <>{selectedAction === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiquidityPool;