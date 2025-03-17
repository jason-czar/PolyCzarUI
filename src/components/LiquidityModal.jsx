// LiquidityModal.jsx
import React, { useState, useEffect } from 'react';
import walletManager from '../utils/wallet';
import ammInstance from '../utils/amm';

function LiquidityModal({ isOpen, onClose, option }) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [error, setError] = useState('');
  const [estimatedRewards, setEstimatedRewards] = useState(0);
  const [currentLiquidity, setCurrentLiquidity] = useState(0);
  const [selectedAction, setSelectedAction] = useState('add'); // 'add' or 'remove'

  useEffect(() => {
    if (isOpen && option && walletManager.isConnected) {
      fetchBalance();
      fetchCurrentLiquidity();
    }
  }, [isOpen, option, walletManager.isConnected]);

  const fetchBalance = async () => {
    try {
      const ethBalance = await walletManager.getEthBalance();
      setBalance(parseFloat(ethBalance).toFixed(4));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Error fetching balance');
    }
  };

  const fetchCurrentLiquidity = () => {
    if (!option) return;
    
    const optionId = `${option.strike}-${option.type}-${option.expiry}`;
    const providerLiquidity = ammInstance.getProviderLiquidity(
      optionId, 
      walletManager.address
    );
    
    setCurrentLiquidity(providerLiquidity);
  };

  const calculateEstimatedRewards = (amt) => {
    // Simple estimation based on 0.3% fee per transaction
    // In a real system, this would be more complex
    const dailyTradeVolume = 1000; // Mock volume
    const feePercentage = 0.003;
    const shareOfPool = amt / (parseFloat(amt) + 1000); // Assuming 1000 existing liquidity
    
    const dailyFees = dailyTradeVolume * feePercentage;
    const dailyRewards = dailyFees * shareOfPool;
    const annualRewards = dailyRewards * 365;
    
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
      setAmount(String(currentLiquidity));
      const rewards = calculateEstimatedRewards(currentLiquidity);
      setEstimatedRewards(rewards);
    }
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    setError('');
    setIsAddingLiquidity(true);
    
    try {
      const optionId = `${option.strike}-${option.type}-${option.expiry}`;
      
      if (selectedAction === 'add') {
        if (parseFloat(amount) > parseFloat(balance)) {
          throw new Error('Insufficient balance');
        }
        
        await ammInstance.addLiquidity(
          optionId,
          walletManager.address,
          parseFloat(amount),
          option
        );
      } else {
        if (parseFloat(amount) > currentLiquidity) {
          throw new Error('Insufficient liquidity to remove');
        }
        
        await ammInstance.removeLiquidity(
          optionId,
          walletManager.address,
          parseFloat(amount)
        );
      }
      
      await fetchBalance();
      await fetchCurrentLiquidity();
      onClose();
    } catch (err) {
      console.error('Liquidity operation failed:', err);
      setError(err.message || 'Liquidity operation failed');
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  if (!isOpen || !option) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-gray-900 w-full max-w-md p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">Provide Liquidity</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>
        
        <div className="mb-6">
          <p className="mb-2">
            {option.strike}% {option.type.toUpperCase()} {option.expiry}
          </p>
          
          <div className="bg-gray-800 p-3 rounded mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Current Price</span>
              <span>${option.price}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Your Liquidity</span>
              <span>{currentLiquidity.toFixed(4)} ETH</span>
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
              disabled={currentLiquidity <= 0}
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
          
          <div className="bg-gray-800 p-3 rounded mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Estimated Annual Rewards</span>
              <span className="text-green-500">${estimatedRewards.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Fee Tier</span>
              <span>0.3%</span>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 p-2 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={isAddingLiquidity || !amount}
            className={`w-full py-3 bg-green-500 text-black rounded-lg font-medium ${
              isAddingLiquidity || !amount ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600'
            }`}
          >
            {isAddingLiquidity ? (
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

export default LiquidityModal;