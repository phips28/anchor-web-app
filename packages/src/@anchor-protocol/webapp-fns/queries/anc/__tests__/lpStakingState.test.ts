import { defaultMantleFetch } from '@terra-money/webapp-fns';
import { TEST_ADDRESSES, TEST_MANTLE_ENDPOINT } from '../../../test-env';
import { ancLpStakingStateQuery } from '../lpStakingState';

describe('queries/lpStakingState', () => {
  test('should get result from query', async () => {
    const { lpStakingState } = await ancLpStakingStateQuery({
      mantleFetch: defaultMantleFetch,
      mantleEndpoint: TEST_MANTLE_ENDPOINT,
      variables: {
        ancStakingContract: TEST_ADDRESSES.anchorToken.staking,
        lpStakingStateQuery: {
          state: {},
        },
      },
    });

    expect(typeof lpStakingState?.total_bond_amount).toBe('string');
  });
});
