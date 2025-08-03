
import { Tier } from './types';

export const TIER_RANKS: Tier[] = [
  { name: 'S+', color: 'bg-purple-600' },
  { name: 'S', color: 'bg-amber-400' },
  { name: 'A', color: 'bg-green-700' },
  { name: 'B', color: 'bg-yellow-300', textColor: 'text-black' },
  { name: 'D', color: 'bg-amber-500' },
  { name: 'F', color: 'bg-red-600' },
];

export const UNRANKED_POOL_ID = 'unranked-pool';