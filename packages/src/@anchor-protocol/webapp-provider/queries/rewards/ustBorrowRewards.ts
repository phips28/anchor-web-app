import { HumanAddr } from '@anchor-protocol/types';
import {
  RewardsUstBorrowRewardsData,
  rewardsUstBorrowRewardsQuery,
} from '@anchor-protocol/webapp-fns';
import { useBrowserInactive } from '@terra-dev/use-browser-inactive';
import {
  ConnectedWallet,
  useConnectedWallet,
} from '@terra-money/wallet-provider';
import {
  EMPTY_QUERY_RESULT,
  MantleFetch,
  useTerraWebapp,
} from '@terra-money/webapp-provider';
import { QueryFunctionContext, useQuery, UseQueryResult } from 'react-query';
import { useAnchorWebapp } from '../../contexts/context';
import { ANCHOR_QUERY_KEY } from '../../env';

const queryFn = ({
  queryKey: [, mantleEndpoint, mantleFetch, marketContract, connectedWallet],
}: QueryFunctionContext<
  [string, string, MantleFetch, HumanAddr, ConnectedWallet | undefined]
>) => {
  return !!connectedWallet
    ? rewardsUstBorrowRewardsQuery({
        mantleEndpoint,
        mantleFetch,
        variables: {
          marketContract,
          marketStateQuery: {
            state: {},
          },
          borrowerInfoQuery: {
            borrower_info: {
              borrower: connectedWallet.walletAddress,
            },
          },
        },
      })
    : Promise.resolve(undefined);
};

export function useRewardsUstBorrowRewardsQuery(): UseQueryResult<
  RewardsUstBorrowRewardsData | undefined
> {
  const { mantleFetch, mantleEndpoint, queryErrorReporter } = useTerraWebapp();

  const connectedWallet = useConnectedWallet();

  const {
    contractAddress: { moneyMarket },
  } = useAnchorWebapp();

  const { browserInactive } = useBrowserInactive();

  const result = useQuery(
    [
      ANCHOR_QUERY_KEY.REWARDS_UST_BORROW_REWARDS,
      mantleEndpoint,
      mantleFetch,
      moneyMarket.market,
      connectedWallet,
    ],
    queryFn,
    {
      refetchInterval: browserInactive && 1000 * 60 * 5,
      enabled: !browserInactive && !!connectedWallet,
      keepPreviousData: true,
      onError: queryErrorReporter,
    },
  );

  return connectedWallet ? result : EMPTY_QUERY_RESULT;
}
