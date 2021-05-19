import { anchorToken, WASMContractResult } from '@anchor-protocol/types';
import { gql, useQuery } from '@apollo/client';
import { useSubscription } from '@terra-dev/broadcastable-operation';
import { createMap, useMap } from '@terra-dev/use-map';
import { useContractAddress } from 'base/contexts/contract';
import { parseResult } from 'base/queries/parseResult';
import { MappedQueryResult } from 'base/queries/types';
import { useQueryErrorHandler } from 'base/queries/useQueryErrorHandler';
import { useRefetch } from 'base/queries/useRefetch';
import { useMemo } from 'react';

export interface RawData {
  poll: WASMContractResult;
}

export interface Data {
  poll: WASMContractResult<anchorToken.gov.PollResponse>;
}

export const dataMap = createMap<RawData, Data>({
  poll: (existing, { poll }) => {
    return parseResult(existing.poll, poll.Result);
  },
});

export interface RawVariables {
  govContract: string;
  pollQuery: string;
}

export interface Variables {
  govContract: string;
  pollQuery: anchorToken.gov.Poll;
}

export function mapVariables({
  govContract,
  pollQuery,
}: Variables): RawVariables {
  return {
    govContract,
    pollQuery: JSON.stringify(pollQuery),
  };
}

export const query = gql`
  query __poll($govContract: String!, $pollQuery: String!) {
    poll: WasmContractsContractAddressStore(
      ContractAddress: $govContract
      QueryMsg: $pollQuery
    ) {
      Result
    }
  }
`;

export function usePoll(
  pollId: number,
): MappedQueryResult<RawVariables, RawData, Data> {
  const { anchorToken } = useContractAddress();

  const variables = useMemo(() => {
    return mapVariables({
      govContract: anchorToken.gov,
      pollQuery: {
        poll: {
          poll_id: pollId,
        },
      },
    });
  }, [anchorToken.gov, pollId]);

  const onError = useQueryErrorHandler();

  const {
    previousData,
    data: _data = previousData,
    refetch: _refetch,
    error,
    ...result
  } = useQuery<RawData, RawVariables>(query, {
    fetchPolicy: 'network-only',
    nextFetchPolicy: 'cache-first',
    //pollInterval: 1000 * 60 * 10,
    variables,
    onError,
  });

  useSubscription((id, event) => {
    if (event === 'done') {
      _refetch();
    }
  });

  const data = useMap(_data, dataMap);
  const refetch = useRefetch(_refetch, dataMap);

  return {
    ...result,
    data,
    refetch,
  };
}
