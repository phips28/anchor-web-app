import {
  AddressProvider,
  fabricateTerraswapProvideLiquidityANC,
} from '@anchor-protocol/anchor.js';
import {
  demicrofy,
  formatANCWithPostfixUnits,
  formatLP,
  formatUSTWithPostfixUnits,
  stripUUSD,
} from '@anchor-protocol/notation';
import { Rate, uANC, uAncUstLP, uUST } from '@anchor-protocol/types';
import { pipe } from '@rx-stream/pipe';
import { floor, min } from '@terra-dev/big-math';
import { NetworkInfo, TxResult } from '@terra-dev/wallet-types';
import { CreateTxOptions, StdFee } from '@terra-money/terra.js';
import {
  MantleFetch,
  pickAttributeValueByKey,
  pickEvent,
  pickRawLog,
  TaxData,
  TxResultRendering,
  TxStreamPhase,
} from '@terra-money/webapp-fns';
import big, { Big } from 'big.js';
import { Observable } from 'rxjs';
import { AncPrice } from '../../queries/anc/price';
import { _catchTxError } from '../internal/_catchTxError';
import { _createTxOptions } from '../internal/_createTxOptions';
import { _pollTxInfo } from '../internal/_pollTxInfo';
import { _postTx } from '../internal/_postTx';
import { TxHelper } from '../internal/TxHelper';

export function ancAncUstLpProvideTx(
  $: Parameters<typeof fabricateTerraswapProvideLiquidityANC>[0] & {
    ancPrice: AncPrice | undefined;
    tax: TaxData;
    gasFee: uUST<number>;
    gasAdjustment: Rate<number>;
    txFee: uUST;
    fixedGas: uUST;
    network: NetworkInfo;
    addressProvider: AddressProvider;
    mantleEndpoint: string;
    mantleFetch: MantleFetch;
    post: (tx: CreateTxOptions) => Promise<TxResult>;
    txErrorReporter?: (error: unknown) => string;
    onTxSucceed?: () => void;
  },
): Observable<TxResultRendering> {
  const helper = new TxHelper($);

  return pipe(
    _createTxOptions({
      msgs: fabricateTerraswapProvideLiquidityANC($)($.addressProvider),
      fee: new StdFee($.gasFee, floor($.txFee) + 'uusd'),
      gasAdjustment: $.gasAdjustment,
    }),
    _postTx({ helper, ...$ }),
    _pollTxInfo({ helper, ...$ }),
    ({ value: txInfo }) => {
      const rawLog = pickRawLog(txInfo, 1);

      if (!rawLog) {
        return helper.failedToFindRawLog();
      }

      const fromContract = pickEvent(rawLog, 'from_contract');
      const transfer = pickEvent(rawLog, 'transfer');

      if (!fromContract || !transfer) {
        return helper.failedToFindEvents('from_contract', 'transfer');
      }

      try {
        const depositedAnc = pickAttributeValueByKey<uANC>(
          fromContract,
          'amount',
        );

        const depositedUusd = pickAttributeValueByKey<string>(
          transfer,
          'amount',
        );

        const depositedUst = depositedUusd && stripUUSD(depositedUusd);

        const received = pickAttributeValueByKey<uAncUstLP>(
          fromContract,
          'share',
        );

        const simulatedUst =
          !!depositedAnc &&
          !!depositedUst &&
          !!$.ancPrice &&
          (big(big(depositedAnc).mul($.ancPrice.ANCPrice)).plus(
            depositedUst,
          ) as uUST<Big>);

        const txFee =
          simulatedUst &&
          (big($.fixedGas).plus(
            min(simulatedUst.mul($.tax.taxRate), $.tax.maxTaxUUSD),
          ) as uUST<Big>);

        return {
          value: null,

          phase: TxStreamPhase.SUCCEED,
          receipts: [
            received && {
              name: 'Received',
              value: formatLP(demicrofy(received)) + ' ANC-UST LP',
            },
            !!depositedAnc &&
              !!depositedUst && {
                name: 'Deposited',
                value:
                  formatANCWithPostfixUnits(demicrofy(depositedAnc)) +
                  ' ANC + ' +
                  formatUSTWithPostfixUnits(demicrofy(depositedUst)) +
                  ' UST',
              },
            helper.txHashReceipt(),
            helper.txFeeReceipt(txFee ? txFee : undefined),
          ],
        } as TxResultRendering;
      } catch (error) {
        return helper.failedToParseTxResult();
      }
    },
  )().pipe(_catchTxError({ helper, ...$ }));
}
