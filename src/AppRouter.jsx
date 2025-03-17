import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { initSupabaseClerk } from './utils/supabase';
import { useAuth } from '@clerk/clerk-react';

/**
 * AppRouter component
 * Sets up React Router with the defined routes and initializes backend services
 */
function AppRouter() {
  const { isLoaded, userId } = useAuth();
  
  // Initialize Supabase when the component mounts
  useEffect(() => {
    // Initialize Supabase with Clerk integration
    initSupabaseClerk();
    console.log('Backend services initialized');
  }, []);

  // Create browser router with route configuration
  const router = createBrowserRouter(
    routes.map(route => ({
      path: route.path,
      element: route.element
    }))
  );

  return <RouterProvider router={router} />;
}

export default AppRouter;