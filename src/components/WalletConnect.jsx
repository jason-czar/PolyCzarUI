// WalletConnect.jsx
import React, { useState, useEffect } from 'react';
import walletManager, { WALLET_TYPES } from '../utils/wallet';

// Wallet icons
const walletIcons = {
  [WALLET_TYPES.METAMASK]: '/assets/wallets/metamask.svg',
  [WALLET_TYPES.COINBASE]: '/assets/wallets/coinbase.svg',
  [WALLET_TYPES.PHANTOM]: '/assets/wallets/phantom.svg',
  [WALLET_TYPES.WALLET_CONNECT]: '/assets/wallets/walletconnect.svg'
};

// Wallet display names
const walletNames = {
  [WALLET_TYPES.METAMASK]: 'MetaMask',
  [WALLET_TYPES.COINBASE]: 'Coinbase Wallet',
  [WALLET_TYPES.PHANTOM]: 'Phantom',
  [WALLET_TYPES.WALLET_CONNECT]: 'WalletConnect'
};

function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [selectedWalletType, setSelectedWalletType] = useState(null);
  const [attemptedAutoConnect, setAttemptedAutoConnect] = useState(false);

  useEffect(() => {
    // Add listener for wallet account changes
    window.addEventListener('walletAccountChanged', handleWalletChange);
    
    // Close wallet selector if clicked outside
    const handleClickOutside = (event) => {
      if (showWalletOptions && !event.target.closest('.wallet-selector') && 
          !event.target.closest('.connect-wallet-btn')) {
        setShowWalletOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('walletAccountChanged', handleWalletChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletOptions]);

  const handleWalletChange = (event) => {
    const { address, isConnected } = event.detail;
    setIsConnected(isConnected);
    setWalletAddress(address || '');
    
    if (isConnected && address) {
      fetchBalance(address);
    } else {
      setBalance('0');
    }
  };

  const fetchBalance = async (address) => {
    try {
      const ethBalance = await walletManager.getEthBalance();
      setBalance(parseFloat(ethBalance).toFixed(4));
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const connectWallet = async (walletType) => {
    setIsConnecting(true);
    setError('');
    setSelectedWalletType(walletType);
    setShowWalletOptions(false);
    
    try {
      const { address } = await walletManager.connect(walletType);
      setIsConnected(true);
      setWalletAddress(address);
      await fetchBalance(address);
    } catch (err) {
      console.error(`Failed to connect ${walletNames[walletType]} wallet:`, err);
      setError(err.message || `Failed to connect ${walletNames[walletType]} wallet`);
      // If connection fails, show wallet options again
      setShowWalletOptions(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      await walletManager.disconnect();
      setIsConnected(false);
      setWalletAddress('');
      setBalance('0');
      setSelectedWalletType(null);
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setError(err.message || 'Failed to disconnect wallet');
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Wallet selector component
  const WalletSelector = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="relative bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-700 wallet-selector">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
          <h3 className="text-lg font-medium text-white">Connect Wallet</h3>
          <button 
            onClick={() => setShowWalletOptions(false)}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Object.values(WALLET_TYPES).map((type) => (
            <button
              key={type}
              onClick={() => connectWallet(type)}
              className="flex flex-col items-center justify-center p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <img src={walletIcons[type]} alt={walletNames[type]} className="w-12 h-12 mb-3" />
              <span className="text-sm text-white">{walletNames[type]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-center relative">
      {error && (
        <div className="mr-4 text-red-500 text-xs">
          {error}
        </div>
      )}
      
      {!isConnected ? (
        <div className="relative">
          <button
            onClick={() => setShowWalletOptions(true)}
            disabled={isConnecting}
            className="bg-black hover:bg-gray-800 text-white text-sm font-medium py-2 px-4 rounded-full border border-white flex items-center connect-wallet-btn"
          >
            {isConnecting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting {selectedWalletType && walletNames[selectedWalletType]}
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
          {showWalletOptions && <WalletSelector />}
        </div>
      ) : (
        <div className="flex items-center">
          <div className="bg-gray-800 rounded-full py-1 px-3 flex items-center mr-2">
            {selectedWalletType && (
              <img 
                src={walletIcons[selectedWalletType]} 
                alt={walletNames[selectedWalletType]} 
                className="w-4 h-4 mr-2" 
              />
            )}
            <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm mr-1">{truncateAddress(walletAddress)}</span>
            <span className="text-xs text-gray-400">({balance} ETH)</span>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default WalletConnect;