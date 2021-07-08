import {
  demicrofy,
  formatANCWithPostfixUnits,
  formatUST,
} from '@anchor-protocol/notation';
import { uANC } from '@anchor-protocol/types';
import { useConnectedWallet } from '@terra-money/wallet-provider';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import { useBank } from 'base/contexts/bank';
import big, { Big } from 'big.js';
import { MessageBox } from 'components/MessageBox';
import { TxFeeList, TxFeeListItem } from 'components/TxFeeList';
import { validateTxFee } from 'logics/validateTxFee';
import { MINIMUM_CLAIM_BALANCE } from 'pages/gov/env';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useEventBus, useEventBusListener } from '@terra-dev/event-bus';
import {
  useAnchorWebapp,
  useRewardsAllClaimTx,
  useRewardsClaimableAncUstLpRewardsQuery,
  useRewardsClaimableUstBorrowRewardsQuery,
} from '@anchor-protocol/webapp-provider';
import { TxResultRenderer } from '../../../components/TxResultRenderer';
import { StreamStatus } from '@rx-stream/react';

export interface ClaimAllComponentProps {
  className?: string;
}

function ClaimAllComponentBase({ className }: ClaimAllComponentProps) {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const connectedWallet = useConnectedWallet();

  const {
    constants: { fixedGas },
  } = useAnchorWebapp();
  const { dispatch } = useEventBus();

  const [claim, claimResult] = useRewardsAllClaimTx();

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const bank = useBank();

  const { data: { borrowerInfo, userANCBalance } = {} } =
    useRewardsClaimableUstBorrowRewardsQuery();

  const { data: { lPStakerInfo: userLPStakingInfo } = {} } =
    useRewardsClaimableAncUstLpRewardsQuery();

  // ---------------------------------------------
  // logics
  // ---------------------------------------------

  useEventBusListener('auto-claim-all', async () => {
    if (
      connectedWallet &&
      claimingBorrowerInfoPendingRewards &&
      claimingLpStaingInfoPendingRewards
    ) {
      await proceed(
        claimingBorrowerInfoPendingRewards.gte(MINIMUM_CLAIM_BALANCE),
        claimingLpStaingInfoPendingRewards.gte(MINIMUM_CLAIM_BALANCE),
      );
    }
  });

  // send event after finished
  useMemo(() => {
    // console.log('ClaimAll: status changed', claimResult);
    switch (claimResult?.status) {
      case StreamStatus.DONE:
        dispatch('claim-all-done');
        break;
      case StreamStatus.ERROR:
        dispatch('claim-all-fault');
        break;
    }
  }, [claimResult, dispatch]);

  const claimingBorrowerInfoPendingRewards = useMemo(() => {
    if (!borrowerInfo) return undefined;
    return big(borrowerInfo.pending_rewards) as uANC<Big>;
  }, [borrowerInfo]);

  const claimingLpStaingInfoPendingRewards = useMemo(() => {
    if (!userLPStakingInfo) return undefined;
    return big(userLPStakingInfo.pending_reward) as uANC<Big>;
  }, [userLPStakingInfo]);

  const claiming = useMemo(() => {
    if (
      !claimingBorrowerInfoPendingRewards ||
      !claimingLpStaingInfoPendingRewards
    ) {
      return undefined;
    }

    return claimingLpStaingInfoPendingRewards.plus(
      claimingBorrowerInfoPendingRewards,
    ) as uANC<Big>;
  }, [claimingBorrowerInfoPendingRewards, claimingLpStaingInfoPendingRewards]);

  const ancAfterTx = useMemo(() => {
    if (!claiming || !userANCBalance) return undefined;
    return claiming.plus(userANCBalance.balance) as uANC<Big>;
  }, [claiming, userANCBalance]);

  const invalidTxFee = useMemo(
    () => !!connectedWallet && validateTxFee(bank, fixedGas),
    [bank, fixedGas, connectedWallet],
  );

  const proceed = useCallback(
    (claimMoneyMarketRewards: boolean, cliamLpStakingRewards: boolean) => {
      if (!connectedWallet || !claim) {
        return;
      }

      claim({
        claimAncUstLp: cliamLpStakingRewards,
        claimUstBorrow: claimMoneyMarketRewards,
      });
    },
    [claim, connectedWallet],
  );

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  if (
    claimResult?.status === StreamStatus.IN_PROGRESS ||
    claimResult?.status === StreamStatus.DONE
  ) {
    const onExit = () => {};

    return (
      <Section className={className}>
        <TxResultRenderer resultRendering={claimResult.value} onExit={onExit} />
      </Section>
    );
  }

  return (
    <Section className={className}>
      <h1>1. Claim All Rewards</h1>

      {!!invalidTxFee && <MessageBox>{invalidTxFee}</MessageBox>}

      <TxFeeList className="receipt">
        <TxFeeListItem label="Claiming">
          {claiming ? formatANCWithPostfixUnits(demicrofy(claiming)) : 0} ANC
        </TxFeeListItem>
        <TxFeeListItem label="ANC After Tx">
          {ancAfterTx ? formatANCWithPostfixUnits(demicrofy(ancAfterTx)) : 0}{' '}
          ANC
        </TxFeeListItem>
        <TxFeeListItem label="Tx Fee">
          {formatUST(demicrofy(fixedGas))} UST
        </TxFeeListItem>
      </TxFeeList>

      <ActionButton
        className="proceed"
        disabled={
          !connectedWallet ||
          !connectedWallet.availablePost ||
          !claim ||
          !claimingLpStaingInfoPendingRewards ||
          !claimingBorrowerInfoPendingRewards ||
          !claiming ||
          (claimingBorrowerInfoPendingRewards.lt(MINIMUM_CLAIM_BALANCE) &&
            claimingLpStaingInfoPendingRewards.lt(MINIMUM_CLAIM_BALANCE))
        }
        onClick={() =>
          claimingBorrowerInfoPendingRewards &&
          claimingLpStaingInfoPendingRewards &&
          proceed(
            claimingBorrowerInfoPendingRewards.gte(MINIMUM_CLAIM_BALANCE),
            claimingLpStaingInfoPendingRewards.gte(MINIMUM_CLAIM_BALANCE),
          )
        }
      >
        Claim
      </ActionButton>
    </Section>
  );
}

export const ClaimAllComponent = styled(ClaimAllComponentBase)`
  h1 {
    font-size: 27px;
    text-align: center;
    font-weight: 300;

    margin-bottom: 50px;
  }

  .receipt {
    margin-top: 30px;
  }

  .proceed {
    margin-top: 40px;

    width: 100%;
    height: 60px;
  }
`;
