// calculations.js
export const calculateBreakeven = (option, isCall) => {
  const strike = Number(option.strike);
  const price = Number(option.price);
  if (isCall) {
    return (strike + price * 100).toFixed(1);
  }
  return (strike - price * 100).toFixed(1);
};

export const calculateProfitChance = (option, isCall) => {
  // Simplified calculation for demo
  const strikeDistance = Math.abs(option.strike - option.currentPrice);
  const baseChance = isCall ? 75 - (strikeDistance * 2) : 65 - (strikeDistance * 2);
  return Math.max(Math.min(baseChance, 95), 30).toFixed(2);
};

export const calculateGreeks = (option) => {
  // Simplified greek calculations
  return {
    delta: (Math.random() * 0.5).toFixed(4),
    gamma: (Math.random() * 0.05).toFixed(4),
    theta: (-Math.random() * 0.3).toFixed(4),
    vega: (Math.random() * 0.1).toFixed(4),
    rho: (Math.random() * 0.02).toFixed(4)
  };
};