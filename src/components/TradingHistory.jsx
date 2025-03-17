import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getAuthenticatedSupabaseClient } from '../utils/supabase';
import { recordTradeHistory, fetchUserTradeHistory } from '../utils/tradeHistoryService';

/**
 * Component to display user's trading history from Supabase
 * Includes filtering and sorting options
 */
function TradingHistory() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [trades, setTrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    dateRange: '30'
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  // Format date to display in a nice format
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format currency values to display in a nice format
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Load trading history when component mounts
  useEffect(() => {
    const loadTradeHistory = async () => {
      if (!isLoaded || !isSignedIn) return;

      setIsLoading(true);
      try {
        const history = await fetchUserTradeHistory(user);
        setTrades(history);
        setError('');
      } catch (err) {
        console.error('Error loading trade history:', err);
        setError('Failed to load trading history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTradeHistory();
  }, [user, isLoaded, isSignedIn]);

  // Request sort on a specific column
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter trades based on current filters
  const filteredTrades = React.useMemo(() => {
    if (!trades.length) return [];

    return trades.filter(trade => {
      // Filter by status
      if (filters.status !== 'all' && trade.status !== filters.status) {
        return false;
      }
      
      // Filter by type
      if (filters.type !== 'all' && trade.transaction_type !== filters.type) {
        return false;
      }
      
      // Filter by date range
      if (filters.dateRange !== 'all') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.dateRange));
        
        if (new Date(trade.created_at) < cutoffDate) {
          return false;
        }
      }
      
      return true;
    });
  }, [trades, filters]);

  // Sort filtered trades based on current sort config
  const sortedTrades = React.useMemo(() => {
    const sortableItems = [...filteredTrades];
    
    sortableItems.sort((a, b) => {
      // Handle null values
      if (!a[sortConfig.key]) return 1;
      if (!b[sortConfig.key]) return -1;
      
      // Compare based on data type
      if (typeof a[sortConfig.key] === 'string') {
        return sortConfig.direction === 'asc'
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      
      // Default numeric comparison
      return sortConfig.direction === 'asc'
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
    });
    
    return sortableItems;
  }, [filteredTrades, sortConfig]);

  // Color mapping for transaction status
  const statusColors = {
    'pending': 'bg-yellow-400/20 text-yellow-300',
    'completed': 'bg-green-400/20 text-green-300',
    'failed': 'bg-red-400/20 text-red-300',
    'cancelled': 'bg-gray-400/20 text-gray-300'
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Trading History</h2>
        <button 
          onClick={() => window.history.back()} 
          className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 transition"
        >
          Back to Dashboard
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 bg-gray-800/50 p-4 rounded">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Status</label>
          <select 
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Transaction Type</label>
          <select 
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={filters.type}
            onChange={e => setFilters({...filters, type: e.target.value})}
          >
            <option value="all">All</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">Date Range</label>
          <select 
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={filters.dateRange}
            onChange={e => setFilters({...filters, dateRange: e.target.value})}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Loading trading history...</span>
          </div>
        </div>
      ) : (
        <>
          {sortedTrades.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium mb-2">No trading history found</h3>
              <p className="text-gray-400">
                You haven't made any trades yet or no trades match your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th 
                      className="text-left py-3 px-4 cursor-pointer hover:bg-gray-800/50" 
                      onClick={() => requestSort('created_at')}
                    >
                      <div className="flex items-center">
                        Date
                        {sortConfig.key === 'created_at' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left py-3 px-4 cursor-pointer hover:bg-gray-800/50" 
                      onClick={() => requestSort('transaction_type')}
                    >
                      <div className="flex items-center">
                        Type
                        {sortConfig.key === 'transaction_type' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="text-left py-3 px-4">Market/Option</th>
                    <th 
                      className="text-right py-3 px-4 cursor-pointer hover:bg-gray-800/50" 
                      onClick={() => requestSort('amount')}
                    >
                      <div className="flex items-center justify-end">
                        Quantity
                        {sortConfig.key === 'amount' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 cursor-pointer hover:bg-gray-800/50" 
                      onClick={() => requestSort('price')}
                    >
                      <div className="flex items-center justify-end">
                        Price
                        {sortConfig.key === 'price' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-4 cursor-pointer hover:bg-gray-800/50"
                      onClick={() => requestSort('status')}
                    >
                      <div className="flex items-center justify-end">
                        Status
                        {sortConfig.key === 'status' && (
                          <span className="ml-1">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTrades.map(trade => (
                    <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="py-3 px-4">
                        {formatDate(trade.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`${trade.transaction_type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.transaction_type.charAt(0).toUpperCase() + trade.transaction_type.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">
                            {trade.option_id ? trade.option_id.split('-').slice(0, 1).join('-') : 'N/A'} 
                            {trade.option_id ? 
                              <span className="font-normal ml-1 text-gray-400">
                                {trade.option_id.split('-')[1]} {trade.option_id.split('-')[0]}
                              </span> 
                              : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            Exp: {trade.option_id ? trade.option_id.split('-').slice(2).join('-') : 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {trade.amount ? trade.amount.toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {trade.price ? formatCurrency(trade.price) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-1 rounded text-xs ${statusColors[trade.status] || 'bg-gray-400/20 text-gray-300'}`}>
                          {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-400">
            Showing {sortedTrades.length} of {trades.length} transactions
          </div>
        </>
      )}
    </div>
  );
}

export default TradingHistory;