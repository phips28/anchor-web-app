import { EventBusProvider } from '@terra-dev/event-bus';
import { PaddedLayout } from 'components/layouts/PaddedLayout';
import { screen } from 'env';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Rewards } from '../gov/components/Rewards';
import { ClaimAllComponent } from '../gov/components/ClaimAll';
import { AncUstLpStake } from '../gov/components/AncUstLpStake';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import { AncUstLpProvide } from '../gov/components/AncUstLpProvide';

export interface AutoFarmProps {
  className?: string;
}

function AutoFarmBase({ className }: AutoFarmProps) {
  const [currentStep /*, setCurrentStep*/] = useState(0);
  const [farming /*, setFarming*/] = useState(false);

  return (
    <EventBusProvider>
      <PaddedLayout className={className}>
        <div className="description">
          Auto Farming is deactivated at the moment, click it manually.
          <br />
          But this page already reduces time wasted with farming. 🚀
        </div>
        <hr />

        <section className="grid">
          <ClaimAllComponent
            className={`${
              farming && currentStep === 0 ? 'active' : ''
            } claim-all`}
          />

          {/* Provide Liquidity */}
          <Section className={farming && currentStep === 1 ? 'active' : ''}>
            <div className="form">
              <h2>Provide Liquidity</h2>
              <AncUstLpProvide />
            </div>
          </Section>

          {/* Stake LP */}
          <Section className={farming && currentStep === 2 ? 'active' : ''}>
            <div className="form">
              <h2>Stake LP</h2>
              <AncUstLpStake />
            </div>
          </Section>
        </section>

        <Rewards className="rewards" hideClaimAllBtn />
      </PaddedLayout>
    </EventBusProvider>
  );
}

export const AutoFarm = styled(AutoFarmBase)`
  // ---------------------------------------------
  // style
  // ---------------------------------------------
  h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.3px;
    color: ${({ theme }) => theme.textColor};
  }

  hr {
    margin: 30px 0;
  }

  .active {
    border: 1px solid green;

    .NeuSection-content {
      padding: 59px;
    }
  }

  .decimal-point {
    color: ${({ theme }) => theme.dimTextColor};
  }

  .form {
    h2 {
      font-size: 27px;
      text-align: center;
      font-weight: 300;
      margin-bottom: 50px;
    }

    .description {
      display: flex;
      justify-content: space-between;
      align-items: center;

      font-size: 16px;
      color: ${({ theme }) => theme.dimTextColor};

      > :last-child {
        font-size: 12px;
      }

      margin-bottom: 12px;
    }

    .amount {
      width: 100%;

      margin-bottom: 5px;
    }

    .wallet {
      display: flex;
      justify-content: space-between;

      font-size: 12px;
      color: ${({ theme }) => theme.dimTextColor};

      &[aria-invalid='true'] {
        color: ${({ theme }) => theme.colors.negative};
      }
    }

    .separator {
      margin: 10px 0 0 0;
    }

    .receipt {
      margin-top: 30px;
    }

    .submit {
      margin-top: 40px;

      width: 100%;
      height: 60px;
    }
  }

  // pc
  @media (min-width: ${screen.monitor.min}px) {
    .grid {
      display: grid;

      grid-template-columns: 1fr 1fr 460px;
      grid-template-rows: auto;
      grid-gap: 40px;

      .NeuSection-root {
        margin: 0;
      }

      .total-deposit {
        grid-column: 1/3;
        grid-row: 1;
      }

      .interest {
        grid-column: 3;
        grid-row: 1/3;
      }

      .transaction-history {
        grid-column: 1/3;
        grid-row: 2/3;
      }
    }

    .interest {
      .NeuSection-content {
        padding: 60px 40px;
      }
    }
  }
`;
