// src/utils/historicalData.js
/**
 * Historical data service to store and retrieve market data using IndexedDB
 * Used for volatility calculation and trend analysis
 */

class HistoricalDataService {
  constructor() {
    this.dbName = 'PolyCzarHistoricalData';
    this.db = null;
    this.ready = false;
  }

  /**
   * Initialize the database
   * @returns {Promise} Promise that resolves when the database is ready
   */
  async initialize() {
    if (this.ready) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (event) => {
          const db = event.target.result;

          // Create object store for historical price data
          if (!db.objectStoreNames.contains('marketData')) {
            const marketDataStore = db.createObjectStore('marketData', { keyPath: 'id' });
            marketDataStore.createIndex('marketId', 'marketId', { unique: false });
            marketDataStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.ready = true;
          console.log('HistoricalDataService: Database initialized');
          resolve();
        };

        request.onerror = (event) => {
          console.error('HistoricalDataService: Error opening database', event.target.error);
          reject(new Error('Failed to open database'));
        };
      } catch (error) {
        console.error('HistoricalDataService: Error initializing database', error);
        reject(error);
      }
    });
  }

  /**
   * Store a data point for a market
   * @param {string} marketId - Market identifier
   * @param {Object} dataPoint - Data to store
   * @returns {Promise} Promise that resolves when the data is stored
   */
  async storeDataPoint(marketId, dataPoint) {
    if (!this.ready) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['marketData'], 'readwrite');
        const store = transaction.objectStore('marketData');

        // Format data for storage
        const timestamp = dataPoint.timestamp || Date.now();
        const data = {
          id: `${marketId}-${timestamp}`,
          marketId,
          timestamp,
          probability: dataPoint.probability || dataPoint.currentPrice * 100,
          currentPrice: dataPoint.currentPrice,
          volume: dataPoint.volume || 0,
          liquidity: dataPoint.liquidity || 0
        };

        const request = store.add(data);

        request.onsuccess = () => resolve(data);
        request.onerror = (event) => reject(event.target.error);

        transaction.oncomplete = () => {
          console.log(`HistoricalDataService: Stored data point for market ${marketId}`);
        };
      } catch (error) {
        console.error('HistoricalDataService: Error storing data point', error);
        reject(error);
      }
    });
  }

  /**
   * Get historical data for a market
   * @param {string} marketId - Market identifier
   * @param {number} days - Number of days of history to retrieve
   * @returns {Promise<Array>} Promise that resolves to an array of data points
   */
  async getHistoricalData(marketId, days = 30) {
    if (!this.ready) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['marketData'], 'readonly');
        const store = transaction.objectStore('marketData');
        const marketIndex = store.index('marketId');

        // Calculate cutoff time
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - days);

        const range = IDBKeyRange.bound([marketId, cutoffTime.getTime()], [marketId, Date.now()]);
        
        const request = marketIndex.openCursor(range);
        const results = [];

        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          }
        };

        transaction.oncomplete = () => {
          // Sort by timestamp
          results.sort((a, b) => a.timestamp - b.timestamp);
          resolve(results);
        };

        transaction.onerror = (event) => reject(event.target.error);
      } catch (error) {
        console.error('HistoricalDataService: Error retrieving historical data', error);
        reject(error);
      }
    });
  }

  /**
   * Clear data older than specified days
   * @param {number} olderThanDays - Delete data older than this many days
   * @returns {Promise} Promise that resolves when old data is cleared
   */
  async clearOldData(olderThanDays = 90) {
    if (!this.ready) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(['marketData'], 'readwrite');
        const store = transaction.objectStore('marketData');
        const timestampIndex = store.index('timestamp');

        // Calculate cutoff time
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - olderThanDays);

        const range = IDBKeyRange.upperBound(cutoffTime.getTime());
        const request = timestampIndex.openCursor(range);

        // Delete old records
        let deleteCount = 0;
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            deleteCount++;
            cursor.continue();
          }
        };

        transaction.oncomplete = () => {
          console.log(`HistoricalDataService: Cleared ${deleteCount} old data points`);
          resolve(deleteCount);
        };

        transaction.onerror = (event) => reject(event.target.error);
      } catch (error) {
        console.error('HistoricalDataService: Error clearing old data', error);
        reject(error);
      }
    });
  }

  /**
   * Get the most recent data point for a market
   * @param {string} marketId - Market identifier
   * @returns {Promise<Object>} Promise that resolves to the most recent data point
   */
  async getLatestDataPoint(marketId) {
    const data = await this.getHistoricalData(marketId, 1);
    return data.length > 0 ? data[data.length - 1] : null;
  }
}

// Create a singleton instance
export const historicalDataService = new HistoricalDataService();
export default historicalDataService;