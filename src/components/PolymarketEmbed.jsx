import React, { useEffect, useRef } from 'react';
import polymarketUtils from '../utils/polymarket';

/**
 * PolymarketEmbed component that integrates the official Polymarket embed widget
 * 
 * @param {Object} props Component props
 * @param {string} props.marketUrl The full Polymarket event URL
 * @param {boolean} props.showVolume Whether to show trading volume (default: true)
 * @param {boolean} props.showChart Whether to show the chart (default: false)
 * @param {string} props.theme Widget theme: 'light' or 'dark' (default: 'dark')
 * @returns {JSX.Element} The Polymarket embed component
 */
function PolymarketEmbed({ marketUrl, showVolume = true, showChart = false, theme = 'dark' }) {
  const scriptRef = useRef(null);
  const containerRef = useRef(null);
  
  // Extract the market slug from the Polymarket URL
  const marketSlug = polymarketUtils.extractEventIdFromUrl(marketUrl);
  
  useEffect(() => {
    // Don't proceed if we don't have a valid market slug
    if (!marketSlug) {
      console.error('Invalid market URL or could not extract market slug:', marketUrl);
      return;
    }

    // Only load the script once
    if (!document.querySelector('script[src="https://unpkg.com/@polymarket/embeds@latest/dist/index.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@polymarket/embeds@latest/dist/index.js';
      script.type = 'module';
      script.async = true;
      
      script.onload = () => {
        console.log('Polymarket embed script loaded successfully');
      };
      
      script.onerror = (error) => {
        console.error('Error loading Polymarket embed script:', error);
      };
      
      document.head.appendChild(script);
      scriptRef.current = script;
    }

    // Clean up on unmount
    return () => {
      // We don't remove the script as it might be used by other instances
    };
  }, [marketSlug]);

  // If no market slug is available, show a placeholder
  if (!marketSlug) {
    return (
      <div className="text-center text-gray-500 py-2">
        Invalid market URL or could not extract market slug
      </div>
    );
  }

  return (
    <div 
      id="polymarket-market-embed" 
      ref={containerRef}
      className="polymarket-embed py-2"
      style={{ height: 'auto', minHeight: '200px' }}
    >
      <polymarket-market-embed
        market={marketSlug}
        volume={showVolume.toString()}
        chart={showChart.toString()}
        theme={theme}
      />
    </div>
  );
}

export default PolymarketEmbed;