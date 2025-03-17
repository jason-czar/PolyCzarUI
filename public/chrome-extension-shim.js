// Chrome Extension compatibility shim
// This file provides polyfills for Node.js functionality that might be used in the application

(function() {
  // Polyfill for require if it doesn't exist
  if (typeof window !== 'undefined' && typeof window.require === 'undefined') {
    window.require = function(modulePath) {
      console.warn(`Module import attempted via require(): ${modulePath}`);
      // Return mock implementations for common modules
      if (modulePath === 'path') {
        return {
          join: function() { return Array.prototype.join.call(arguments, '/').replace(/\/+/g, '/'); },
          resolve: function() { return Array.prototype.join.call(arguments, '/').replace(/\/+/g, '/'); }
        };
      }
      if (modulePath === 'fs') {
        return {
          readFileSync: function() { return ''; },
          writeFileSync: function() { return null; }
        };
      }
      // Return empty objects/functions to prevent errors for other modules
      return {};
    };
  }

  // Polyfill for process if it doesn't exist
  if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
    window.process = {
      env: {
        NODE_ENV: 'production'
      },
      browser: true
    };
  }

  // Polyfill for global if it doesn't exist
  if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
    window.global = window;
  }

  // Polyfill for Buffer if it doesn't exist
  if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
    window.Buffer = {
      from: function(data) { return data; },
      isBuffer: function() { return false; }
    };
  }

  console.log('Chrome extension compatibility shim loaded successfully');
})();
