import { demicrofy, formatUST, truncate } from '@anchor-protocol/notation';
import { useEarnTransactionHistoryQuery } from '@anchor-protocol/webapp-provider';
import { HorizontalHeavyRuler } from '@terra-dev/neumorphism-ui/components/HorizontalHeavyRuler';
import { Pagination } from '@terra-dev/neumorphism-ui/components/Pagination';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import { useArrayPagination } from '@terra-dev/use-array-pagination';
import { useWallet } from '@terra-money/wallet-provider';
import { useMemo } from 'react';
import styled from 'styled-components';

export interface TransactionHistorySectionProps {
  className?: string;
}

export function TransactionHistorySection({
  className,
}: TransactionHistorySectionProps) {
  // ---------------------------------------------
  // dependencies
  // ---------------------------------------------
  const { network } = useWallet();

  // ---------------------------------------------
  // queries
  // ---------------------------------------------
  const {
    data: { transactionHistory } = {},
  } = useEarnTransactionHistoryQuery();

  // ---------------------------------------------
  // computes
  // ---------------------------------------------
  const filteredHistory = useMemo(() => {
    return (
      transactionHistory?.filter(
        ({ TransactionType }) =>
          TransactionType === 'deposit_stable' ||
          TransactionType === 'redeem_stable',
      ) ?? []
    );
  }, [transactionHistory]);

  const { page, pageIndex, paging } = useArrayPagination(filteredHistory, 3);

  // ---------------------------------------------
  // presentation
  // ---------------------------------------------
  return (
    <Section className={className}>
      <h2>TRANSACTION HISTORY</h2>

      <HorizontalHeavyRuler />

      {filteredHistory.length > 0 ? (
        <>
          <ul className="list">
            {page.map(
              (
                {
                  Address,
                  TxHash,
                  InAmount,
                  OutAmount,
                  TransactionType,
                  Timestamp,
                },
                i,
              ) => {
                const datetime: Date = new Date(Timestamp * 1000);

                return (
                  <li key={'history' + TxHash + '-' + i}>
                    <div className="amount">
                      {TransactionType === 'deposit_stable'
                        ? `+ ${formatUST(demicrofy(InAmount))}`
                        : `- ${formatUST(demicrofy(OutAmount))}`}{' '}
                      UST
                    </div>
                    <div className="detail">
                      <span>
                        {TransactionType === 'deposit_stable'
                          ? 'Deposit from'
                          : 'Redeem to'}{' '}
                        <a
                          href={`https://finder.terra.money/${network.chainID}/tx/${TxHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {truncate(Address)}
                        </a>
                      </span>
                      <time>
                        {datetime.toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {', '}
                        <span className="time">
                          {datetime.toLocaleTimeString('en-US')}
                        </span>
                      </time>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
          <Pagination
            className="pagination"
            totalItems={filteredHistory.length}
            pageIndex={pageIndex}
            viewPages={7}
            viewItems={3}
            onChange={paging}
          />
        </>
      ) : (
        <EmptyMessage>
          <h3>No transaction history</h3>
          <p>Looks like you haven't made any transactions yet.</p>
        </EmptyMessage>
      )}
    </Section>
  );
}

const EmptyMessage = styled.div`
  height: 280px;
  display: grid;
  place-content: center;
  text-align: center;

  h3 {
    font-size: 18px;
    font-weight: 500;

    margin-bottom: 8px;
  }

  p {
    font-size: 13px;
    color: ${({ theme }) => theme.dimTextColor};
  }
`;
