// wallet.js
import { ethers } from 'ethers';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import WalletConnectProvider from '@walletconnect/web3-provider';

// Mock ABI for a simple ERC20 token contract
const ERC20_ABI = [
  // Read-only functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  // Authenticated functions
  'function transfer(address to, uint amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
];

// Mock AMM contract ABI
const AMM_ABI = [
  'function addLiquidity(uint256 tokenAmount) payable returns (uint256)',
  'function removeLiquidity(uint256 lpTokenAmount) returns (uint256, uint256)',
  'function swapTokens(uint256 tokenAmount) payable returns (uint256)',
  'function getTokenBalance() view returns (uint256)',
  'function getEthBalance() view returns (uint256)',
  'function getLpBalance(address owner) view returns (uint256)',
];

// Wallet types
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  COINBASE: 'coinbase',
  PHANTOM: 'phantom',
  WALLET_CONNECT: 'walletconnect'
};

class WalletManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.isConnected = false;
    this.chainId = null;
    this.tokenContract = null;
    this.ammContract = null;
    this.walletType = null;
    this.wcProvider = null;
  }

  async connect(walletType = WALLET_TYPES.METAMASK) {
    try {
      if (this.isConnected) {
        await this.disconnect();
      }

      this.walletType = walletType;
      
      switch (walletType) {
        case WALLET_TYPES.METAMASK:
          return await this.connectMetamask();
        case WALLET_TYPES.COINBASE:
          return await this.connectCoinbase();
        case WALLET_TYPES.PHANTOM:
          return await this.connectPhantom();
        case WALLET_TYPES.WALLET_CONNECT:
          return await this.connectWalletConnect();
        default:
          throw new Error('Unsupported wallet type');
      }
    } catch (error) {
      this.resetState();
      console.error('Error connecting wallet:', error);
      throw this.formatError(error);
    }
  }

  formatError(error) {
    if (error.message.includes('User rejected')) {
      return new Error('Connection rejected by user');
    }
    if (error.message.includes('not detected') || error.message.includes('not installed')) {
      return error;
    }
    return new Error('Failed to connect wallet. Please try again.');
  }

  resetState() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.isConnected = false;
    this.chainId = null;
    this.tokenContract = null;
    this.ammContract = null;
    if (this.wcProvider) {
      this.wcProvider.disconnect();
      this.wcProvider = null;
    }
  }

  async connectMetamask() {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected. Please install MetaMask extension.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.address = accounts[0];
      
      // Get network info
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      
      this.isConnected = true;
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountChange.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChange.bind(this));
      
      return {
        address: this.address,
        chainId: this.chainId
      };
    } catch (error) {
      throw error;
    }
  }

  async connectCoinbase() {
    const coinbaseWallet = new CoinbaseWalletSDK({
      appName: 'PolyCzar Options',
      appLogoUrl: '/logo.png',
      darkMode: true,
      overrideIsMetaMask: false
    });
    
    try {
      // Initialize a Web3 Provider object
      const ethereum = coinbaseWallet.makeWeb3Provider(
        'https://mainnet.infura.io/v3/your-infura-id',
        1
      );
      
      // Request account access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      // Get provider and signer
      this.provider = new ethers.providers.Web3Provider(ethereum);
      this.signer = this.provider.getSigner();
      this.address = accounts[0];
      
      // Get network info
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      
      this.isConnected = true;
      
      // Listen for account/chain changes
      ethereum.on('accountsChanged', this.handleAccountChange.bind(this));
      ethereum.on('chainChanged', this.handleChainChange.bind(this));
      
      return {
        address: this.address,
        chainId: this.chainId
      };
    } catch (error) {
      throw new Error('Failed to connect Coinbase Wallet. Please try again.');
    }
  }

  async connectPhantom() {
    if (!window.phantom?.solana) {
      throw new Error('Phantom wallet not detected. Please install Phantom wallet extension.');
    }
    
    try {
      // Connect to Phantom
      const connection = await window.phantom.solana.connect();
      this.address = connection.publicKey.toString();
      this.isConnected = true;
      
      // Set up Phantom provider
      this.provider = window.phantom.solana;
      
      // Listen for account changes
      window.phantom.solana.on('accountChanged', this.handlePhantomAccountChange.bind(this));
      
      return {
        address: this.address,
        chainId: 'solana'
      };
    } catch (error) {
      throw new Error('Failed to connect Phantom Wallet. Please try again.');
    }
  }

  async connectWalletConnect() {
    try {
      // Initialize WalletConnect Provider
      this.wcProvider = new WalletConnectProvider({
        rpc: {
          1: 'https://mainnet.infura.io/v3/your-infura-id',
          137: 'https://polygon-rpc.com'
        },
        chainId: 1,
        qrcode: true
      });
      
      // Enable session (triggers QR Code modal)
      await this.wcProvider.enable();
      
      // Wrap with ethers
      this.provider = new ethers.providers.Web3Provider(this.wcProvider);
      this.signer = this.provider.getSigner();
      const accounts = await this.provider.listAccounts();
      this.address = accounts[0];
      
      // Get network info
      const network = await this.provider.getNetwork();
      this.chainId = network.chainId;
      
      this.isConnected = true;
      
      // Setup listeners
      this.wcProvider.on('accountsChanged', this.handleAccountChange.bind(this));
      this.wcProvider.on('chainChanged', this.handleChainChange.bind(this));
      this.wcProvider.on('disconnect', this.handleDisconnect.bind(this));
      
      return {
        address: this.address,
        chainId: this.chainId
      };
    } catch (error) {
      if (this.wcProvider) {
        await this.wcProvider.disconnect();
        this.wcProvider = null;
      }
      throw new Error('Failed to connect via WalletConnect. Please try again.');
    }
  }

  async disconnect() {
    try {
      if (this.walletType === WALLET_TYPES.WALLET_CONNECT && this.wcProvider) {
        await this.wcProvider.disconnect();
      } else if (this.walletType === WALLET_TYPES.PHANTOM && window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
      
      this.resetState();
      
      // Dispatch wallet change event
      window.dispatchEvent(new CustomEvent('walletAccountChanged', {
        detail: { address: null, isConnected: false }
      }));
      
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw new Error('Failed to disconnect wallet');
    }
  }

  handleAccountChange(accounts) {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this.address = accounts[0];
      window.dispatchEvent(new CustomEvent('walletAccountChanged', {
        detail: { address: this.address, isConnected: this.isConnected }
      }));
    }
  }

  handlePhantomAccountChange(publicKey) {
    if (!publicKey) {
      this.disconnect();
    } else {
      this.address = publicKey.toString();
      window.dispatchEvent(new CustomEvent('walletAccountChanged', {
        detail: { address: this.address, isConnected: this.isConnected }
      }));
    }
  }

  handleChainChange(chainId) {
    window.location.reload();
  }

  handleDisconnect() {
    this.disconnect();
  }

  async getEthBalance() {
    if (!this.isConnected || !this.provider) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const balance = await this.provider.getBalance(this.address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw new Error('Failed to fetch balance');
    }
  }
}

export const walletManager = new WalletManager();
export default walletManager;
