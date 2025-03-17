# Project Summary
The Polymarket Options Chain Chrome Extension is an innovative financial tool designed for prediction market enthusiasts. It allows users to analyze and trade options linked to Polymarket events efficiently. The extension enhances the trading experience by enabling users to visualize options chains, execute trades seamlessly, and make informed decisions based on real-time market data. Core functionalities include options pricing analysis, trade execution, dynamic date generation for options expiry, and the introduction of a unified interface that incorporates both Automated Market Maker (AMM) and Order Book trading models for optimal trade execution.

# Project Module Description
The extension comprises several functional modules:

1. **URL Input**: 
   - Validates and retrieves market data from a Polymarket URL.
   
2. **Option Chain Display**: 
   - Provides a structured view of available options (Calls and Puts) with details like strike prices, contract prices, breakeven points, and probability of profit.
   
3. **Date Selector**: 
   - Facilitates the selection of expiration dates for options, dynamically generating upcoming Fridays for user convenience.
   
4. **Trade Modal**: 
   - Aids users in placing trade orders, providing necessary details such as limit prices and estimated costs while allowing for both AMM and Order Book execution.
   
5. **Pricing Visualizer**: 
   - Exhibits historical price movements and analyzes the impact of volatility on option pricing.
   
6. **Metrics Dashboard**: 
   - Displays key options trading metrics, including Greeks and expected values, aiding traders in investment evaluations.
   
7. **Polymarket Embed**: 
   - Integrates live data components of ongoing Polymarket events.
   
8. **Calculations Utilities**: 
   - Provides functionalities for calculating breakeven points, profit probabilities, and other essential metrics for options trading.
   
9. **Authentication**: 
   - Implements a secure user authentication layer through Clerk, enabling sign-in, sign-up, and profile management.
   
10. **Protected Routes**: 
    - Restricts access to certain features for authenticated users, enhancing both security and user experience.

# Directory Tree
```
/data/chats/pa09bd/workspace
+-- PolyCzar_class_diagram.mermaid
+-- PolyCzar_sequence_diagram.mermaid
+-- PolyCzar_system_design.md
+-- code.ipynb
+-- options_pricing_model_recommendations.md
+-- react_template
|   +-- PolyCzar_class_diagram.mermaid
|   +-- PolyCzar_sequence_diagram.mermaid
|   +-- PolyCzar_system_design.md
|   +-- README.md
|   +-- WIKI.md
|   +-- eslint.config.js
|   +-- index.html
|   +-- package.json
|   +-- polymarket-options.tar.gz
|   +-- postcss.config.js
|   +-- public
|   |   +-- assets
|   |   |   +-- images
|   |   +-- data
|   |   |   +-- example.json
|   |   +-- manifest.json
|   +-- src
|   |   +-- App.jsx
|   |   +-- AppRouter.jsx
|   |   +-- components
|   |   |   +-- Auth.jsx
|   |   |   +-- Dashboard.jsx
|   |   |   +-- DateSelector.jsx
|   |   |   +-- LiquidityModal.jsx
|   |   |   +-- MetricsDashboard.jsx
|   |   |   +-- OptionChain.jsx
|   |   |   +-- PolymarketEmbed.jsx
|   |   |   +-- PricingVisualizer.jsx
|   |   |   +-- TradeModal.jsx
|   |   |   +-- UrlInput.jsx
|   |   |   +-- WalletConnect.jsx
|   |   +-- index.css
|   |   +-- main.jsx
|   |   +-- routes.jsx
|   |   +-- utils
|   |       +-- amm.js
|   |       +-- calculations.js
|   |       +-- historicalData.js
|   |       +-- marketMonitor.js
|   |       +-- marketUpdater.js
|   |       +-- optionsPricing.js
|   |       +-- orderBook.js
|   |       +-- polymarket.js
|   |       +-- pricingModels.js
|   |       +-- pricingOptimization.js
|   |       +-- supabase.js
|   |       +-- volatility.js
|   |       +-- wallet.js
|   +-- tailwind.config.js
|   +-- template_config.json
|   +-- vite.config.js
+-- uploads
    +-- IMG_2967.PNG
    +-- IMG_2968.PNG
    +-- IMG_2969.PNG
    +-- IMG_2970.PNG
    +-- IMG_2972.PNG
    +-- IMG_2973.PNG
    +-- IMG_2974.PNG
    +-- image (1).png
    +-- image (2).png
    +-- image (3).png
    +-- image (4).png
    +-- image (5).png
    +-- image (6).png
    +-- image (7).png
    +-- image.png
    +-- optionschains
        +-- 1.png
        +-- _metadata
        |   +-- verified_contents.json
        +-- assets
        |   +-- index-2957uY7N.js
        |   +-- index-AiSykz0q.css
        +-- background.js
        +-- content_script.js
        +-- index.html
        +-- manifest.json
```

# File Description Inventory
- **public/manifest.json**: Configuration file for the Chrome extension.
- **src/App.jsx**: Main application component responsible for managing overall state and rendering.
- **src/AppRouter.jsx**: Manages routing for the application, including protected routes.
- **src/components/Auth.jsx**: User interface component for authentication (sign in, sign up, profile management).
- **src/components/Dashboard.jsx**: Protected component that displays user-specific dashboard information.
- **src/components/OptionChain.jsx**: Displays options related to the selected Polymarket market.
- **src/components/DateSelector.jsx**: Allows users to select expiration dates for options.
- **src/components/TradeModal.jsx**: Interface for reviewing and submitting trade orders, supporting both AMM and Order Book execution methods.
- **src/components/LiquidityModal.jsx**: Interface for adding or removing liquidity in the market.
- **src/utils/wallet.js**: Manages wallet connection and blockchain interactions.
- **src/utils/amm.js**: Implements automated market maker (AMM) pricing and liquidity management.
- **src/utils/orderBook.js**: Manages the order book functionality for options trading, supporting bids and asks.
- **src/utils/polymarket.js**: Handles market data fetching and management of Polymarket URLs.

# Technology Stack
- **React**: JavaScript library for building user interfaces.
- **Vite**: Build tool that enhances development speed and workflow.
- **Tailwind CSS**: Utility-first CSS framework for styling the application.
- **Chart.js & React-Chartjs-2**: Libraries used for data visualization.
- **ES6 Modules**: JavaScript module system employed for code organization.
- **Clerk**: Authentication service for secure user sign-ins and profile management.
- **Supabase**: Backend as a Service providing database and authentication services.

# Usage
To get started with the Polymarket Options Chain Chrome Extension, follow these steps:

1. **Installation**:
   - Download the extension files by cloning the repository or downloading the ZIP file.
   - Navigate to the root directory of the project.

2. **Development Setup**:
   - Install dependencies by running `pnpm install` in the project directory.
   - Start the development server by running `pnpm run dev`.
   - Build the project for production by running `pnpm run build`.

3. **Using the Extension**:
   - Enter a Polymarket event URL in the URL input field to load the relevant market data.
   - View the available options, pricing, and analytics through the Option Chain.
   - Use the Trade Modal to execute trades based on the options data presented.
   - Access the Dashboard for personalized insights and preferences.


# INSTRUCTION
- Project Path:`/data/chats/pa09bd/workspace/react_template`
- You can search for the file path in the 'Directory Tree';
- After modifying the project files, if this project can be previewed, then you need to reinstall dependencies, restart service and preview;
