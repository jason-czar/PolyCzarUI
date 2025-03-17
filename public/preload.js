// Chrome Extension Preload Script
// This script runs before any other scripts and provides polyfills for Node.js functionality

// Define global variables that might be expected by libraries
window.global = window;
window.process = { env: { NODE_ENV: 'production' }, browser: true };
window.Buffer = { 
  from: function() { return []; }, 
  isBuffer: function() { return false; } 
};

// Define require function to handle CommonJS modules
window.require = function(moduleName) {
  console.log('Module required:', moduleName);
  
  // Return mock implementations for common Node.js modules
  if (moduleName === 'path') {
    return {
      join: function() { 
        return Array.from(arguments).join('/').replace(/\/+/g, '/'); 
      },
      resolve: function() { 
        return Array.from(arguments).join('/').replace(/\/+/g, '/'); 
      }
    };
  }
  
  if (moduleName === 'fs') {
    return {
      readFileSync: function() { return ''; },
      writeFileSync: function() { return null; }
    };
  }
  
  // Return empty object for other modules
  return {};
};

console.log('Chrome extension preload script executed successfully');
