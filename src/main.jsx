import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import AppRouter from './AppRouter.jsx'
import './index.css'

// Import the publishable key from environment variables
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Check if the key is available
if (!publishableKey) {
  console.error('Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY in your .env file');
}

// Render with or without Clerk authentication based on key availability
const rootElement = document.getElementById('root');

if (publishableKey) {
  createRoot(rootElement).render(
    <StrictMode>
      <ClerkProvider publishableKey={publishableKey}>
        <AppRouter />
      </ClerkProvider>
    </StrictMode>
  );
} else {
  // Fallback rendering without Clerk for development purposes
  createRoot(rootElement).render(
    <StrictMode>
      <AppRouter />
    </StrictMode>
  );
}
