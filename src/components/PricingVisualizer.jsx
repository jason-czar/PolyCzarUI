// PricingVisualizer.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import optionsPricingEngine from '../utils/optionsPricing';
import { optimizeModelParameters } from '../utils/pricingOptimization';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function PricingVisualizer({ optionDetails, height = 300 }) {
  const [priceHistory, setPriceHistory] = useState([]);
  const [volatilityEffect, setVolatilityEffect] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const chartRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Initialize price history for this option
    const initializeChart = async () => {
      if (!optionDetails) return;
      setIsLoading(true);
      
      try {
        const optimizedParams = await optimizeModelParameters(optionDetails);
        
        // Generate price history data (7 days back)
        const history = [];
        const volatilityData = [];
        const now = new Date();
        const dates = [];
        
        for (let i = 7; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          dates.push(dateStr);
          
          // Calculate historical prices with slightly varying inputs
          const baseMidPrice = await getPriceForDate(date, optionDetails, optimizedParams);
          history.push(baseMidPrice);
          
          // Calculate prices with higher volatility for comparison
          const highVolParams = { ...optimizedParams, volatility: optimizedParams.volatility * 1.5 };
          const highVolPrice = await getPriceForDate(date, optionDetails, highVolParams);
          volatilityData.push(highVolPrice);
        }
        
        setPriceHistory({
          labels: dates,
          datasets: [
            {
              label: 'Option Price',
              data: history,
              borderColor: 'rgba(54, 162, 235, 1)',
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              tension: 0.4,
            },
            {
              label: 'With 1.5x Volatility',
              data: volatilityData,
              borderColor: 'rgba(255, 99, 132, 1)',
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderDash: [5, 5],
              tension: 0.4,
            }
          ]
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing price chart:', error);
        setIsLoading(false);
      }
    };
    
    initializeChart();
    
    // Update chart every 5 minutes
    intervalRef.current = setInterval(initializeChart, 5 * 60 * 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [optionDetails]);
  
  // Helper function to calculate historical prices
  const getPriceForDate = async (date, optionDetails, modelParams) => {
    try {
      // Adjust expiry date perception based on the historical date
      const historicalDetails = { 
        ...optionDetails,
        currentDate: date.toISOString().split('T')[0],
        ...modelParams
      };
      
      const price = await optionsPricingEngine.getPriceForOption(historicalDetails);
      return price.midPrice;
    } catch (error) {
      console.error('Error calculating historical price:', error);
      return null;
    }
  };
  
  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Price: $${context.raw.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(200, 200, 200, 0.1)',
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(2);
          }
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  return (
    <div className="bg-black bg-opacity-60 p-4 rounded-lg">
      <h3 className="text-lg text-green-500 mb-2">Price Visualization</h3>
      <div className="text-xs text-gray-400 mb-2">
        Compare price with different volatility levels
      </div>
      
      {isLoading ? (
        <div style={{ height }} className="flex items-center justify-center">
          <div className="animate-pulse text-green-500">
            <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      ) : priceHistory && priceHistory.datasets ? (
        <div style={{ height }}>
          <Line ref={chartRef} data={priceHistory} options={options} />
        </div>
      ) : (
        <div style={{ height }} className="flex items-center justify-center text-gray-500 text-sm">
          No pricing data available
        </div>
      )}
      
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Implied Volatility</div>
          <div className="text-white">{optionDetails?.volatility ? `${(optionDetails.volatility * 100).toFixed(1)}%` : 'N/A'}</div>
        </div>
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-gray-400">Model</div>
          <div className="text-white">Modified Black-Scholes</div>
        </div>
      </div>
    </div>
  );
}

export default PricingVisualizer;