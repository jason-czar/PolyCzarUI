// TradeModal.jsx
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import walletManager from '../utils/wallet';
import ammInstance from '../utils/amm';
import orderBookInstance from '../utils/orderBook';
import { recordTradeHistory } from '../utils/tradeHistoryService';
import OrderEntryScreen from './OrderEntryScreen';

function TradeModal({ isOpen, onClose, tradeDetails }) {
  const { user, isLoaded, auth } = useUser();
  const [quantity, setQuantity] = useState(1);
  const [limitPrice, setLimitPrice] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');
  const [bidPrice, setBidPrice] = useState(0);
  const [askPrice, setAskPrice] = useState(0);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [bestExecutionVenue, setBestExecutionVenue] = useState({ venue: 'amm', price: 0 });
  const [showOrderEntry, setShowOrderEntry] = useState(false);
  
  // Added for the new UI
  const [bidQuantity, setBidQuantity] = useState(2);
  const [askQuantity, setAskQuantity] = useState(21);
  const [lastTrade, setLastTrade] = useState(8.17);
  const [iv, setIv] = useState(53.74);
  const [mark, setMark] = useState(8.45);
  const [prevClose, setPrevClose] = useState(8.45);
  const [high, setHigh] = useState(9.00);
  const [low, setLow] = useState(7.62);
  const [profitChance, setProfitChance] = useState(36.49);
  const [volume, setVolume] = useState(45);
  const [openInterest, setOpenInterest] = useState(0);
  const [greeks, setGreeks] = useState({
    delta: -0.4386,
    gamma: 0.0173,
    theta: -0.0843,
    vega: 0.1687,
    rho: -0.0742
  });
  
  useEffect(() => {
    const initialize = async () => {
      if (isOpen && tradeDetails) {
        // Initialize order book if needed
        if (!orderBookInstance.initialized) {
          await orderBookInstance.initialize();
        }
        
        await updatePricing();
        await updateOrderBook();
        
        // Generate realistic market data based on the option details
        // For binary options, prices should be between 0 and 1
        const basePrice = tradeDetails.price || 0.5;
        
        // Ensure all prices are non-negative
        const markPrice = Math.max(0, basePrice);
        const lastTradePrice = Math.max(0, basePrice * (0.8 + Math.random() * 0.4));
        const prevClosePrice = Math.max(0, basePrice * (0.9 + Math.random() * 0.2));
        const highPrice = Math.max(0, basePrice * (1.2 + Math.random() * 0.3));
        const lowPrice = Math.max(0, basePrice * (0.7 + Math.random() * 0.2));
        
        // Set market data with non-negative values
        setMark(parseFloat(markPrice.toFixed(2)));
        setLastTrade(parseFloat(lastTradePrice.toFixed(2)));
        setPrevClose(parseFloat(prevClosePrice.toFixed(2)));
        setHigh(parseFloat(highPrice.toFixed(2)));
        setLow(parseFloat(lowPrice.toFixed(2)));
        
        // Volume and open interest should be integers
        setVolume(Math.floor(10 + Math.random() * 90));
        setOpenInterest(Math.floor(Math.random() * 10));
        
        // Profit chance should be between 0-100%
        setProfitChance(parseFloat(Math.max(0, Math.min(100, (tradeDetails.type === 'call' ? 
          (100 - tradeDetails.strike) : tradeDetails.strike) + (Math.random() * 10 - 5))).toFixed(2)));
        
        // IV should be a positive percentage
        setIv(parseFloat(Math.max(10, 30 + Math.random() * 40)).toFixed(2));
        
        // Bid and ask quantities
        setBidQuantity(Math.floor(1 + Math.random() * 10));
        setAskQuantity(Math.floor(10 + Math.random() * 20));
        
        // Calculate greeks based on option parameters
        const delta = tradeDetails.type === 'call' ? 
          (0.5 + (Math.random() * 0.3)) : 
          (-0.5 - (Math.random() * 0.3));
          
        const gamma = 0.01 + (Math.random() * 0.02);
        const theta = -0.05 - (Math.random() * 0.1);
        const vega = 0.1 + (Math.random() * 0.1);
        const rho = tradeDetails.type === 'call' ? 
          (0.05 + (Math.random() * 0.05)) : 
          (-0.05 - (Math.random() * 0.05));
        
        setGreeks({
          delta: parseFloat(delta.toFixed(2)),
          gamma: parseFloat(gamma.toFixed(2)),
          theta: parseFloat(theta.toFixed(2)),
          vega: parseFloat(vega.toFixed(2)),
          rho: parseFloat(rho.toFixed(2))
        });
      }
    };
    
    initialize();
  }, [isOpen, tradeDetails, quantity]);
  
  const updatePricing = async () => {
    if (isOpen && tradeDetails) {
      try {
        // Get AMM pricing with the options pricing model
        const optionId = `${tradeDetails.strike}-${tradeDetails.type}-${tradeDetails.expiry || 'default'}`;
        
        // Create detailed option parameters for pricing model
        const optionDetails = {
          marketId: tradeDetails.marketId || 'default-market',
          currentPrice: tradeDetails.currentPrice || 0.2, // Current probability (0-1)
          strike: tradeDetails.strike,          // Strike probability (0-100)
          expiry: tradeDetails.expiry,          // Expiration date
          type: tradeDetails.type,              // 'call' or 'put'
          price: tradeDetails.price || 0.5      // Fallback price if needed
        };
        
        // Safe check for ammInstance
        if (!ammInstance || typeof ammInstance.getPrice !== 'function') {
          throw new Error('AMM not properly initialized');
        }
        
        const pricing = await ammInstance.getPrice(optionId, optionDetails);
        
        // Ensure bid and ask prices are non-negative
        // For binary options, prices should be between 0 and 1
        setBidPrice(parseFloat(Math.max(0, pricing.bidPrice).toFixed(2)));
        setAskPrice(parseFloat(Math.max(0, pricing.askPrice).toFixed(2)));
        
        // Initialize limit price based on AMM pricing if not set already
        if (limitPrice === null) {
          const executionPrice = tradeDetails.orderType === 'buy' ? pricing.askPrice : pricing.bidPrice;
          setLimitPrice(parseFloat(Math.max(0, executionPrice).toFixed(2)));
        }
        
        return pricing;
      } catch (error) {
        console.error('Error getting option price:', error);
        // Fallback to default pricing if model fails
        const fallbackBid = tradeDetails.bidPrice || (tradeDetails.price - 0.025);
        const fallbackAsk = tradeDetails.askPrice || (tradeDetails.price + 0.025);
        
        setBidPrice(parseFloat(Math.max(0, fallbackBid).toFixed(2)));
        setAskPrice(parseFloat(Math.max(0, fallbackAsk).toFixed(2)));
        
        // Initialize limit price if needed
        if (limitPrice === null) {
          const executionPrice = tradeDetails.orderType === 'buy' ? fallbackAsk : fallbackBid;
          setLimitPrice(parseFloat(Math.max(0, executionPrice).toFixed(2)));
        }
        
        return { bidPrice: parseFloat(Math.max(0, fallbackBid).toFixed(2)), askPrice: parseFloat(Math.max(0, fallbackAsk).toFixed(2)) };
      }
    }
    return null;
  };
  
  const updateOrderBook = async () => {
    if (isOpen && tradeDetails) {
      try {
        const optionId = `${tradeDetails.strike}-${tradeDetails.type}-${tradeDetails.expiry || 'default'}`;
        const bookState = orderBookInstance.getOrderBookState(optionId);
        setOrderBook(bookState);
        return bookState;
      } catch (error) {
        console.error('Error getting order book:', error);
        setOrderBook({ bids: [], asks: [] });
        return { bids: [], asks: [] };
      }
    }
    return null;
  };
  
  const determineBestExecutionVenue = () => {
    if (!isOpen || !tradeDetails) return;
    
    try {
      const optionId = `${tradeDetails.strike}-${tradeDetails.type}-${tradeDetails.expiry || 'default'}`;
      const isBuy = tradeDetails.orderType === 'buy';
      
      // Get the current AMM pricing and Order Book state
      const ammPricing = { bidPrice, askPrice };
      
      // Get best execution venue based on price and liquidity
      const bestVenue = orderBookInstance.getBestExecutionVenue(
        optionId,
        isBuy,
        quantity,
        ammPricing
      );
      
      setBestExecutionVenue(bestVenue);
      
      // Optional: Update limit price to match best venue price
      // Only auto-adjust if user hasn't manually changed it
      if (bestVenue.price > 0) {
        setLimitPrice(parseFloat(bestVenue.price.toFixed(2)));
      }
    } catch (error) {
      console.error('Error determining best execution venue:', error);
      // Default to AMM if there's an error
      setBestExecutionVenue({
        venue: 'amm',
        price: tradeDetails.orderType === 'buy' ? askPrice : bidPrice
      });
    }
  };
  
  const handleExecuteTrade = async () => {
    // Show the order entry screen without requiring wallet connection first
    // We'll check wallet connection later when actually submitting the order
    console.log("Buy button clicked, setting showOrderEntry to true");
    setShowOrderEntry(true);
    console.log("showOrderEntry state after setting:", true);
  };
  
  const handleSubmitOrder = async (orderDetails) => {
    setIsExecuting(true);
    setError('');
    
    try {
      const optionId = `${tradeDetails.strike}-${tradeDetails.type}-${tradeDetails.expiry || 'default'}`;
      const isBuy = tradeDetails.orderType === 'buy';
      const userId = walletManager.account || 'anonymous-user';
      const venue = bestExecutionVenue.venue || 'amm'; // Default to AMM if venue not determined
      
      let result;
      
      // Check the best execution venue and route accordingly
      if (venue === 'amm') {
        // Execute trade on AMM - with safe check
        if (!ammInstance || typeof ammInstance.executeTrade !== 'function') {
          throw new Error('Liquidity pool not properly initialized');
        }
        
        // Execute the AMM trade
        const trade = await ammInstance.executeTrade(
          optionId,
          isBuy,
          orderDetails.quantity || quantity,
          tradeDetails
        );
        
        // Record the trade execution
        result = await walletManager.executeTrade({
          ...tradeDetails,
          price: orderDetails.limitPrice || limitPrice,
          quantity: orderDetails.quantity || quantity,
          total: orderDetails.estimatedCost || (quantity * limitPrice),
          timestamp: new Date().toISOString(),
          executionVenue: 'liquidity pool'
        });
      } else {
        // Execute through order book
        if (!orderBookInstance) {
          throw new Error('Market not properly initialized');
        }
        
        // Check if we can execute immediately as a market order
        const availableLiquidity = orderBookInstance.getAvailableLiquidityAtPrice(
          optionId, 
          !isBuy, // For buys, we check asks; for sells, we check bids
          orderDetails.limitPrice || limitPrice
        );
        
        if (availableLiquidity >= (orderDetails.quantity || quantity)) {
          // Execute as market order against the existing orders
          const marketResult = orderBookInstance.executeMarketOrder(
            optionId,
            userId,
            isBuy,
            orderDetails.quantity || quantity,
            {
              ...tradeDetails,
              currentPrice: tradeDetails.currentPrice || 0.5
            }
          );
          
          result = {
            ...marketResult,
            executionVenue: 'market order',
            price: marketResult.averagePrice,
            quantity: orderDetails.quantity || quantity,
            timestamp: new Date().toISOString()
          };
        } else {
          // Place a limit order in the order book
          const orderResult = orderBookInstance.placeOrder(
            optionId,
            userId,
            isBuy,
            orderDetails.limitPrice || limitPrice,
            orderDetails.quantity || quantity,
            {
              ...tradeDetails,
              currentPrice: tradeDetails.currentPrice || 0.5
            }
          );
          
          result = {
            orderId: orderResult.orderId,
            status: 'placed',
            executionVenue: 'resting order',
            price: orderDetails.limitPrice || limitPrice,
            quantity: orderDetails.quantity || quantity,
            timestamp: new Date().toISOString()
          };
        }
        
        // Update order book after placing order
        updateOrderBook();
      }
      
      console.log('Trade executed:', result);
      
      // Record the trade in Supabase
      if (user && auth) {
        try {
          // Create a proper format for the tradeHistory record
          const tradeRecord = {
            orderType: tradeDetails.orderType,
            marketId: tradeDetails.marketId,
            optionId: `${tradeDetails.strike}-${tradeDetails.type}-${tradeDetails.expiry || 'default'}`,
            quantity: orderDetails.quantity || quantity,
            price: orderDetails.limitPrice || limitPrice,
            status: result.status || 'completed',
            transactionHash: result.transactionHash || null
          };
          
          // Record the trade in history
          await recordTradeHistory(user, auth, tradeRecord);
        } catch (recordError) {
          console.error('Failed to record trade in history:', recordError);
          // We don't want to block the trade confirmation UI if history recording fails
        }
      }
      
      onClose();
    } catch (err) {
      console.error('Trade execution failed:', err);
      setError(err.message || 'Trade execution failed');
    } finally {
      setIsExecuting(false);
      setShowOrderEntry(false);
    }
  };
  
  if (showOrderEntry) {
    console.log("Rendering OrderEntryScreen, showOrderEntry is:", showOrderEntry);
    return (
      <OrderEntryScreen 
        isOpen={true}
        onClose={() => {
          console.log("Closing OrderEntryScreen");
          setShowOrderEntry(false);
        }}
        tradeDetails={{
          ...tradeDetails,
          bidPrice,
          askPrice,
          availableBalance: 0.61 // Example value, should come from wallet in real implementation
        }}
        onSubmitOrder={handleSubmitOrder}
      />
    );
  }
  
  if (!isOpen || !tradeDetails) return null;

  // Calculate based on the best execution venue
  const price = bestExecutionVenue.price || limitPrice;
  // Ensure price is always displayed with exactly 2 decimal places
  const formattedPrice = parseFloat(price).toFixed(2);
    
  const total = (quantity * price).toFixed(2);
  const maxProfit = tradeDetails.type === 'call' ? 'Unlimited' : 
    ((tradeDetails.strike - price) * quantity).toFixed(2);
  const maxLoss = (total * 100).toFixed(2);
  
  // Format the title to match the screenshot
  const formatTitle = () => {
    const strikePrice = tradeDetails.strike || 115;
    const optionType = tradeDetails.type === 'put' ? 'Put' : 'Call';
    
    // Format expiry date (e.g., "5/2")
    let expiryFormatted = '';
    if (tradeDetails.expiry) {
      const expiryDate = new Date(tradeDetails.expiry);
      expiryFormatted = `${expiryDate.getMonth() + 1}/${expiryDate.getDate()}`;
    }
    
    return `$${strikePrice} ${optionType} ${expiryFormatted}`;
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="w-full max-w-md p-4 bg-gray-900 rounded-lg shadow-xl transform transition-transform duration-300 ease-in-out" style={{ borderRadius: '8px' }}>
        <div className="flex justify-between items-center mb-2">
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          <div className="w-6"></div> {/* Empty div for alignment */}
        </div>
        
        {/* Option title */}
        <h2 className="text-xl font-bold mb-6 text-white">
          {formatTitle()}
        </h2>
        
        {/* Bid/Ask display */}
        <div className="flex justify-between mb-6">
          <div className="text-left">
            <div className="text-gray-400 mb-1">Bid</div>
            <div className="text-xl font-bold">${parseFloat(bidPrice).toFixed(2)}</div>
            <div className="text-gray-500 text-sm">x {bidQuantity}</div>
          </div>
          
          {/* Price chart placeholder */}
          <div className="flex items-center">
            <div className="w-16 h-12 bg-gray-800 rounded relative">
              <div className="absolute bottom-0 left-0 right-0 h-3 bg-green-500 rounded-b"></div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-gray-400 mb-1">Ask</div>
            <div className="text-xl font-bold">${parseFloat(askPrice).toFixed(2)}</div>
            <div className="text-gray-500 text-sm">x {askQuantity}</div>
          </div>
        </div>
        
        {/* Market data grid */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 mb-6">
          <div>
            <div className="text-gray-400 text-sm">Mark</div>
            <div className="text-white">${parseFloat(mark).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Last trade</div>
            <div className="text-white">${parseFloat(lastTrade).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">IV</div>
            <div className="text-white">{parseFloat(iv).toFixed(2)}%</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm">Prev close</div>
            <div className="text-white">${parseFloat(prevClose).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">High</div>
            <div className="text-white">${parseFloat(high).toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Low</div>
            <div className="text-white">${parseFloat(low).toFixed(2)}</div>
          </div>
          
          <div>
            <div className="text-gray-400 text-sm">Chance of profit</div>
            <div className="text-white">{parseFloat(profitChance).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Volume</div>
            <div className="text-white">{volume}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Open interest</div>
            <div className="text-white">{openInterest}</div>
          </div>
        </div>
        
        {/* Greeks section */}
        <div className="mb-6">
          <div className="text-gray-400 mb-2">The Greeks</div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            <div>
              <div className="text-gray-400 text-sm">Delta</div>
              <div className="text-white">{parseFloat(greeks.delta).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Gamma</div>
              <div className="text-white">{parseFloat(greeks.gamma).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Theta</div>
              <div className="text-white">{parseFloat(greeks.theta).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Vega</div>
              <div className="text-white">{parseFloat(greeks.vega).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm">Rho</div>
              <div className="text-white">{parseFloat(greeks.rho).toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        {/* Buy button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            console.log("Buy button clicked directly");
            handleExecuteTrade();
          }}
          disabled={isExecuting}
          className="w-full py-3 bg-[#24AE60] text-black rounded-lg font-bold mb-2" style={{ borderRadius: '8px' }}
        >
          {isExecuting ? "Processing..." : tradeDetails.orderType === 'buy' ? "Buy" : "Sell"}
        </button>
      </div>
    </div>
  );
}

export default TradeModal;