// OrderEntryScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import walletManager from '../utils/wallet';

function OrderEntryScreen({ isOpen, onClose, tradeDetails, onSubmitOrder }) {
  console.log("OrderEntryScreen rendered with isOpen:", isOpen);
  console.log("TradeDetails:", tradeDetails);
  
  const { user } = useUser();
  const [quantity, setQuantity] = useState(100);
  const [limitPrice, setLimitPrice] = useState(8.85);
  const [estimatedCost, setEstimatedCost] = useState(885.00);
  const [maxProfit, setMaxProfit] = useState(10615.00);
  const [breakeven, setBreakeven] = useState(106.15);
  const [maxLoss, setMaxLoss] = useState(885.00);
  const [keypadValue, setKeypadValue] = useState('');
  const [activeInput, setActiveInput] = useState(null);
  const [orderType, setOrderType] = useState('limit');
  const [bidPrice, setBidPrice] = useState(8.05);
  const [askPrice, setAskPrice] = useState(8.85);
  
  // Refs for input fields
  const limitPriceInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  
  useEffect(() => {
    console.log("OrderEntryScreen useEffect triggered with isOpen:", isOpen);
    if (isOpen && tradeDetails) {
      // Initialize with trade details
      setLimitPrice(tradeDetails.askPrice || 8.85);
      setBidPrice(tradeDetails.bidPrice || 8.05);
      setAskPrice(tradeDetails.askPrice || 8.85);
      calculateEstimatedCost();
    }
  }, [isOpen, tradeDetails]);
  
  useEffect(() => {
    calculateEstimatedCost();
  }, [quantity, limitPrice]);
  
  const calculateEstimatedCost = () => {
    const cost = quantity * limitPrice;
    setEstimatedCost(cost);
    
    // Calculate max profit, breakeven, and max loss
    if (tradeDetails) {
      const strikeValue = tradeDetails.strike || 115;
      
      if (tradeDetails.type === 'put') {
        // For puts: max profit = strike price * 100 - premium paid
        setMaxProfit((strikeValue - limitPrice) * quantity);
        
        // Breakeven = strike - premium
        setBreakeven(strikeValue - limitPrice);
        
        // Max loss = premium paid
        setMaxLoss(cost);
      } else {
        // For calls: max profit is theoretically unlimited, use a placeholder
        setMaxProfit((strikeValue + limitPrice) * quantity);
        
        // Breakeven = strike + premium
        setBreakeven(strikeValue + limitPrice);
        
        // Max loss = premium paid
        setMaxLoss(cost);
      }
    }
  };
  
  const activateInput = (inputType, currentValue) => {
    setActiveInput(inputType);
    setKeypadValue(currentValue.toString());
    
    // Focus the appropriate input field
    if (inputType === 'limitPrice' && limitPriceInputRef.current) {
      limitPriceInputRef.current.focus();
    } else if (inputType === 'quantity' && quantityInputRef.current) {
      quantityInputRef.current.focus();
    }
  };
  
  const handleKeypadPress = (key) => {
    if (!activeInput) return;
    
    if (key === '←') {
      // Handle backspace
      setKeypadValue(prev => {
        if (!prev || prev.length <= 1) return '0';
        const newValue = prev.slice(0, -1);
        
        if (activeInput === 'limitPrice') {
          // For limit price, ensure we maintain 2 decimal places
          const numValue = parseFloat(newValue) || 0;
          setLimitPrice(numValue);
          return numValue.toFixed(2);
        } else {
          setQuantity(Math.floor(parseFloat(newValue)) || 0);
          return newValue;
        }
      });
    } else {
      // Handle number or decimal input
      setKeypadValue(prev => {
        let newValue;
        
        // If current value is just '0', replace it unless adding decimal
        if (prev === '0' && key !== '.') {
          newValue = key;
        } else if (prev === '0' && key === '.') {
          newValue = '0.';
        } else {
          // For limit price, check if we already have 2 decimal places
          if (activeInput === 'limitPrice' && prev.includes('.')) {
            const parts = prev.split('.');
            if (parts[1] && parts[1].length >= 2 && key !== '←') {
              return prev; // Already have 2 decimal places, don't add more
            }
          }
          
          newValue = prev + key;
        }
        
        if (activeInput === 'limitPrice') {
          // For limit price, ensure we format to 2 decimal places when appropriate
          const numValue = parseFloat(newValue) || 0;
          if (key !== '.' && !newValue.endsWith('.') && !newValue.endsWith('.0') && !newValue.endsWith('.00')) {
            setLimitPrice(numValue);
            return numValue.toFixed(2);
          }
        } else {
          setQuantity(Math.floor(parseFloat(newValue)) || 0);
        }
        
        return newValue;
      });
    }
  };
  
  const updateActiveInputValue = (value) => {
    const numValue = parseFloat(value) || 0;
    
    if (activeInput === 'limitPrice') {
      setLimitPrice(numValue);
    } else if (activeInput === 'quantity') {
      setQuantity(Math.floor(numValue)); // Ensure quantity is an integer
    }
  };
  
  const handleInputChange = (e, inputType) => {
    const value = e.target.value;
    
    // Only allow numbers and decimal point
    if (!/^[0-9]*\.?[0-9]*$/.test(value) && value !== '') {
      return;
    }
    
    if (inputType === 'limitPrice') {
      // Validate and format for limit price
      setKeypadValue(value);
      if (value === '' || value === '.') {
        setLimitPrice(0);
      } else {
        setLimitPrice(parseFloat(value) || 0);
      }
    } else if (inputType === 'quantity') {
      // Validate and format for quantity (integers only)
      if (value.includes('.')) {
        return;
      }
      setKeypadValue(value);
      if (value === '') {
        setQuantity(0);
      } else {
        setQuantity(parseInt(value, 10) || 0);
      }
    }
  };
  
  const handleSubmitOrder = () => {
    if (onSubmitOrder) {
      onSubmitOrder({
        quantity,
        limitPrice,
        orderType,
        estimatedCost,
        ...tradeDetails
      });
    }
  };
  
  const formatTitle = () => {
    const strikePrice = tradeDetails?.strike || 115;
    const optionType = tradeDetails?.type === 'put' ? 'Put' : 'Call';
    let expiryFormatted = '';
    
    if (tradeDetails?.expiry) {
      const expiryDate = new Date(tradeDetails.expiry);
      expiryFormatted = `${expiryDate.getMonth() + 1}/${expiryDate.getDate()}`;
    }
    
    return `Buy $${strikePrice} ${optionType} ${expiryFormatted}`;
  };
  
  if (!isOpen) return null;
  
  // Format currency values with exactly 2 decimal places
  const formatCurrency = (value) => {
    return `$${parseFloat(value).toFixed(2)}`;
  };
  
  // Get available balance
  const availableBalance = tradeDetails?.availableBalance || 0.61;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="w-full max-w-md p-4 bg-gray-900 rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <button onClick={onClose} className="text-green-500 text-xl">
            ✕
          </button>
          <div className="flex items-center">
            <span className="text-white mr-2">Limit order</span>
          </div>
        </div>
        
        {/* Order Details */}
        <div className="mb-2">
          <h2 className="text-white text-xl font-bold mb-1">{formatTitle()}</h2>
        </div>
        
        <div className="border-t border-gray-800 my-2"></div>
        
        {/* Quantity Input */}
        <div className="py-3 flex justify-between items-center">
          <div>
            <p className="text-white">Quantity</p>
          </div>
          <div 
            className={`text-right text-white text-xl ${activeInput === 'quantity' ? 'text-green-500' : ''}`}
            onClick={() => activateInput('quantity', quantity)}
          >
            <input
              ref={quantityInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={activeInput === 'quantity' ? keypadValue : quantity}
              onChange={(e) => handleInputChange(e, 'quantity')}
              className={`bg-transparent text-right outline-none w-24 ${activeInput === 'quantity' ? 'text-green-500' : 'text-white'} rounded-md`}
              onFocus={() => activateInput('quantity', quantity.toString())}
            />
          </div>
        </div>
        
        <div className="border-t border-gray-800 my-2"></div>
        
        {/* Limit Price */}
        <div className="py-3 flex justify-between items-center">
          <div>
            <p className="text-white">Limit price</p>
            <div 
              className="text-green-500 flex items-center"
            >
              Bid {formatCurrency(bidPrice)} · Ask {formatCurrency(askPrice)}
            </div>
          </div>
          <div 
            className={`text-right text-white text-xl ${activeInput === 'limitPrice' ? 'text-green-500' : ''}`}
            onClick={() => activateInput('limitPrice', limitPrice.toFixed(2))}
          >
            <input
              ref={limitPriceInputRef}
              type="text"
              inputMode="decimal"
              value={activeInput === 'limitPrice' ? keypadValue : limitPrice.toFixed(2)}
              onChange={(e) => handleInputChange(e, 'limitPrice')}
              className={`bg-transparent text-right outline-none w-24 ${activeInput === 'limitPrice' ? 'text-green-500' : 'text-white'} rounded-md`}
              onFocus={() => activateInput('limitPrice', limitPrice.toFixed(2))}
            />
          </div>
        </div>
        
        <div className="border-t border-gray-800 my-2"></div>
        
        {/* Estimated Cost */}
        <div className="py-3 flex justify-between items-center">
          <div className="flex items-center">
            <p className="text-white">Estimated cost</p>
          </div>
          <div className="text-right text-white text-xl">
            {formatCurrency(estimatedCost)}
          </div>
        </div>
        
        {/* Profit/Loss Metrics */}
        <div className="my-4">
          <div className="border-t border-gray-800 mb-4"></div>
          
          <div className="text-center mb-4">
          </div>
          
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-gray-400 text-sm">Max profit</p>
              <p className="text-white">{formatCurrency(maxProfit)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Breakeven</p>
              <p className="text-white">{formatCurrency(breakeven)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Max loss</p>
              <p className="text-white">-{formatCurrency(maxLoss)}</p>
            </div>
          </div>
        </div>
        
        {/* Review Button */}
        <button 
          onClick={handleSubmitOrder}
          className="w-full py-3 bg-green-500 text-black rounded-md font-bold mb-2"
        >
          Review
        </button>
        
        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 text-center text-green-500 text-2xl font-bold">
          <button onClick={() => handleKeypadPress('1')} className="py-2 rounded-md">1</button>
          <button onClick={() => handleKeypadPress('2')} className="py-2 rounded-md">2</button>
          <button onClick={() => handleKeypadPress('3')} className="py-2 rounded-md">3</button>
          <button onClick={() => handleKeypadPress('4')} className="py-2 rounded-md">4</button>
          <button onClick={() => handleKeypadPress('5')} className="py-2 rounded-md">5</button>
          <button onClick={() => handleKeypadPress('6')} className="py-2 rounded-md">6</button>
          <button onClick={() => handleKeypadPress('7')} className="py-2 rounded-md">7</button>
          <button onClick={() => handleKeypadPress('8')} className="py-2 rounded-md">8</button>
          <button onClick={() => handleKeypadPress('9')} className="py-2 rounded-md">9</button>
          <button onClick={() => handleKeypadPress('0')} className="py-2 col-span-1 rounded-md">0</button>
          <button onClick={() => handleKeypadPress('.')} className="py-2 col-span-1 rounded-md">.</button>
          <button onClick={() => handleKeypadPress('←')} className="py-2 col-span-1 rounded-md">
            ←
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderEntryScreen;
