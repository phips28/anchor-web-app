import { useEventBus, useEventBusListener } from '@terra-dev/event-bus';
import { PaddedLayout } from 'components/layouts/PaddedLayout';
import { screen } from 'env';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Rewards } from '../../gov/components/Rewards';
import { ClaimAllComponent } from '../../gov/components/ClaimAll';
import { AncUstLpStake } from '../../gov/components/AncUstLpStake';
import { Section } from '@terra-dev/neumorphism-ui/components/Section';
import { AncUstLpProvide } from '../../gov/components/AncUstLpProvide';
import { ActionButton } from '@terra-dev/neumorphism-ui/components/ActionButton';
import { PushSpinner } from 'react-spinners-kit';
import { sleep } from '../../../logics/sleep';
import { useConnectedWallet } from '@terra-money/wallet-provider';

export interface AutoFarmProps {
  className?: string;
}

function AutoFarmBase({ className }: AutoFarmProps) {
  const connectedWallet = useConnectedWallet();

  const [currentStep, setCurrentStep] = useState(-1);
  const [farming, setFarming] = useState(false);

  const { dispatch } = useEventBus();

  const stopAutoFarm = (reload: boolean = false) => {
    setFarming(false);
    setCurrentStep(-1);
    if (reload) {
      window.location.reload();
    }
  };

  const startAutoFarm = () => {
    setFarming(true);
    setCurrentStep(0);
    dispatch('auto-claim-all');
    // dispatch('auto-provide-liquidity');
    // dispatch('auto-stake-lp');
  };
  useEventBusListener('claim-all-fault', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    stopAutoFarm();
  });
  useEventBusListener('claim-all-done', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    setFarming(true);
    setCurrentStep(1);

    await sleep(2500); // wait till wallet updates

    // provide liquidity
    dispatch('auto-provide-liquidity');
  });
  useEventBusListener('provide-liquidity-error', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    stopAutoFarm();
  });
  useEventBusListener('provide-liquidity-fault', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    stopAutoFarm();
  });
  useEventBusListener('provide-liquidity-done', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    setFarming(true);
    setCurrentStep(2);

    await sleep(2500); // wait till wallet updates

    // provide liquidity
    dispatch('auto-stake-lp');
  });
  useEventBusListener('stake-lp-error', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    stopAutoFarm();
  });
  useEventBusListener('stake-lp-fault', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    stopAutoFarm();
  });
  useEventBusListener('stake-lp-done', async () => {
    await new Promise<void>((resolve) => resolve()); // hack next tick

    setFarming(false);
    setCurrentStep(-1);
  });

  return (
    <PaddedLayout className={className}>
      <div className="description">
        Just hit "Auto Farm" to start the process of: claim all rewards, provide
        liquidity, stake LP.
        <br />
        After each step you have to confirm with your wallet.
      </div>
      <hr />

      <div className="start-btn-area">
        {farming ? (
          <div className="loading">
            <figure data-state="in-progress">
              <PushSpinner color="green" />
            </figure>
            <span>Auto Farming in progress</span>
            <ActionButton
              className="stop-btn"
              onClick={() => stopAutoFarm(true)}
            >
              Stop
            </ActionButton>
            <figure data-state="in-progress">
              <PushSpinner color="green" />
            </figure>
          </div>
        ) : (
          <ActionButton
            className="start-btn"
            disabled={farming || !connectedWallet}
            onClick={startAutoFarm}
          >
            Auto Farm
          </ActionButton>
        )}
      </div>

      <section className="grid">
        <ClaimAllComponent
          className={`${
            farming && currentStep === 0 ? 'active' : ''
          } claim-all`}
        />

        {/* Provide Liquidity */}
        <Section className={farming && currentStep === 1 ? 'active' : ''}>
          <div className="form">
            <h2>2. Provide Liquidity</h2>
            <AncUstLpProvide />
          </div>
        </Section>

        {/* Stake LP */}
        <Section className={farming && currentStep === 2 ? 'active' : ''}>
          <div className="form">
            <h2>3. Stake LP</h2>
            <AncUstLpStake />
          </div>
        </Section>
      </section>

      <Rewards className="rewards" hideClaimAllBtn />
    </PaddedLayout>
  );
}

export const AutoFarmComponent = styled(AutoFarmBase)`
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
    margin: 20px 0;
  }

  .start-btn-area {
    height: 60px;
    margin-bottom: 20px;

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      color: green;
      font-weight: bold;
      height: 100%;

      span {
        margin: 0 30px;
      }

      .stop-btn {
        background: red;
        margin-right: 30px;
        min-width: 100px;
        height: 30px;
      }
    }

    .start-btn {
      width: 100%;
      height: 100%;
      background: green;
    }
  }

  .active {
    border: 1px solid green;

    .NeuSection-content {
      padding: 39px;
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

      .NeuSection-content {
        padding: 40px;
      }
    }
  }
`;
