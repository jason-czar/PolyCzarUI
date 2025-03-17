# AMM-Based Options Pricing Report

## Executive Summary

This report documents the analysis and implementation of an Automated Market Maker (AMM) based options pricing model for the Polymarket Options Chain Extension. The implementation replaces the traditional Black-Scholes model with a market-driven pricing mechanism that uses constant product formulas adapted specifically for binary options.

## Table of Contents

1. [Introduction](#introduction)
2. [Current Pricing Mechanism Analysis](#current-pricing-mechanism-analysis)
3. [AMM Fundamentals](#amm-fundamentals)
4. [Adapted AMM Model for Options](#adapted-amm-model-for-options)
5. [Mathematical Framework](#mathematical-framework)
6. [Implementation Details](#implementation-details)
7. [Comparison with Traditional Models](#comparison-with-traditional-models)
8. [Integration Guidelines](#integration-guidelines)
9. [Conclusion](#conclusion)

## Introduction

Traditional options pricing models like Black-Scholes are based on theoretical assumptions that may not hold in decentralized finance contexts. Automated Market Makers (AMMs) offer an alternative approach that relies on market forces and liquidity pools to determine prices. This report details the implementation of an AMM-based options pricing model specifically designed for binary options trading on the Polymarket platform.

## Current Pricing Mechanism Analysis

The existing options pricing implementation in the Polymarket Options Chain Extension uses:

1. **Modified Black-Scholes for Binary Options**:
   - For call options: `e^(-rT) * N(d2)`
   - For put options: `e^(-rT) * N(-d2)`
   - Where d2 = (ln(S/K) + (r - σ²/2)T) / (σ√T)

2. **Binomial Model for Short-Term Options**:
   - Used for options with less than 7 days to expiry
   - Uses backward induction through a binomial tree

3. **Basic AMM Features**:
   - Simple liquidity adjustments to spreads
   - Basic price impact calculations
   - Lacks true constant product mechanics

4. **Supporting Components**:
   - Volatility service for calculating implied volatility
   - Order book implementation for direct trading
   - Unified liquidity pool mechanism

Limitations of the current approach include:
- Centralized pricing not driven by market forces
- Limited liquidity dynamics
- No proper impermanent loss calculations
- Lack of true AMM functionality

## AMM Fundamentals

Automated Market Makers use mathematical formulas instead of order books to determine asset prices. The core principles include:

1. **Constant Product Formula**: `x * y = k`
   - x: Quantity of asset X
   - y: Quantity of asset Y
   - k: Constant product (invariant)

2. **Pricing Mechanism**: Price is determined by the ratio of assets in the pool
   - Price of X in terms of Y: `y / x`

3. **Trade Impact**: Trades change the ratio and thus the price
   - Adding amount Δy of asset Y:
   - New amount of X: `x_new = k / (y + Δy)`
   - Price impact: `(y + Δy) / x_new - y / x`

4. **Liquidity Provider Mechanism**:
   - LPs contribute pairs of assets to the pool
   - Receive pool tokens representing their share
   - Earn fees from trades

## Adapted AMM Model for Options

For binary options, we adapt the AMM model to handle the unique characteristics of options contracts:

1. **Binary Option Pools**:
   - Pools contain YES tokens and NO tokens (representing outcomes)
   - Price represents market's assessment of probability

2. **Modified Formula for Options**:
   - `(x + α(t, σ)) * (y + β(p, K)) = k`
   - α(t, σ): Time and volatility adjustment function
   - β(p, K): Price and strike adjustment function
   - t: Time to expiry
   - σ: Implied volatility
   - p: Current probability
   - K: Strike price

3. **Time Decay Handling**:
   - As expiry approaches, adjustment factors change
   - Higher certainty near expiry means smaller price adjustments

4. **Volatility Integration**:
   - Higher implied volatility leads to wider spreads
   - Acts as a risk factor in the price calculation

## Mathematical Framework

### Pool Initialization

For a binary option with initial estimated probability p, the pool is initialized with:

- YES tokens = L * (1-p)
- NO tokens = L * p

Where L is the initial liquidity amount.

### Price Calculation

The current implied probability (price) is calculated as:

```
Price = NO tokens / (YES tokens + NO tokens)
```

With adjustments for time decay and volatility:

```
Adjusted Price = Base Price * Time Adjustment * Volatility Adjustment
```

### Trade Execution

When a trader buys YES tokens (betting on the outcome being true):

1. They add NO tokens (stable tokens) to the pool
2. The amount of YES tokens to receive is calculated using the constant product formula:
   ```
   new_no_tokens = no_tokens + amount_minus_fee
   new_yes_tokens = k / new_no_tokens
   tokens_received = yes_tokens - new_yes_tokens
   ```

3. Price impact is calculated as:
   ```
   price_before = no_tokens / (yes_tokens + no_tokens)
   price_after = new_no_tokens / (new_yes_tokens + new_no_tokens)
   price_impact = (price_after - price_before) / price_before
   ```

### Impermanent Loss Calculation

For options, impermanent loss includes the standard AMM IL formula plus a time decay component:

```
Standard IL = 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
Time Decay Impact = (1 - time_to_expiry) * time_decay_factor * abs(IL)
Total IL = abs(Standard IL) + Time Decay Impact
```

## Implementation Details

The implementation consists of two main classes:

1. **AMMOptionsPricingModel**: Core mathematical implementation
   - Handles pool initialization
   - Calculates prices using constant product formula
   - Executes trades with slippage protection
   - Manages liquidity addition and removal
   - Calculates impermanent loss with time decay adjustments

2. **AMM_OptionsPricing**: Interface class for system integration
   - Manages multiple option pools
   - Interfaces with volatility service
   - Provides public methods for pricing and trading
   - Handles liquidity provider tracking

### Key Methods

- `initializePool`: Creates a new AMM pool for an option
- `calculatePrice`: Determines current option price using pool state
- `executeTrade`: Simulates and executes a trade with slippage checks
- `addLiquidity`: Adds funds to a pool while maintaining price
- `removeLiquidity`: Withdraws funds proportionally
- `calculateImpermanentLoss`: Computes IL with options-specific adjustments

### Configuration Parameters

- `baseFee`: Trading fee percentage (default: 0.3%)
- `maxSlippage`: Maximum allowed price impact (default: 10%)
- `timeDecayFactor`: Impact of time decay on pricing (default: 0.8)
- `volAdjustmentFactor`: Volatility's effect on price range (default: 0.5)

## Comparison with Traditional Models

| Feature | Traditional Black-Scholes | AMM-Based Pricing |
|---------|---------------------------|----------------|
| Price discovery | Model-based calculation | Market-driven with model initialization |
| Liquidity | Depends on market makers | Self-sustaining through pools |
| Spreads | Set by market makers | Determined by pool size and volatility |
| Volatility | Input parameter | Emergent from trading activity |
| Time decay | Calculated by formula | Adjusted through pool parameters |
| Risk management | Delta hedging | Impermanent loss consideration |

### Advantages of AMM-Based Approach

1. **Market-Driven Pricing**: Prices reflect actual supply and demand rather than theoretical models
2. **Continuous Liquidity**: Trading available 24/7 without reliance on market makers
3. **Transparency**: All pricing parameters visible on-chain
4. **Capital Efficiency**: Unified liquidity across multiple options
5. **Reduced Manipulation Risk**: Harder to manipulate than traditional order books

### Considerations

1. **Impermanent Loss**: LPs must understand the unique IL characteristics of options
2. **Initial Parameters**: Proper initialization is crucial for fair starting prices
3. **Slippage on Large Trades**: Large trades can cause significant price impact
4. **Time Decay Management**: Special handling needed as options approach expiry

## Integration Guidelines

To integrate the new AMM-based options pricing model into the existing system:

1. **Replace References**:
   - Update amm.js to use ammOptionsPricing instead of optionsPricingEngine
   - Ensure proper importing of the new module

2. **Update Trade Modal**:
   - Modify TradeModal.jsx to fetch prices from AMM pools
   - Update trade execution to use the new AMM methods

3. **Enhance Liquidity Pool Interface**:
   - Update LiquidityPool.jsx to display AMM-specific metrics
   - Add impermanent loss calculator for liquidity providers

4. **Update Order Book Integration**:
   - Modify orderBookInstance.getBestExecutionVenue() to properly compare AMM prices

5. **Testing Considerations**:
   - Test with various market conditions
   - Verify proper handling of extreme cases (near expiry, high volatility)
   - Benchmark against Black-Scholes for consistency checks

## Conclusion

The AMM-based options pricing model represents a significant evolution from traditional model-based approaches. By implementing true constant product mechanics with options-specific adjustments, we create a market-driven pricing system that provides continuous liquidity while handling the unique characteristics of binary options.

The implementation balances mathematical rigor with practical considerations, offering a robust solution that can evolve with market needs. The model maintains compatibility with the existing system while introducing enhanced functionality for both traders and liquidity providers.

The provided `optionsPricingModel.js` file contains a complete implementation ready for integration into the Polymarket Options Chain Extension.

---

## Appendix: Implementation Location

The complete implementation can be found at:
`/data/chats/pa09bd/workspace/react_template/src/utils/optionsPricingModel.js`