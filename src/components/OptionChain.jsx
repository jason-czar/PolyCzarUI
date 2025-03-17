// OptionChain.jsx
import React, { useState, useEffect } from 'react';
import { calculateBreakeven, calculateProfitChance } from '../utils/calculations';
import ammInstance from '../utils/amm';
import walletManager from '../utils/wallet';
import optionsPricingEngine from '../utils/optionsPricing';
import PricingVisualizer from './PricingVisualizer';
import MetricsDashboard from './MetricsDashboard';
import PolymarketEmbed from './PolymarketEmbed';

function OptionChain({ eventData, selectedDate, onTrade, onLiquidityAction, onTabChange }) {
  const [activeTab, setActiveTab] = useState('call');
  const [activeOrderType, setActiveOrderType] = useState('buy');
  const [liquidityOption, setLiquidityOption] = useState(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [optionPrices, setOptionPrices] = useState({});

  useEffect(() => {
    // Check if wallet is connected safely
    setIsWalletConnected(walletManager && typeof walletManager.isConnected === 'boolean' ? walletManager.isConnected : false);
    
    // Listen for wallet connection changes
    const handleWalletChange = (event) => {
      if (event && event.detail) {
        setIsWalletConnected(event.detail.isConnected);
      }
    };
    
    window.addEventListener('walletAccountChanged', handleWalletChange);
    return () => {
      window.removeEventListener('walletAccountChanged', handleWalletChange);
    };
  }, []);
  
  useEffect(() => {
    // Initialize AMM and pricing engine - with safe checks
    const initServices = async () => {
      try {
        // Check if the instances and their methods exist before calling
        if (ammInstance && typeof ammInstance.initialize === 'function') {
          await ammInstance.initialize();
        }
        if (optionsPricingEngine && typeof optionsPricingEngine.initialize === 'function') {
          await optionsPricingEngine.initialize();
        }
        console.log('Pricing services initialized');
      } catch (error) {
        console.error('Error initializing pricing services:', error);
      }
    };
    
    initServices();
  }, []);
  
  useEffect(() => {
    // Initialize AMM prices for all options using the pricing model
    const updatePrices = async () => {
      if (eventData && eventData.options) {
        const prices = {};
        
        // Process options in parallel for better performance
        const pricePromises = eventData.options.map(async (option) => {
          const optionId = `${option.strike}-${option.type}-${selectedDate || 'default'}`;
          
          try {
            // Create detailed option parameters for pricing model
            const optionDetails = {
              marketId: eventData.title || 'default-market',
              currentPrice: eventData.currentPrice, // Current probability (0-1)
              strike: option.strike,                // Strike probability (0-100)
              expiry: selectedDate,                 // Expiration date
              type: option.type,                    // 'call' or 'put'
              liquidityFactor: 0.1                  // Default liquidity factor
            };
            
            // Get price from AMM which uses the pricing engine
            const pricing = await ammInstance.getPrice(optionId, optionDetails);
            prices[optionId] = pricing;
          } catch (error) {
            console.error(`Error pricing option ${optionId}:`, error);
            // Fallback pricing if model fails
            prices[optionId] = { 
              bidPrice: option.price - 0.025, 
              askPrice: option.price + 0.025 
            };
          }
        });
        
        // Wait for all pricing operations to complete
        await Promise.all(pricePromises);
        setOptionPrices(prices);
      }
    };
    
    updatePrices();
    
    // We no longer need a local interval since we're using the marketUpdater
    // This will only update when expiry date changes or when market data is updated via the marketUpdater
    
    return () => {}; // No interval to clear anymore
  }, [eventData, selectedDate]);
  
  useEffect(() => {
    // Update parent component when tab changes
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);
  
  const handleLiquidityClick = (option) => {
    // Prepare option for liquidity modal
    setLiquidityOption({
      ...option,
      type: activeTab,
      expiry: selectedDate
    });
    
    // Notify parent to show liquidity modal
    if (typeof onLiquidityAction === 'function') {
      onLiquidityAction({
        ...option,
        type: activeTab,
        expiry: selectedDate
      });
    }
  };

  const renderOption = (option) => {
    const isCall = activeTab === 'call';
    const profitChance = calculateProfitChance({ ...option, currentPrice: eventData.probability }, isCall);
    const colorClass = isCall ? 'text-[#24AE60]' : 'text-[#E64801]';
    
    const optionId = `${option.strike}-${option.type}-${selectedDate || 'default'}`;
    
    // Use the bid/ask prices directly from the option if available, otherwise fallback to calculated prices
    const bidPrice = option.bid || (option.price - 0.025);
    const askPrice = option.ask || (option.price + 0.025);
    
    // Display price based on active order type
    const displayPrice = activeOrderType === 'buy' ? askPrice : bidPrice;
    
    // Determine button color based on active tab
    const activeColor = activeTab === 'call' ? '#24AE60' : '#E64801';
    const buttonClasses = activeTab === 'call' 
      ? 'bg-transparent text-[#24AE60] border border-[#24AE60] hover:bg-[#24AE60]/50 hover:text-white'
      : 'bg-transparent text-[#E64801] border border-[#E64801] hover:bg-[#E64801]/50 hover:text-white';
    const priceColorClass = buttonClasses;
    
    return (
      <div key={option.strike} className="border-b border-white/25 py-2.5">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-base">{option.strike}% {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
            <div className={`text-xs ${colorClass}`}>
              {profitChance}% Today
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTrade({ 
                  ...option, 
                  type: activeTab, 
                  orderType: activeOrderType, 
                  expiry: selectedDate,
                  bidPrice,
                  askPrice
                })}
                className={`flex items-center rounded-xl px-6 py-2.5 ${priceColorClass} text-sm font-bold min-w-[96px] justify-center transition-colors duration-200`}
              >
                ${displayPrice.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Find the selected option for visualization
  const getSelectedOption = () => {
    if (!eventData?.options) return null;
    
    // Get the middle-strike option of the current type for visualization
    const optionsOfType = eventData.options
      .filter(opt => opt.type === activeTab)
      .sort((a, b) => a.strike - b.strike);
    
    if (optionsOfType.length === 0) return null;
    
    const middleIndex = Math.floor(optionsOfType.length / 2);
    const option = optionsOfType[middleIndex];
    
    return {
      marketId: eventData.title || 'default-market',
      currentPrice: eventData.probability / 100, // Convert to 0-1 scale
      strike: option.strike / 100, // Convert to 0-1 scale
      expiry: selectedDate,
      type: activeTab,
      volatility: 0.5, // Default volatility
      price: option.price
    };
  };
  
  const selectedOption = getSelectedOption();
  
  return (
    <div className="bg-transparent rounded-xl p-4 pt-2">
      <div className="flex mb-4 gap-4 flex-wrap justify-center items-center">
        <div className="flex gap-4 flex-wrap justify-center w-[481px]">
          <div className="flex bg-gray-800 rounded-xl p-1 w-[175px]">
            <button
              className={`px-5 py-2 rounded-xl w-1/2 ${
                activeTab === 'call' 
                  ? 'bg-[#24AE60]/20 text-[#24AE60] border border-[#24AE60]/30' 
                  : 'text-gray-300'
              }`}
              onClick={() => setActiveTab('call')}
            >
              Call
            </button>
            <button
              className={`px-5 py-2 rounded-xl w-1/2 ${
                activeTab === 'put' 
                  ? 'bg-[#E64801]/20 text-[#E64801] border border-[#E64801]/30' 
                  : 'text-gray-300'
              }`}
              onClick={() => setActiveTab('put')}
            >
              Put
            </button>
          </div>
          
          <div className="flex bg-gray-800 rounded-xl p-1 w-[175px]">
            <button
              className={`px-5 py-2 rounded-xl w-1/2 ${activeOrderType === 'buy' ? 'bg-gray-700' : ''}`}
              onClick={() => setActiveOrderType('buy')}
            >
              Buy
            </button>
            <button
              className={`px-5 py-2 rounded-xl w-1/2 ${activeOrderType === 'sell' ? 'bg-gray-700' : ''}`}
              onClick={() => setActiveOrderType('sell')}
            >
              Sell
            </button>
          </div>
        </div>
      </div>

      {/* Options analytics section hidden as requested */}

      {/* Removed duplicate Polymarket embed as requested */}

      <div className="mt-4 space-y-0">
        {eventData.options
          .filter(opt => opt.type === activeTab)
          .sort((a, b) => b.strike - a.strike)
          .map(renderOption)}
      </div>
    </div>
  );
}

export default OptionChain;