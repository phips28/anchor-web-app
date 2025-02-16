import { DateTime, Num } from '@anchor-protocol/types';
import { MantleFetch } from '@terra-money/webapp-fns';

export interface RewardsAnchorLpRewardsData {
  anchorLpRewards: Array<{
    APY: Num;
    Height: number;
    Timestamp: DateTime;
  }>;
}

// language=graphql
export const REWARDS_ANCHOR_LP_REWARDS_QUERY = `
  query  {
    anchorLpRewards: AnchorLPRewards(Order: DESC, Limit: 1) {
      Height
      Timestamp
      APY
    }
  }
`;

export interface RewardsAnchorLpRewardsQueryParams {
  mantleEndpoint: string;
  mantleFetch: MantleFetch;
}

export async function rewardsAnchorLpRewardsQuery({
  mantleEndpoint,
  mantleFetch,
}: RewardsAnchorLpRewardsQueryParams): Promise<RewardsAnchorLpRewardsData> {
  return await mantleFetch<{}, RewardsAnchorLpRewardsData>(
    REWARDS_ANCHOR_LP_REWARDS_QUERY,
    {},
    `${mantleEndpoint}?rewards--anchor-lp-rewards`,
  );
}
