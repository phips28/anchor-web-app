import {
  ANC_INPUT_MAXIMUM_DECIMAL_POINTS,
  ANC_INPUT_MAXIMUM_INTEGER_POINTS,
  demicrofy,
  formatLP,
  formatLPInput,
  formatUST,
  microfy,
} from '@anchor-protocol/notation';
import { AncUstLP } from '@anchor-protocol/types';
import {
  useConnectedWallet,
  WalletReady,
} from '@anchor-protocol/wallet-provider';
import { InputAdornment } from '@material-ui/core';
import { useOperation } from '@terra-dev/broadcastable-operation';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { NumberInput } from '@terra-dev/neumorphism-ui/components/NumberInput';
import { useBank } from 'base/contexts/bank';
import { useConstants } from 'base/contexts/contants';
import big from 'big.js';
import { MessageBox } from 'components/MessageBox';
import { TransactionRenderer } from 'components/TransactionRenderer';
import { TxFeeList, TxFeeListItem } from 'components/TxFeeList';
import { validateTxFee } from 'logics/validateTxFee';
import { useRewardsAncUstLp } from 'pages/gov/queries/rewardsAncUstLp';
import { ancUstLpStakeOptions } from 'pages/gov/transactions/ancUstLpStakeOptions';
import React, { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { useEventBus, useEventBusListener } from '@terra-dev/event-bus';

export function AncUstLpStake() {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const connectedWallet = useConnectedWallet();

  const { dispatch } = useEventBus();
  const { fixedGas } = useConstants();

  const [stake, stakeResult] = useOperation(ancUstLpStakeOptions, {});

  // ---------------------------------------------
  // states
  // ---------------------------------------------
  const [lpAmount, setLpAmount] = useState<AncUstLP>('' as AncUstLP);

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const bank = useBank();

  const {
    data: { userLPBalance },
  } = useRewardsAncUstLp();

  // ---------------------------------------------
  // logics x external
  // ---------------------------------------------
  useEventBusListener('auto-stake-lp', async () => {
    if (!userLPBalance) {
      dispatch('stake-lp-error');
      alert('Stake LP: Not LP tokens');
      return;
    }
    const useLpAmount = formatLPInput(demicrofy(userLPBalance.balance));
    setLpAmount(useLpAmount);

    if (connectedWallet) {
      await proceed(connectedWallet, useLpAmount);
    } else {
      dispatch('stake-lp-error');
      alert('Stake LP: Wallet not connected');
      return;
    }
  });

  // send event after finished
  useMemo(() => {
    // console.log('AncUstLpStale: status changed', stakeResult);
    switch (stakeResult?.status) {
      case 'done':
        dispatch('stake-lp-done');
        break;
      case 'fault':
        dispatch('stake-lp-fault');
        break;
    }
  }, [stakeResult, dispatch]);

  // ---------------------------------------------
  // logics
  // ---------------------------------------------
  const invalidTxFee = useMemo(
    () => !!connectedWallet && validateTxFee(bank, fixedGas),
    [bank, fixedGas, connectedWallet],
  );

  const invalidLpAmount = useMemo(() => {
    if (lpAmount.length === 0 || !userLPBalance) return undefined;

    return big(microfy(lpAmount)).gt(userLPBalance.balance)
      ? 'Not enough assets'
      : undefined;
  }, [lpAmount, userLPBalance]);

  const init = useCallback(() => {
    setLpAmount('' as AncUstLP);
  }, []);

  const proceed = useCallback(
    async (walletReady: WalletReady, lpAmount: AncUstLP) => {
      const broadcasted = await stake({
        address: walletReady.walletAddress,
        amount: lpAmount,
      });

      if (!broadcasted) {
        init();
      }
    },
    [init, stake],
  );

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  if (
    stakeResult?.status === 'in-progress' ||
    stakeResult?.status === 'done' ||
    stakeResult?.status === 'fault'
  ) {
    return <TransactionRenderer result={stakeResult} onExit={init} />;
  }

  return (
    <>
      {!!invalidTxFee && <MessageBox>{invalidTxFee}</MessageBox>}

      <NumberInput
        className="amount"
        value={lpAmount}
        maxIntegerPoinsts={ANC_INPUT_MAXIMUM_INTEGER_POINTS}
        maxDecimalPoints={ANC_INPUT_MAXIMUM_DECIMAL_POINTS}
        error={!!invalidLpAmount}
        placeholder="0.00"
        onChange={({ target }: ChangeEvent<HTMLInputElement>) =>
          setLpAmount(target.value as AncUstLP)
        }
        InputProps={{
          endAdornment: <InputAdornment position="end">LP</InputAdornment>,
        }}
      />

      <div className="wallet" aria-invalid={!!invalidLpAmount}>
        <span>{invalidLpAmount}</span>
        <span>
          Balance:{' '}
          <span
            style={{
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
            onClick={() =>
              userLPBalance &&
              setLpAmount(formatLPInput(demicrofy(userLPBalance.balance)))
            }
          >
            {userLPBalance ? formatLP(demicrofy(userLPBalance.balance)) : 0} LP
          </span>
        </span>
      </div>

      {lpAmount.length > 0 && (
        <TxFeeList className="receipt">
          <TxFeeListItem label="Tx Fee">
            {formatUST(demicrofy(fixedGas))} UST
          </TxFeeListItem>
        </TxFeeList>
      )}

      {/* Submit */}
      <ActionButton
        className="submit"
        disabled={
          !connectedWallet ||
          lpAmount.length === 0 ||
          big(lpAmount).lte(0) ||
          !!invalidTxFee ||
          !!invalidLpAmount
        }
        onClick={() => connectedWallet && proceed(connectedWallet, lpAmount)}
      >
        Stake
      </ActionButton>
    </>
  );
}
