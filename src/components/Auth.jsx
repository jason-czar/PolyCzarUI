import React, { useState, useEffect, useRef } from 'react';
import { 
  SignInButton, 
  SignUpButton, 
  SignOutButton,
  SignedIn, 
  SignedOut, 
  UserButton,
  useUser
} from '@clerk/clerk-react';
import walletManager from '../utils/wallet';
import WalletSelector from './WalletSelector';

/**
 * Auth component that demonstrates Clerk's authentication functionality
 * Shows different UI elements based on user's authentication state
 * Hides content in a hamburger menu that can be toggled
 */
function Auth({ onOpenPoolModal }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef]);
  
  // Wallet connection listeners
  useEffect(() => {
    // Add listener for wallet account changes
    window.addEventListener('walletAccountChanged', handleWalletChange);
    
    return () => {
      window.removeEventListener('walletAccountChanged', handleWalletChange);
    };
  }, []);
  
  const handleWalletChange = (event) => {
    const { address, isConnected: connected } = event.detail;
    setIsConnected(connected);
    setWalletAddress(address || '');
    
    if (connected && address) {
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
    setWalletError('');
    setShowWalletSelector(false);
    
    try {
      const { address } = await walletManager.connect(walletType);
      setIsConnected(true);
      setWalletAddress(address);
      await fetchBalance(address);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      setWalletError(err.message || 'Failed to connect wallet');
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
    } catch (err) {
      console.error('Failed to disconnect wallet:', err);
      setWalletError(err.message || 'Failed to disconnect wallet');
    }
  };

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (!isLoaded) {
    return <div className="text-gray-400">Loading authentication...</div>;
  }

  // Hamburger menu toggle handler
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Login Button */}
      <button 
        onClick={toggleMenu} 
        className="p-2 rounded-lg bg-transparent text-white/80 hover:bg-white/10 transition-colors duration-200"
        aria-label="Toggle auth menu"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 6h16M4 12h16M4 18h16" 
          />
        </svg>
        {isSignedIn && (
          <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-[#24AE60] rounded-full"></span>
        )}
      </button>

      {/* Menu content - conditionally shown */}
      <div className={`absolute right-0 top-10 z-40 mt-2 w-72 origin-top-right rounded-md shadow-lg transition-all duration-200 ease-in-out transform ${isMenuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        <div className="bg-[#191B1C]/70 backdrop-blur-sm border border-gray-700/30 rounded-lg p-4 shadow-xl ring-1 ring-gray-800/30">
            
            <SignedOut>
              <div className="flex flex-col space-y-3">
                <p className="text-gray-400 mb-2">You are currently signed out</p>
                <div className="flex gap-3">
                  <SignInButton mode="modal">
                    <button className="bg-[#2C9CDB] hover:bg-[#2589c2] text-white py-2 px-4 rounded-[12px] transition">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-[#24AE60] hover:bg-[#1e9652] text-white py-2 px-4 rounded-[12px] transition">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              </div>
            </SignedOut>
            
            <SignedIn>
              <div className="flex flex-col space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <UserButton />
                    <div>
                      <p className="font-medium text-sm">Welcome, {user?.firstName || user?.username || 'User'}</p>
                      <p className="text-xs text-gray-400">{user?.primaryEmailAddress?.emailAddress || ''}</p>
                    </div>
                  </div>
                  
                  {/* Wallet Connection Section for Signed-in Users */}
                  <div className="border-t border-gray-700 mt-3 pt-3">
                    {walletError && (
                      <div className="mb-2 text-red-400 text-xs">
                        {walletError}
                      </div>
                    )}
                    
                    {!isConnected ? (
                      <button
                        onClick={() => setShowWalletSelector(true)}
                        disabled={isConnecting}
                        className="bg-[#2C9CDB] hover:bg-[#2C9CDB]/80 text-white text-sm py-2 px-4 rounded-xl w-full flex justify-center items-center mb-3"
                      >
                        {isConnecting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Connecting
                          </>
                        ) : (
                          'Connect Wallet'
                        )}
                      </button>
                    ) : (
                      <div className="flex flex-col space-y-2 mb-3">
                        <div className="bg-gray-800 rounded-md py-1 px-2 flex items-center">
                          <div className="h-2 w-2 rounded-full bg-[#24AE60] mr-2"></div>
                          <span className="text-sm mr-1">{truncateAddress(walletAddress)}</span>
                          <span className="text-xs text-gray-400 ml-auto">{balance} ETH</span>
                        </div>
                        <button
                          onClick={disconnectWallet}
                          className="text-red-500 hover:text-red-400 text-xs"
                        >
                          Disconnect Wallet
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-700 mt-3 pt-3">
                    {/* Pool Button */}
                    <button
                      onClick={onOpenPoolModal}
                      className="text-white hover:text-[#24AE60] text-sm mb-3 w-full text-left transition-colors"
                    >
                      Manage Liquidity Pool
                    </button>
                    
                    {/* Dashboard Link */}
                    <button
                      onClick={() => window.location.href = '/dashboard'}
                      className="text-white hover:text-[#2C9CDB] text-sm mb-3 w-full text-left transition-colors"
                    >
                      Dashboard
                    </button>
                    
                    <SignOutButton>
                      <button className="text-white hover:text-red-400 text-sm">
                        Sign Out
                      </button>
                    </SignOutButton>
                  </div>
                </div>
              </div>
            </SignedIn>
        </div>
      </div>

      {/* Wallet Selector Modal */}
      {showWalletSelector && (
        <WalletSelector
          onSelect={connectWallet}
          onClose={() => setShowWalletSelector(false)}
        />
      )}
    </div>
  );
}

export default Auth;