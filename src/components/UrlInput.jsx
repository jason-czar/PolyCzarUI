// UrlInput.jsx
import React, { useState } from 'react';
import polymarketUtils from '../utils/polymarket';

function UrlInput({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!polymarketUtils.isValidPolymarketUrl(url)) {
      setError('Please enter a valid Polymarket event URL');
      return;
    }

    setError('');
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 w-full flex justify-center">
      <div className="flex flex-col space-y-2 w-full max-w-[500px]">
        <div className="w-full">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Polymarket URL"
              className="w-full pl-10 pr-14 py-3 rounded-xl bg-[#252729]/70 text-[#9BA3AF] border-0 focus:outline-none focus:ring-1 focus:ring-[#2C9CDB] text-sm"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 right-0 flex items-center justify-center pr-2.5">
              <button
                type="submit"
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg text-white font-medium text-sm flex items-center justify-center ${
                  isLoading
                    ? 'bg-gray-500 cursor-not-allowed'
                    : 'bg-[#2C9CDB] hover:bg-[#2589c2]'
                }`}
                style={{ height: '60%', width: '120%', aspectRatio: '1/1' }}
              >
                {isLoading ? '...' : '→'}
              </button>
            </div>
          </div>
        </div>
        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}
      </div>
    </form>
  );
}

export default UrlInput;