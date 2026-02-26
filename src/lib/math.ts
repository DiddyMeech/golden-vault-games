import Decimal from "decimal.js";

Decimal.set({ rounding: Decimal.ROUND_DOWN });

/**
 * Calculates a payout by multiplying the bet amount by the multiplier,
 * rounding down to 8 decimal places (0.00000001).
 * @param betAmount - The amount wagered
 * @param multiplier - The payout multiplier
 * @returns The final calculated payout
 */
export function calcPayout(betAmount: number, multiplier: number): number {
  const bet = new Decimal(betAmount);
  const mult = new Decimal(multiplier);
  // Multiply and round down to 8 decimal places
  const result = bet.mul(mult).toDecimalPlaces(8, Decimal.ROUND_DOWN);
  return result.toNumber();
}

/**
 * Ensures floating point addition doesn't have 0.1+0.2 artifacts.
 */
export function addSats(a: number, b: number): number {
  return new Decimal(a).plus(new Decimal(b)).toDecimalPlaces(8).toNumber();
}

/**
 * Ensures floating point subtraction doesn't have precision issues.
 */
export function subSats(a: number, b: number): number {
  return new Decimal(a).minus(new Decimal(b)).toDecimalPlaces(8).toNumber();
}
