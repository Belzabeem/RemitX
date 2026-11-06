/**
 * Fee helpers. The 10% resource-fee buffer on Soroban simulations is the approach
 * used by StellarStream's fee calculator: simulation results are estimates, and a
 * transaction that under-pays its resource fee fails.
 */
export interface RawFeeData {
  minResourceFee: number; // stroops, from the RPC simulation
  inclusionFee: number; // stroops, base fee for the transaction
}

export interface BufferedFees {
  inclusionFeeStroops: number;
  resourceFeeStroops: number;
  totalFeeStroops: number;
}

export const RESOURCE_FEE_BUFFER = 1.1;

export function applyBuffer(raw: RawFeeData): BufferedFees {
  const inclusionFeeStroops = Math.max(0, Math.trunc(raw.inclusionFee));
  const resourceFeeStroops = Math.max(0, Math.ceil(raw.minResourceFee * RESOURCE_FEE_BUFFER));
  return {
    inclusionFeeStroops,
    resourceFeeStroops,
    totalFeeStroops: inclusionFeeStroops + resourceFeeStroops,
  };
}

export const STROOPS_PER_XLM = 10_000_000;

export function stroopsToXlm(stroops: number): string {
  return (stroops / STROOPS_PER_XLM).toFixed(7);
}
