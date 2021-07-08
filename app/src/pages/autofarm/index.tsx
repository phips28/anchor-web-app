import { EventBusProvider } from '@terra-dev/event-bus';
import React from 'react';
import styled from 'styled-components';
import { AutoFarmComponent } from './components/AutoFarm';

export interface AutoFarmProps {
  className?: string;
}

function AutoFarmBase({ className }: AutoFarmProps) {
  return (
    <EventBusProvider>
      <AutoFarmComponent className={className} />
    </EventBusProvider>
  );
}

export const AutoFarm = styled(AutoFarmBase)``;
