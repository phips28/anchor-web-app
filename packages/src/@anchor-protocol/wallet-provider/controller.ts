import {
  ChromeExtensionController,
  ChromeExtensionStatus,
  StationNetworkInfo,
} from '@terra-dev/chrome-extension';
import { isDesktopChrome } from '@terra-dev/is-desktop-chrome';
import {
  connect as reConnect,
  connectIfSessionExists as reConnectIfSessionExists,
  ReadonlyWalletController,
  ReadonlyWalletSession,
} from '@terra-dev/readonly-wallet';
import {
  connect as wcConnect,
  connectIfSessionExists as wcConnectIfSessionExists,
  WalletConnectController,
  WalletConnectControllerOptions,
  WalletConnectSessionStatus,
  WalletConnectTxResult,
} from '@terra-dev/walletconnect';
import { AccAddress, CreateTxOptions } from '@terra-money/terra.js';
import {
  BehaviorSubject,
  combineLatest,
  interval,
  Observable,
  race,
} from 'rxjs';
import { filter, mapTo } from 'rxjs/operators';
import { TxResult } from './tx';
import { ConnectType, NetworkInfo, WalletInfo, WalletStatus } from './types';

export interface WalletControllerOptions
  extends WalletConnectControllerOptions {
  defaultNetwork: StationNetworkInfo;
  walletConnectChainIds: Map<number, StationNetworkInfo>;
  createReadonlyWalletSession: () => Promise<ReadonlyWalletSession | null>;
}

export class WalletController {
  private extension: ChromeExtensionController;
  private walletConnect: WalletConnectController | null = null;
  private readonlyWallet: ReadonlyWalletController | null = null;

  private _availableConnectTypes: BehaviorSubject<ConnectType[]>;
  private _status: BehaviorSubject<WalletStatus>;
  private _network: BehaviorSubject<NetworkInfo>;
  private _wallets: BehaviorSubject<WalletInfo[]>;

  private disableReadonlyWallet: (() => void) | null = null;
  private disableExtension: (() => void) | null = null;
  private disableWalletConnect: (() => void) | null = null;

  constructor(readonly options: WalletControllerOptions) {
    this._availableConnectTypes = new BehaviorSubject<ConnectType[]>([
      ConnectType.READONLY,
      ConnectType.WALLETCONNECT,
    ]);

    this._status = new BehaviorSubject<WalletStatus>(WalletStatus.INITIALIZING);

    this._network = new BehaviorSubject<NetworkInfo>({
      name: options.defaultNetwork.name,
      chainID: options.defaultNetwork.chainID,
    });

    this._wallets = new BehaviorSubject<WalletInfo[]>([]);

    this.extension = new ChromeExtensionController({
      enableWalletConnection: true,
      defaultNetwork: options.defaultNetwork,
    });

    let numSessionCheck: number = 0;

    // wait checking the availability of the chrome extension
    // 0. check if extension wallet session is exists
    if (isDesktopChrome()) {
      const extensionConnectionCheckSubscription = race(
        this.extension.status().pipe(
          filter((extensionStatus) => {
            return extensionStatus !== ChromeExtensionStatus.INITIALIZING;
          }),
        ),
        interval(1000 * 10).pipe(mapTo(null)),
      ).subscribe({
        next: (status) => {
          extensionConnectionCheckSubscription.unsubscribe();

          if (status !== ChromeExtensionStatus.UNAVAILABLE) {
            this._availableConnectTypes.next([
              ConnectType.READONLY,
              ConnectType.CHROME_EXTENSION,
              ConnectType.WALLETCONNECT,
            ]);
          }

          if (
            status === ChromeExtensionStatus.WALLET_CONNECTED &&
            !this.disableWalletConnect &&
            !this.disableReadonlyWallet
          ) {
            this.enableExtension();
          } else if (numSessionCheck === 0) {
            numSessionCheck += 1;
          } else {
            this._status.next(WalletStatus.WALLET_NOT_CONNECTED);
          }
        },
      });
    } else {
      numSessionCheck += 1;
    }

    // 1. check if readonly wallet session is exists
    const draftReadonlyWallet = reConnectIfSessionExists();

    if (draftReadonlyWallet) {
      this.enableReadonlyWallet(draftReadonlyWallet);
      return;
    }

    // 2. check if walletconnect sesison is exists
    const draftWalletConnect = wcConnectIfSessionExists(options);

    if (
      draftWalletConnect &&
      draftWalletConnect.getLatestSession().status ===
        WalletConnectSessionStatus.CONNECTED
    ) {
      this.enableWalletConnect(draftWalletConnect);
    } else if (numSessionCheck === 0) {
      numSessionCheck += 1;
    } else {
      this._status.next(WalletStatus.WALLET_NOT_CONNECTED);
    }
  }

  availableConnectTypes = (): Observable<ConnectType[]> => {
    return this._availableConnectTypes.asObservable();
  };

  status = (): Observable<WalletStatus> => {
    return this._status.asObservable();
  };

  network = (): Observable<NetworkInfo> => {
    return this._network.asObservable();
  };

  wallets = (): Observable<WalletInfo[]> => {
    return this._wallets.asObservable();
  };

