import { cw20, uANC, WASMContractResult } from '@anchor-protocol/types';
import { gql, useQuery } from '@apollo/client';
import { createMap, useMap } from '@terra-dev/use-map';
import { useContractAddress } from 'base/contexts/contract';
import { parseResult } from 'base/queries/parseResult';
import { MappedQueryResult } from 'base/queries/types';
import { useQueryErrorHandler } from 'base/queries/useQueryErrorHandler';
import { useRefetch } from 'base/queries/useRefetch';
import { useMemo } from 'react';

export interface RawData {
  communityAncBalance: WASMContractResult;
}

export interface Data {
  communityAncBalance: WASMContractResult<cw20.BalanceResponse<uANC>>;
}

export const dataMap = createMap<RawData, Data>({
  communityAncBalance: (existing, { communityAncBalance }) => {
    return parseResult(
      existing.communityAncBalance,
      communityAncBalance.Result,
    );
  },
});

export interface RawVariables {
  ANCTokenContract: string;
  CommunityANCBalanceQuery: string;
}

export interface Variables {
  ANCTokenContract: string;
  communityAddress: string;
}

export function mapVariables({
  ANCTokenContract,
  communityAddress,
}: Variables): RawVariables {
  return {
    ANCTokenContract,
    CommunityANCBalanceQuery: JSON.stringify({
      balance: {
        address: communityAddress,
      },
    }),
  };
}

export const query = gql`
  query __communityAncBalance(
    $ANCTokenContract: String!
    $CommunityANCBalanceQuery: String!
  ) {
    communityAncBalance: WasmContractsContractAddressStore(
      ContractAddress: $ANCTokenContract
      QueryMsg: $CommunityANCBalanceQuery
    ) {
      Result
    }
  }
`;

export function useCommunityAncBalance(): MappedQueryResult<
  RawVariables,
  RawData,
  Data
> {
  const address = useContractAddress();

  const variables = useMemo(() => {
    return mapVariables({
      ANCTokenContract: address.cw20.ANC,
      communityAddress: address.anchorToken.community,
    });
  }, [address.anchorToken.community, address.cw20.ANC]);

  const onError = useQueryErrorHandler();

  const { data: _data, refetch: _refetch, error, ...result } = useQuery<
    RawData,
    RawVariables
  >(query, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    //pollInterval: 1000 * 60 * 10,
    variables,
    onError,
  });

  const data = useMap(_data, dataMap);
  const refetch = useRefetch(_refetch, dataMap);

  return {
    ...result,
    data,
    refetch,
  };
}
