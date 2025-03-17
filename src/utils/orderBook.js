// orderBook.js
// Order Book model for options trading supporting bids and asks

class OrderBook {
  constructor() {
    this.books = {}; // Holds all order books, keyed by optionId
    this.orders = {}; // Holds all orders, keyed by orderId
    this.lastOrderId = 0;
    this.initialized = false;
  }
  
  /**
   * Initialize the order book system
   */
  async initialize() {
    if (this.initialized) return Promise.resolve();
    
    try {
      console.log('OrderBook: Initialized successfully');
      this.initialized = true;
      return Promise.resolve();
    } catch (error) {
      console.error('OrderBook: Initialization failed', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Initialize an order book for a specific option if it doesn't exist
   * @param {string} optionId - Unique identifier for the option
   * @returns {Object} - The order book
   */
  getBook(optionId) {
    if (!this.books[optionId]) {
      this.books[optionId] = {
        bids: [], // Buy orders sorted by price (highest first)
        asks: [], // Sell orders sorted by price (lowest first)
        lastUpdated: Date.now()
      };
    }
    return this.books[optionId];
  }
  
  /**
   * Add an order to the book
   * @param {string} optionId - Unique identifier for the option
   * @param {string} userId - User's identifier
   * @param {boolean} isBid - True for buy orders, false for sell orders
   * @param {number} price - Limit price
   * @param {number} quantity - Number of contracts
   * @param {Object} optionDetails - Additional option details
   * @returns {Object} - The created order
   */
  placeOrder(optionId, userId, isBid, price, quantity, optionDetails = {}) {
    // Validate inputs
    if (!optionId || !userId || price === undefined || quantity <= 0) {
      throw new Error('Invalid order parameters');
    }
    
    // Generate unique order ID
    this.lastOrderId++;
    const orderId = `order-${Date.now()}-${this.lastOrderId}`;
    
    // Create order
    const order = {
      id: orderId,
      optionId,
      userId,
      isBid,
      price: Number(price.toFixed(2)), // Standardize to 2 decimal places
      quantity: Math.round(quantity), // Ensure whole number
      timestamp: Date.now(),
      status: 'active',
      filled: 0,
      optionDetails: {
        ...optionDetails,
        strike: optionDetails.strike || 0,
        expiry: optionDetails.expiry || 'default',
        type: optionDetails.type || 'call'
      }
    };
    
    // Store order in orders map
    this.orders[orderId] = order;
    
    // Add to appropriate order book
    const book = this.getBook(optionId);
    const orderList = isBid ? book.bids : book.asks;
    
    // Add the order to the list
    orderList.push(order);
    
    // Sort bids (descending) and asks (ascending)
    if (isBid) {
      book.bids.sort((a, b) => b.price - a.price);
    } else {
      book.asks.sort((a, b) => a.price - b.price);
    }
    
    book.lastUpdated = Date.now();
    
    // Try to match and execute orders
    this.matchOrders(optionId);
    
    return { orderId, order };
  }
  
  /**
   * Cancel an existing order
   * @param {string} orderId - Unique identifier for the order
   * @param {string} userId - User identifier (for security)
   * @returns {Object} - The cancelled order
   */
  cancelOrder(orderId, userId) {
    const order = this.orders[orderId];
    
    // Order not found
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Auth check
    if (order.userId !== userId) {
      throw new Error('Unauthorized: Cannot cancel another user\'s order');
    }
    
    // Already cancelled or filled
    if (order.status !== 'active') {
      throw new Error(`Cannot cancel: order is ${order.status}`);
    }
    
    // Update status
    order.status = 'cancelled';
    
    // Remove from book
    const book = this.books[order.optionId];
    if (book) {
      const orderList = order.isBid ? book.bids : book.asks;
      const index = orderList.findIndex(o => o.id === orderId);
      if (index !== -1) {
        orderList.splice(index, 1);
      }
      book.lastUpdated = Date.now();
    }
    
    return { success: true, order };
  }
  
  /**
   * Update an existing order
   * @param {string} orderId - Unique identifier for the order
   * @param {string} userId - User identifier (for security)
   * @param {number} newPrice - New limit price
   * @param {number} newQuantity - New quantity
   * @returns {Object} - The updated order
   */
  updateOrder(orderId, userId, newPrice, newQuantity) {
    // Cancel the old order
    this.cancelOrder(orderId, userId);
    
    // Get details from old order
    const oldOrder = this.orders[orderId];
    
    // Place new order with updated details
    return this.placeOrder(
      oldOrder.optionId,
      userId,
      oldOrder.isBid,
      newPrice,
      newQuantity,
      oldOrder.optionDetails
    );
  }
  
  /**
   * Try to match and execute orders in the book
   * @param {string} optionId - Unique identifier for the option
   * @returns {Array} - Executed trades
   */
  matchOrders(optionId) {
    const book = this.getBook(optionId);
    const trades = [];
    
    // Keep matching as long as there are matching bid/ask pairs
    let matchFound = true;
    while (matchFound && book.bids.length > 0 && book.asks.length > 0) {
      matchFound = false;
      
      const topBid = book.bids[0];
      const topAsk = book.asks[0];
      
      // Check if orders can be matched (bid >= ask)
      if (topBid.price >= topAsk.price) {
        matchFound = true;
        
        // Execute the trade at the price of the earliest order
        const executionPrice = topBid.timestamp < topAsk.timestamp ? topBid.price : topAsk.price;
        
        // Calculate trade size (limited by the smaller order)
        const tradeSize = Math.min(
          topBid.quantity - topBid.filled,
          topAsk.quantity - topAsk.filled
        );
        
        // Update filled amounts
        topBid.filled += tradeSize;
        topAsk.filled += tradeSize;
        
        // Create trade record
        const trade = {
          optionId,
          buyOrderId: topBid.id,
          sellOrderId: topAsk.id,
          buyerId: topBid.userId,
          sellerId: topAsk.userId,
          price: executionPrice,
          quantity: tradeSize,
          total: executionPrice * tradeSize,
          timestamp: Date.now()
        };
        
        trades.push(trade);
        
        // Update order status if completely filled
        if (topBid.filled >= topBid.quantity) {
          topBid.status = 'filled';
          book.bids.shift(); // Remove from book
        }
        
        if (topAsk.filled >= topAsk.quantity) {
          topAsk.status = 'filled';
          book.asks.shift(); // Remove from book
        }
        
        book.lastUpdated = Date.now();
      }
    }
    
    return trades;
  }
  
  /**
   * Execute a market order immediately against the order book
   * @param {string} optionId - Unique identifier for the option
   * @param {string} userId - User identifier
   * @param {boolean} isBuy - True for market buy, false for market sell
   * @param {number} quantity - Number of contracts
   * @param {Object} optionDetails - Additional option details
   * @returns {Object} - Trade execution details
   */
  executeMarketOrder(optionId, userId, isBuy, quantity, optionDetails = {}) {
    const book = this.getBook(optionId);
    const orderList = isBuy ? book.asks : book.bids;
    const trades = [];
    let remainingQuantity = quantity;
    
    // Check if there's enough liquidity
    const availableQuantity = orderList.reduce((sum, order) => sum + (order.quantity - order.filled), 0);
    if (availableQuantity < quantity) {
      throw new Error('Insufficient liquidity for market order');
    }
    
    // Execute against each order in the book until filled
    while (remainingQuantity > 0 && orderList.length > 0) {
      const counterpartyOrder = orderList[0];
      const fillAmount = Math.min(remainingQuantity, counterpartyOrder.quantity - counterpartyOrder.filled);
      
      // Create trade
      const trade = {
        optionId,
        price: counterpartyOrder.price,
        quantity: fillAmount,
        total: counterpartyOrder.price * fillAmount,
        buyerId: isBuy ? userId : counterpartyOrder.userId,
        sellerId: isBuy ? counterpartyOrder.userId : userId,
        timestamp: Date.now(),
        marketOrder: true
      };
      
      trades.push(trade);
      
      // Update counterparty order
      counterpartyOrder.filled += fillAmount;
      if (counterpartyOrder.filled >= counterpartyOrder.quantity) {
        counterpartyOrder.status = 'filled';
        orderList.shift(); // Remove from book
      }
      
      remainingQuantity -= fillAmount;
    }
    
    book.lastUpdated = Date.now();
    
    // Calculate average execution price
    const totalQuantity = trades.reduce((sum, trade) => sum + trade.quantity, 0);
    const totalValue = trades.reduce((sum, trade) => sum + trade.total, 0);
    const avgPrice = totalValue / totalQuantity;
    
    return {
      success: true,
      trades,
      averagePrice: avgPrice,
      totalQuantity: quantity,
      totalValue: totalValue,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get the current state of an order book
   * @param {string} optionId - Unique identifier for the option
   * @returns {Object} - Current order book state
   */
  getOrderBookState(optionId) {
    const book = this.getBook(optionId);
    
    // Aggregate price levels
    const bidLevels = this.aggregatePriceLevels(book.bids);
    const askLevels = this.aggregatePriceLevels(book.asks);
    
    // Calculate mid price and spread
    const bestBid = bidLevels.length > 0 ? bidLevels[0].price : 0;
    const bestAsk = askLevels.length > 0 ? askLevels[0].price : 0;
    
    const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
    const spread = bestBid > 0 && bestAsk > 0 ? bestAsk - bestBid : 0;
    
    return {
      optionId,
      lastUpdated: book.lastUpdated,
      bids: bidLevels,
      asks: askLevels,
      bestBid,
      bestAsk,
      midPrice,
      spread,
      depth: {
        bids: book.bids.length,
        asks: book.asks.length
      }
    };
  }
  
  /**
   * Aggregate orders at same price levels
   * @param {Array} orders - List of orders
   * @returns {Array} - Aggregated price levels
   */
  aggregatePriceLevels(orders) {
    const priceLevels = {};
    
    // Group by price
    orders.forEach(order => {
      if (order.status === 'active') {
        const price = Number(order.price.toFixed(2));
        if (!priceLevels[price]) {
          priceLevels[price] = {
            price,
            quantity: 0,
            orderCount: 0
          };
        }
        priceLevels[price].quantity += (order.quantity - order.filled);
        priceLevels[price].orderCount += 1;
      }
    });
    
    // Convert to array and sort
    const result = Object.values(priceLevels);
    result.sort((a, b) => b.price - a.price);
    
    return result;
  }
  
  /**
   * Get all orders for a user
   * @param {string} userId - User identifier
   * @returns {Array} - User's orders
   */
  getUserOrders(userId) {
    return Object.values(this.orders).filter(order => 
      order.userId === userId && order.status !== 'cancelled'
    ).sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Get details about a specific order
   * @param {string} orderId - Unique order identifier
   * @returns {Object|null} - Order details
   */
  getOrderDetails(orderId) {
    return this.orders[orderId] || null;
  }
  
  /**
   * Check if the order book has liquidity at a specific price
   * @param {string} optionId - Option identifier
   * @param {boolean} isBid - True for checking buy orders
   * @param {number} targetPrice - Price to check
   * @returns {number} - Available quantity at or better than the target price
   */
  getAvailableLiquidityAtPrice(optionId, isBid, targetPrice) {
    const book = this.getBook(optionId);
    const orderList = isBid ? book.bids : book.asks;
    
    let availableQuantity = 0;
    for (const order of orderList) {
      if (order.status !== 'active') continue;
      
      // For bids, we want price >= targetPrice
      // For asks, we want price <= targetPrice
      const priceIsGood = isBid ? order.price >= targetPrice : order.price <= targetPrice;
      
      if (priceIsGood) {
        availableQuantity += (order.quantity - order.filled);
      }
    }
    
    return availableQuantity;
  }
  
  /**
   * Compare prices between order book and AMM to determine best execution venue
   * @param {string} optionId - Option identifier
   * @param {boolean} isBuy - True for buy orders
   * @param {number} quantity - Order quantity
   * @param {Object} ammPricing - AMM pricing info {bidPrice, askPrice}
   * @returns {Object} - Best execution venue and price
   */
  getBestExecutionVenue(optionId, isBuy, quantity, ammPricing) {
    const book = this.getBook(optionId);
    const orderBookState = this.getOrderBookState(optionId);
    
    // Default to AMM if order book has no liquidity
    if ((isBuy && book.asks.length === 0) || (!isBuy && book.bids.length === 0)) {
      return {
        venue: 'amm',
        price: isBuy ? ammPricing.askPrice : ammPricing.bidPrice,
        liquidity: 'unlimited' // AMM has theoretically unlimited liquidity
      };
    }
    
    // Get best price from order book
    const orderBookPrice = isBuy ? orderBookState.bestAsk : orderBookState.bestBid;
    
    // Get available quantity at this price
    const availableQuantity = this.getAvailableLiquidityAtPrice(
      optionId, 
      !isBuy, // For buys, we check asks; for sells, we check bids
      orderBookPrice
    );
    
    // If not enough liquidity in order book, use AMM
    if (availableQuantity < quantity) {
      return {
        venue: 'amm',
        price: isBuy ? ammPricing.askPrice : ammPricing.bidPrice,
        liquidity: 'unlimited'
      };
    }
    
    // Compare prices to determine best venue
    const ammPrice = isBuy ? ammPricing.askPrice : ammPricing.bidPrice;
    const useOrderBook = isBuy ? 
      (orderBookPrice <= ammPrice) : // For buys, order book is better if price is lower
      (orderBookPrice >= ammPrice); // For sells, order book is better if price is higher
    
    if (useOrderBook) {
      return {
        venue: 'orderbook',
        price: orderBookPrice,
        liquidity: availableQuantity
      };
    } else {
      return {
        venue: 'amm',
        price: ammPrice,
        liquidity: 'unlimited'
      };
    }
  }
}

export const orderBookInstance = new OrderBook();
export default orderBookInstance;