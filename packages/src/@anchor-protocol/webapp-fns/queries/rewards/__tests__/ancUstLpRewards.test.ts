import { defaultMantleFetch } from '@terra-money/webapp-fns';
import {
  TEST_ADDRESSES,
  TEST_MANTLE_ENDPOINT,
  TEST_WALLET_ADDRESS,
} from '../../../test-env';
import { rewardsAncUstLpRewardsQuery } from '../ancUstLpRewards';

describe('queries/rewardsAncUstLp', () => {
  test('should get result from query', async () => {
    const {
      userLPBalance,
      userLPStakingInfo,
    } = await rewardsAncUstLpRewardsQuery({
      mantleFetch: defaultMantleFetch,
      mantleEndpoint: TEST_MANTLE_ENDPOINT,
      variables: {
        ancUstLpContract: TEST_ADDRESSES.cw20.AncUstLP,
        stakingContract: TEST_ADDRESSES.anchorToken.staking,
        ancUstLpBalanceQuery: {
          balance: {
            address: TEST_WALLET_ADDRESS,
          },
        },
        lpStakerInfoQuery: {
          staker_info: {
            staker: TEST_WALLET_ADDRESS,
          },
        },
      },
    });

    expect(typeof userLPBalance?.balance).toBe('string');
    expect(typeof userLPStakingInfo?.bond_amount).toBe('string');
  });
});
