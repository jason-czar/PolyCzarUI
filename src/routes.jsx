import React from 'react';
import Dashboard from './components/Dashboard';
import TradingHistory from './components/TradingHistory';
import App from './App';

/**
 * Routes configuration for the application
 * Includes both public and protected routes
 */

// Check if Clerk publishable key is available
const hasClerkKey = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Import useUser at the top level to avoid conditional hook calls
import { useUser } from '@clerk/clerk-react';

// Create a component that uses the hook unconditionally
function AuthenticatedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser();
  
  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse text-gray-400">Loading authentication...</div>
      </div>
    );
  }
  
  // Redirect to home page if user is not signed in
  if (!isSignedIn) {
    return (
      <div className="bg-red-900/50 border border-red-600 rounded-lg p-6 my-4 text-center">
        <h2 className="text-xl font-bold text-red-200 mb-2">Authentication Required</h2>
        <p className="text-red-300 mb-4">
          You need to be signed in to view this page.
        </p>
        <a href="/" className="inline-block bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded text-white">
          Return to Home
        </a>
      </div>
    );
  }
  
  // If authenticated, render the protected content
  return children;
}

const ClerkProtectedRoute = ({ children }) => {
  try {
    // Use the AuthenticatedRoute component that has the unconditional hook
    return <AuthenticatedRoute>{children}</AuthenticatedRoute>;
  } catch (error) {
    console.error('Clerk authentication error:', error);
    // Return children anyway since we're in a catch block
    return children;
  }
};

// Development mode bypass for protected routes
const DevBypassRoute = ({ children }) => {
  console.warn('Development mode: Authentication is bypassed');
  return children;
};

// Export the appropriate ProtectedRoute based on environment
export const ProtectedRoute = hasClerkKey ? ClerkProtectedRoute : DevBypassRoute;

// Route definitions
export const routes = [
  {
    path: '/',
    element: <App />,
    public: true,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
    public: false,
  },
  {
    path: '/trading-history',
    element: (
      <ProtectedRoute>
        <TradingHistory />
      </ProtectedRoute>
    ),
    public: false,
  }
];