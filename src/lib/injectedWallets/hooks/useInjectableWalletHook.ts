import { useState, useEffect } from "react";
import toLower from "lodash/toLower";
import isNil from "lodash/isNil";
import {
  Address,
  BigNum,
  Value,
} from "@emurgo/cardano-serialization-lib-asmjs";
import AssetFingerprint from "@emurgo/cip14-js";
import { fromCogs, HexToAscii } from "../../../utils/functions";

let injectedWallet: any = undefined;

const useInjectableWalletHook = (supportingWallets: string[]) => {
  const [supportedWallets, setSupportedWallets] = useState<any[]>([]);

  const getSupportedWallets = (cardano: any) => {
    let wallets: string[] = [];

    supportingWallets.map((wallet: string) => {
      const cardanoWallet = cardano[toLower(wallet)];
      const isWalletAvailable = isNil(cardanoWallet);
      if (!isWalletAvailable) {
        wallets.push({ ...cardanoWallet, walletIdentifier: wallet });
      }
    });

    console.log("Supported wallets: ", wallets);

    setSupportedWallets(wallets);
  };

  const detectCardanoInjectableWallets = () => {
    try {
      const cardano = window?.cardano;

      if (isNil(cardano)) {
        throw new Error("Cardano wallet not found");
      }

      console.log("SNET cardano dapp connector detected Cardano wallets");
      console.log("Available APIs", cardano);

      getSupportedWallets(cardano);
    } catch (error: any) {
      console.log(JSON.stringify(error));
      throw error;
    }
  };

  useEffect(() => {
    detectCardanoInjectableWallets();
  }, []);

  const getTokensAndBalance = async () => {
    try {
      const raw = await injectedWallet.getBalance();
      const value = Value.from_bytes(Buffer.from(raw, "hex"));
      const assets = [];

      if (value.multiasset()) {
        const multiAssets = value.multiasset()?.keys();
        const multiAssetsLength: any = multiAssets?.len();
        for (let j = 0; j < multiAssetsLength; j++) {
          const policy: any = multiAssets?.get(j);
          const policyAssets = value.multiasset()?.get(policy);
          const assetNames = policyAssets?.keys();
          const assetNameLength: any = assetNames?.len();
          for (let k = 0; k < assetNameLength; k++) {
            const policyAsset: any = assetNames?.get(k);
            const quantity = policyAssets?.get(policyAsset);
            const asset =
              Buffer.from(policy.to_bytes(), "hex").toString("hex") +
              Buffer.from(policyAsset.name(), "hex").toString("hex");
            const _policy = asset.slice(0, 56);
            const _name = asset.slice(56);

            const fingerprint = AssetFingerprint.fromParts(
              Buffer.from(_policy, "hex"),
              Buffer.from(_name, "hex")
            ).fingerprint();

            assets.push({
              unit: asset,
              quantity: quantity?.to_str(),
              policy: _policy,
              name: HexToAscii(_name),
              fingerprint,
            });
          }
        }
      }

      console.log("Assets: ", assets);
      return assets;
    } catch (error: any) {
      console.log("Error on getTokensAndBalance: ", JSON.stringify(error));
      throw error;
    }
  };

  const getChangeAddress = async () => {
    try {
      const raw = await injectedWallet.getChangeAddress();
      const changeAddress = Address.from_bytes(
        Buffer.from(raw, "hex")
      ).to_bech32();
      console.log("Wallet address: ", changeAddress);
      return changeAddress;
    } catch (error) {
      console.log("Error on getChangeAddress: ", error);
      throw error;
    }
  };

  const connectWallet = async (walletName: string) => {
    try {
      const connectingWallet = toLower(walletName);
      console.log("Connecting wallet: ", connectingWallet);
      injectedWallet = await window.cardano[connectingWallet].enable();

      await getTokensAndBalance();
      await getChangeAddress();
    } catch (error) {
      throw error;
    }
  };

  return {
    connectWallet,
    getChangeAddress,
    getTokensAndBalance,
    supportedWallets,
  };
};

export default useInjectableWalletHook;
