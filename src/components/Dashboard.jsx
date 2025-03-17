import React from 'react';
import { useUser } from '@clerk/clerk-react';

/**
 * Dashboard component - Protected by Clerk authentication
 * Only accessible to authenticated users
 */
function Dashboard() {
  const { user } = useUser();

  return (
    <div className="bg-[#191B1C] rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">User Dashboard</h2>
      
      <div className="bg-[#252729]/70 border border-gray-700/30 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium mb-3">Your Profile</h3>
        
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700">
            {user.imageUrl && (
              <img 
                src={user.imageUrl} 
                alt={user.firstName || 'User'} 
                className="w-full h-full object-cover"
              />
            )}
          </div>
          
          <div>
            <p className="font-medium text-lg">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-gray-400">{user.primaryEmailAddress?.emailAddress}</p>
            {user.username && (
              <p className="text-sm text-gray-500 mt-1">@{user.username}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#252729]/70 border border-gray-700/30 rounded-lg p-4">
          <h4 className="font-medium mb-2">Account Settings</h4>
          <p className="text-sm text-gray-400">
            Manage your account preferences and security settings
          </p>
          <button className="mt-3 px-4 py-2 bg-[#2C9CDB] hover:bg-[#2C9CDB]/80 text-white transition rounded-xl text-sm">
            Settings
          </button>
        </div>
        
        <div className="bg-[#252729]/70 border border-gray-700/30 rounded-lg p-4">
          <h4 className="font-medium mb-2">Trading History</h4>
          <p className="text-sm text-gray-400">
            View your past trades and performance
          </p>
          <a 
            href="/trading-history" 
            className="mt-3 px-4 py-2 bg-[#2C9CDB] hover:bg-[#2C9CDB]/80 text-white transition rounded-xl text-sm inline-block"
          >
            View History
          </a>
        </div>

        <div className="bg-[#252729]/70 border border-gray-700/30 rounded-lg p-4">
          <h4 className="font-medium mb-2">Liquidity Pool</h4>
          <p className="text-sm text-gray-400">
            Provide liquidity to all options from a single source
          </p>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('openLiquidityPool')); }}
            className="mt-3 px-4 py-2 bg-[#24AE60] hover:bg-[#24AE60]/80 text-white transition rounded-xl text-sm inline-block"
          >
            Manage Liquidity
          </a>
        </div>
      </div>
      
      <div className="bg-[#252729]/70 border border-gray-700/30 rounded-lg p-4">
        <h4 className="font-medium mb-2">Connected Services</h4>
        <div className="flex gap-3 mt-2">
          <div className="py-2 px-3 bg-[#191B1C]/70 border border-gray-700/30 rounded-lg text-xs">
            Clerk Authentication
          </div>
          <div className="py-2 px-3 bg-[#191B1C]/70 border border-gray-700/30 rounded-lg text-xs">
            Polymarket API
          </div>
          <div className="py-2 px-3 bg-[#191B1C]/70 border border-gray-700/30 rounded-lg text-xs">
            Wallet Connect
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;