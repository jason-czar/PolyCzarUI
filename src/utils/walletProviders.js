// walletProviders.js - Contains setup for multiple wallet providers
import { ethers } from 'ethers';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import WalletConnectProvider from '@walletconnect/web3-provider';

// Provider configuration
const WALLET_CONNECT_INFURA_ID = adb928d349ee4a55a47f0ca000a62e2a; // Replace with actual ID in production

// Wallet provider definitions
export const WALLET_PROVIDERS = {
  METAMASK: 'metamask',
  COINBASE: 'coinbase',
  PHANTOM: 'phantom',
  WALLET_CONNECT: 'walletconnect'
};

// Provider initializer functions
export const initProviders = {
  // MetaMask provider
  [WALLET_PROVIDERS.METAMASK]: async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed. Please install MetaMask extension.');
    }
    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    return { provider, accounts };
  },
  
  // Coinbase Wallet provider
  [WALLET_PROVIDERS.COINBASE]: async () => {
    // Initialize Coinbase Wallet SDK
    const coinbaseWallet = new CoinbaseWalletSDK({
      appName: 'Polymarket Options Chain',
      appLogoUrl: '/assets/images/logo.png',
      darkMode: false
    });
    
    // Initialize provider with Ethereum
    const ethereum = coinbaseWallet.makeWeb3Provider('https://mainnet.infura.io/v3/' + WALLET_CONNECT_INFURA_ID, 1);
    
    // Request accounts
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(ethereum);
    
    return { provider, accounts };
  },
  
  // Phantom Wallet provider (primarily for Solana but can bridge to Ethereum)
  [WALLET_PROVIDERS.PHANTOM]: async () => {
    if (!window.phantom?.solana) {
      throw new Error('Phantom wallet not installed. Please install Phantom wallet extension.');
    }
    
    try {
      // Connect to Phantom
      const connection = await window.phantom.solana.connect();
      const phantomProvider = window.phantom.solana;
      
      // For this demo, we'll just return the Phantom provider which we would normally
      // use in a Solana context. In a real app, we'd integrate with a Solana-Ethereum bridge
      // but for UI demonstration purposes this will work
      return { 
        provider: phantomProvider, 
        accounts: [connection.publicKey.toString()],
        isNonEthereum: true 
      };
    } catch (error) {
      throw new Error(`Error connecting to Phantom: ${error.message}`);
    }
  },
  
  // WalletConnect provider
  [WALLET_PROVIDERS.WALLET_CONNECT]: async () => {
    const provider = new WalletConnectProvider({
      infuraId: WALLET_CONNECT_INFURA_ID,
      qrcodeModalOptions: {
        mobileLinks: ['rainbow', 'metamask', 'trust', 'argent'],
      },
    });
    
    // Enable session (triggers QR Code modal)
    await provider.enable();
    
    // Wrap with ethers
    const web3Provider = new ethers.providers.Web3Provider(provider);
    const accounts = await web3Provider.listAccounts();
    
    return { provider: web3Provider, accounts };
  },
};

// Wallet provider metadata for UI
export const walletProviderInfo = {
  [WALLET_PROVIDERS.METAMASK]: {
    name: 'MetaMask',
    icon: '/assets/wallets/metamask.png',
    description: 'Connect to your MetaMask Wallet',
  },
  [WALLET_PROVIDERS.COINBASE]: {
    name: 'Coinbase Wallet',
    icon: '/assets/wallets/coinbase.png',
    description: 'Connect to your Coinbase Wallet',
  },
  [WALLET_PROVIDERS.PHANTOM]: {
    name: 'Phantom',
    icon: '/assets/wallets/phantom.png',
    description: 'Connect to Phantom Wallet',
  },
  [WALLET_PROVIDERS.WALLET_CONNECT]: {
    name: 'WalletConnect',
    icon: '/assets/wallets/walletconnect.png',
    description: 'Connect with WalletConnect',
  },
};
