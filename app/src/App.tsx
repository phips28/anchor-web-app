import { useCloudflareAnalytics } from '@terra-dev/use-cloudflare-analytics';
import { AppProviders } from 'base/AppProviders';
import { GlobalStyle } from 'components/GlobalStyle';
import { Header } from 'components/Header';
import { Airdrop } from 'pages/airdrop';
import { BAsset } from 'pages/basset';
import { Borrow } from 'pages/borrow';
import { Earn } from 'pages/earn';
import { Governance } from 'pages/gov';
import { govPathname } from 'pages/gov/env';
import { AutoFarm } from './pages/autofarm';
import { Redirect, Route, Switch } from 'react-router-dom';
import { cloudFlareOption } from './env';

export function App() {
  useCloudflareAnalytics(cloudFlareOption);

  return (
    <AppProviders>
      <div>
        <GlobalStyle />
        <Header />
        <Switch>
          <Route path="/earn" component={Earn} />
          <Route path="/borrow" component={Borrow} />
          <Route path="/bond" component={BAsset} />
          <Route path="/airdrop" component={Airdrop} />
          <Route path="/autofarm" component={AutoFarm} />
          <Route path={`/${govPathname}`} component={Governance} />
          <Redirect to="/earn" />
        </Switch>
      </div>
    </AppProviders>
  );
}
