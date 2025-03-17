// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import OptionChain from './components/OptionChain';
import DateSelector from './components/DateSelector';
import TradeModal from './components/TradeModal';
import LiquidityModal from './components/LiquidityModal';
import LiquidityPool from './components/LiquidityPool';
import UrlInput from './components/UrlInput';
import PolymarketEmbed from './components/PolymarketEmbed';
import Auth from './components/Auth';
import polymarketUtils from './utils/polymarket';
import marketUpdater from './utils/marketUpdater';
import ammInstance from './utils/amm';
import { pooledLiquidityInstance } from './utils/pooledLiquidity';

function App() {
  const [currentEvent, setCurrentEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tradeDetails, setTradeDetails] = useState(null);
  const [liquidityDetails, setLiquidityDetails] = useState(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCentered, setIsCentered] = useState(true);
  const [activeOptionType, setActiveOptionType] = useState('call');

  const currentMarketUrl = useRef(null);

  // Handle market data updates
  const handleMarketUpdate = (updatedData) => {
    if (!updatedData) {
      console.warn('Received undefined data in market update handler');
      return;
    }
    
    setCurrentEvent(prevEvent => {
      if (!prevEvent) return updatedData;
      
      // Update only the probability while preserving other data
      return {
        ...prevEvent,
        currentPrice: updatedData.currentPrice || prevEvent.currentPrice,
        probability: updatedData.probability || prevEvent.probability
      };
    });
    
    console.log(`Market updated: Probability now ${updatedData.probability}%`);
  };
  
  // Clean up polling when component unmounts
  useEffect(() => {
    // Add listener for opening the unified liquidity pool modal
    const handleOpenLiquidityPool = () => {
      setIsPoolModalOpen(true);
    };
    
    window.addEventListener('openLiquidityPool', handleOpenLiquidityPool);
    
    return () => {
      if (currentMarketUrl.current) {
        marketUpdater.stopPolling(currentMarketUrl.current);
      }
      window.removeEventListener('openLiquidityPool', handleOpenLiquidityPool);
    };
  }, []);

  const handleUrlSubmit = async (url) => {
    setIsLoading(true);
    setError('');
    
    // Add a timeout to ensure we don't get stuck loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setError('Loading timeout - please try again or check your connection.');
        setIsLoading(false);
      }
    }, 15000); // 15 second timeout
    
    try {
      // Stop any existing polling
      if (currentMarketUrl.current) {
        marketUpdater.stopPolling(currentMarketUrl.current);
      }
      
      // Store the current URL
      currentMarketUrl.current = url;
      
      // Start polling for updates (every 15 seconds)
      const data = await marketUpdater.startPolling(url, 15000);
      
      // Register update listener
      marketUpdater.addListener(url, handleMarketUpdate);
      
      if (!data) {
        throw new Error('Failed to load market data');
      }
      
      // Check if there was a fetch error but we're using default data
      if (data._fetchError) {
        // Show a warning but continue with default data
        setError(`Note: Using simulated data. ${data._fetchError}`);
      } else {
        // Clear any existing errors
        setError('');
      }
      
      setCurrentEvent(data);
      
      // Make sure we have dates before selecting one
      if (data.dates && data.dates.length > 0) {
        setSelectedDate(data.dates[0]); // Select first available date
      } else {
        console.warn('No dates available in market data');
      }
      
      // Initialize AMM liquidity pools for all options
      if (data.options) {
        data.options.forEach(option => {
          data.dates.forEach(date => {
            const optionId = `${option.strike}-${option.type}-${date}`;
            ammInstance.initializeLiquidityPool(optionId, option.price);
          });
        });
        
        // Initialize the unified pooled liquidity system
        pooledLiquidityInstance.initialize().then(() => {
          console.log('Pooled liquidity system initialized');
        }).catch(err => {
          console.error('Failed to initialize pooled liquidity:', err);
        });
      }
      
      // Animate the section back to top
      setIsCentered(false);
      
    } catch (err) {
      console.error('Error loading market:', err);
      setError(`Failed to load market data: ${err.message}`);
      setCurrentEvent(null);
    } finally {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    }
  };

  const handleTrade = (optionDetails) => {
    setTradeDetails(optionDetails);
    setIsTradeModalOpen(true);
  };
  
  const handleLiquidityAction = (optionDetails) => {
    setLiquidityDetails(optionDetails);
    setIsLiquidityModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#191B1C] text-white p-4 flex flex-col">
      <div 
        className={`max-w-[500px] mx-auto transition-all duration-700 ease-in-out ${
          isCentered && !currentEvent ? 'flex flex-col justify-center min-h-screen' : ''
        }`}
        style={{ 
          width: '100%',
          transform: isCentered && !currentEvent ? 'translateY(0)' : 'translateY(0)',
        }}
      >
        <header className="relative flex items-center mb-4">
          <div className="absolute left-0">
            {/* Pool button moved to Auth dropdown */}
          </div>
          <div className="flex items-center justify-center w-full">
            <h1 className="text-2xl font-bold mr-2">PolyCzar</h1>
            <span className="text-xs bg-[#2C9CDB] text-white px-2 py-1 rounded-full">OPTIONS</span>
          </div>
          <div className="absolute right-0 flex items-center gap-4">
            <Auth onOpenPoolModal={() => setIsPoolModalOpen(true)} />
          </div>
        </header>

        <div className={`sticky top-0 z-10 py-2 bg-transparent backdrop-blur-md transition-all duration-700 ease-in-out ${
          isCentered && !currentEvent ? 'flex flex-col items-center justify-center' : ''
        }`}>
          <UrlInput onSubmit={handleUrlSubmit} isLoading={isLoading} />

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        {currentEvent && (
          <div className={`transition-opacity duration-500 ${isCentered ? 'opacity-0' : 'opacity-100'}`}>
            {/* Polymarket Embed Component */}
            <PolymarketEmbed 
              marketUrl={currentMarketUrl.current}
              showVolume={true}
              showChart={false}
              theme="dark"
            />
            
            {/* Date Selector */}
            {currentEvent.dates && currentEvent.dates.length > 0 && (
              <div className="sticky top-[52px] z-10 bg-transparent backdrop-blur-md py-2">
                <DateSelector 
                  availableDates={currentEvent.dates} 
                  selectedDate={selectedDate} 
                  onDateSelect={setSelectedDate}
                  optionType={activeOptionType}
                />
              </div>
            )}
            
            {/* Option Chain */}
            {currentEvent.options && (
              <OptionChain 
                eventData={{ ...currentEvent, marketUrl: currentMarketUrl.current }}
                selectedDate={selectedDate}
                onTrade={handleTrade}
                onLiquidityAction={handleLiquidityAction}
                onTabChange={setActiveOptionType}
              />
            )}
          </div>
        )}
        
        {/* Trade Modal */}
        <TradeModal 
          isOpen={isTradeModalOpen} 
          onClose={() => setIsTradeModalOpen(false)} 
          tradeDetails={tradeDetails}
        />
        
        {/* Liquidity Modal */}
        <LiquidityModal 
          isOpen={isLiquidityModalOpen} 
          onClose={() => setIsLiquidityModalOpen(false)} 
          liquidityDetails={liquidityDetails}
        />
        
        {/* Liquidity Pool Modal */}
        <LiquidityPool 
          isOpen={isPoolModalOpen} 
          onClose={() => setIsPoolModalOpen(false)} 
        />
        
        <div className="mt-6 text-center text-gray-600 text-xs">
        </div>
      </div>
    </div>
  );
}

export default App;