  recheckStatus = () => {
    if (this.disableExtension) {
      this.extension.recheckStatus();
    }
  };

  connect = (type: ConnectType) => {
    switch (type) {
      case ConnectType.READONLY:
        this.options
          .createReadonlyWalletSession()
          .then((readonlyWalletSession) => {
            if (readonlyWalletSession) {
              this.enableReadonlyWallet(reConnect(readonlyWalletSession));
            }
          });
        break;
      case ConnectType.WALLETCONNECT:
        this.enableWalletConnect(wcConnect(this.options));
        break;
      case ConnectType.CHROME_EXTENSION:
        this.extension.connect().then((success) => {
          if (success) {
            this.enableExtension();
          }
        });
        break;
      default:
        throw new Error(`Unknown ConnectType!`);
    }
  };

  disconnect = () => {
    this.disableReadonlyWallet?.();
    this.disableReadonlyWallet = null;

    this.disableExtension?.();
    this.disableExtension = null;

    this.disableWalletConnect?.();
    this.disableWalletConnect = null;

    this._status.next(WalletStatus.WALLET_NOT_CONNECTED);
    this._network.next(this.options.defaultNetwork);
    this._wallets.next([]);
  };

  post = async (
    tx: CreateTxOptions,
    txTarget: { network?: NetworkInfo; terraAddress?: string } = {},
  ): Promise<TxResult> => {
    if (this.disableExtension) {
      return this.extension
        .post<CreateTxOptions, { result: WalletConnectTxResult }>(tx)
        .then(({ payload }) => {
          return {
            ...tx,
            result: payload.result,
          } as TxResult;
        });
    } else if (this.walletConnect) {
      return this.walletConnect.post(tx).then(
        (result) =>
          ({
            ...tx,
            result,
          } as TxResult),
      );
    } else {
      throw new Error(`There are no connections that can be posting tx!`);
    }
  };

  private enableReadonlyWallet = (readonlyWallet: ReadonlyWalletController) => {
    this.disableWalletConnect?.();
    this.disableExtension?.();

    if (this.readonlyWallet === readonlyWallet) {
      return;
    }

    if (this.readonlyWallet) {
      this.readonlyWallet.disconnect();
    }

    this.readonlyWallet = readonlyWallet;

    this._status.next(WalletStatus.WALLET_CONNECTED);
    this._network.next(readonlyWallet.network);
    this._wallets.next([
      {
        connectType: ConnectType.READONLY,
        terraAddress: readonlyWallet.terraAddress,
        design: 'readonly',
      },
    ]);

    this.disableReadonlyWallet = () => {
      readonlyWallet.disconnect();
      this.readonlyWallet = null;
      this.disableReadonlyWallet = null;
    };
  };

  private enableExtension = () => {
    this.disableReadonlyWallet?.();
    this.disableWalletConnect?.();

    if (this.disableExtension) {
      return;
    }

    const extensionSubscription = combineLatest([
      this.extension.status(),
      this.extension.networkInfo(),
      this.extension.terraAddress(),
    ]).subscribe({
      next: ([status, networkInfo, terraAddress]) => {
        this._network.next(networkInfo);

        if (
          status === ChromeExtensionStatus.WALLET_CONNECTED &&
          typeof terraAddress === 'string' &&
          AccAddress.validate(terraAddress)
        ) {
          this._status.next(WalletStatus.WALLET_CONNECTED);
          this._wallets.next([
            {
              connectType: ConnectType.CHROME_EXTENSION,
              terraAddress,
              design: 'extension',
            },
          ]);
        } else {
          this._status.next(WalletStatus.WALLET_NOT_CONNECTED);
          this._wallets.next([]);
        }
      },
    });

    this.disableExtension = () => {
      this.extension.disconnect();
      extensionSubscription.unsubscribe();
      this.disableExtension = null;
    };
  };

  private enableWalletConnect = (walletConnect: WalletConnectController) => {
    this.disableReadonlyWallet?.();
    this.disableExtension?.();

    if (this.walletConnect === walletConnect) {
      return;
    }

    if (this.walletConnect) {
      this.walletConnect.disconnect();
    }

    this.walletConnect = walletConnect;

    const walletConnectSessionSubscription = walletConnect.session().subscribe({
      next: (status) => {
        switch (status.status) {
          case WalletConnectSessionStatus.CONNECTED:
            this._status.next(WalletStatus.WALLET_CONNECTED);
            this._network.next(
              this.options.walletConnectChainIds.get(status.chainId) ??
                this.options.defaultNetwork,
            );
            this._wallets.next([
              {
                connectType: ConnectType.WALLETCONNECT,
                terraAddress: status.terraAddress,
                design: 'walletconnect',
              },
            ]);
            break;
          default:
            this._status.next(WalletStatus.WALLET_NOT_CONNECTED);
            this._network.next(this.options.defaultNetwork);
            this._wallets.next([]);
            break;
        }
      },
    });

    this.disableWalletConnect = () => {
      walletConnect.disconnect();
      this.walletConnect = null;
      walletConnectSessionSubscription.unsubscribe();
      this.disableWalletConnect = null;
    };
  };
}