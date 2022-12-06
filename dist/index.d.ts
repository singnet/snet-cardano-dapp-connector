declare global {
    interface Window {
        cardano: any;
    }
}
export declare const useInjectableWalletHook: (supportingWallets: string[], expectedNetworkId: number | string) => {
    connectWallet: (walletName: string) => Promise<any>;
    getChangeAddress: () => Promise<string>;
    getTokensAndBalance: (walletIdentifier: string) => Promise<any>;
    supportedWallets: any[];
    transferTokens: (walletName: string, transferWalletAddress: string, assetPolicyIdHex: string, assetNameHex: string, assetQuantity: string) => Promise<any>;
    transferTokensWithMatadata: (walletName: string, transferWalletAddress: string, assetQuantity: string, matadata: any) => Promise<any>;
    detectCardanoInjectableWallets: () => number;
    getBalanceByPolicyScriptId: (walletIdentifier: string, policyScriptId: string) => Promise<any>;
    getUsedAddresses: () => Promise<any>;
};
