import {
  demicrofy,
  formatANCWithPostfixUnits,
  formatUST,
} from '@anchor-protocol/notation';
import { uANC } from '@anchor-protocol/types';
import {
  useConnectedWallet,
  WalletReady,
} from '@anchor-protocol/wallet-provider';
import { useOperation } from '@terra-dev/broadcastable-operation';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import { useBank } from 'base/contexts/bank';
import { useConstants } from 'base/contexts/contants';
import big, { Big } from 'big.js';
import { MessageBox } from 'components/MessageBox';
import { TransactionRenderer } from 'components/TransactionRenderer';
import { TxFeeList, TxFeeListItem } from 'components/TxFeeList';
import { validateTxFee } from 'logics/validateTxFee';
import { MINIMUM_CLAIM_BALANCE } from 'pages/gov/env';
import { useClaimableAncUstLp } from 'pages/gov/queries/claimableAncUstLp';
import { useClaimableUstBorrow } from 'pages/gov/queries/claimableUstBorrow';
import { allClaimOptions } from 'pages/gov/transactions/allClaimOptions';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useEventBus, useEventBusListener } from '@terra-dev/event-bus';

export interface ClaimAllComponentProps {
  className?: string;
}

function ClaimAllComponentBase({ className }: ClaimAllComponentProps) {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const connectedWallet = useConnectedWallet();

  const { fixedGas } = useConstants();
  const { dispatch } = useEventBus();

  const [claim, claimResult] = useOperation(allClaimOptions, {});

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const bank = useBank();

  const {
    data: { borrowerInfo, userANCBalance },
  } = useClaimableUstBorrow();

  const {
    data: { userLPStakingInfo },
  } = useClaimableAncUstLp();

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
        connectedWallet,
        claimingBorrowerInfoPendingRewards.gte(MINIMUM_CLAIM_BALANCE),
        claimingLpStaingInfoPendingRewards.gte(MINIMUM_CLAIM_BALANCE),
      );
    }
  });

  // send event after finished
  useMemo(() => {
    // console.log('ClaimAll: status changed', claimResult);
    switch (claimResult?.status) {
      case 'done':
        dispatch('claim-all-done');
        break;
      case 'fault':
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
    async (
      walletReady: WalletReady,
      claimMoneyMarketRewards: boolean,
      cliamLpStakingRewards: boolean,
    ) => {
      await claim({
        walletAddress: walletReady.walletAddress,
        cliamLpStakingRewards,
        claimMoneyMarketRewards,
      });
    },
    [claim],
  );

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  if (
    claimResult?.status === 'in-progress' ||
    claimResult?.status === 'done' ||
    claimResult?.status === 'fault'
  ) {
    const onExit = undefined;

    return (
      <Section className={className}>
        <TransactionRenderer result={claimResult} onExit={onExit} />
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
          !claimingLpStaingInfoPendingRewards ||
          !claimingBorrowerInfoPendingRewards ||
          !claiming ||
          (claimingBorrowerInfoPendingRewards.lt(MINIMUM_CLAIM_BALANCE) &&
            claimingLpStaingInfoPendingRewards.lt(MINIMUM_CLAIM_BALANCE))
        }
        onClick={() =>
          connectedWallet &&
          claimingBorrowerInfoPendingRewards &&
          claimingLpStaingInfoPendingRewards &&
          proceed(
            connectedWallet,
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
