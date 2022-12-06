import { useState } from "react";
import { toLower, isNil } from "lodash";
import {
  Address,
  AssetName,
  Assets,
  BigNum,
  LinearFee,
  MultiAsset,
  ScriptHash,
  Transaction,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionOutputBuilder,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionWitnessSet,
  Value,
  TransactionOutput,
  GeneralTransactionMetadata,
  TransactionMetadatum,
  MetadataMap,
} from "@emurgo/cardano-serialization-lib-asmjs";
import AssetFingerprint from "@emurgo/cip14-js";

declare global {
  interface Window {
    cardano: any;
  }
}
const cardanoWalletExtensionError = "WALLET_EXTENSION_NOT_FOUND";

let injectedWallet: any = undefined;

const protocolParams = {
  linearFee: {
    minFeeA: "44",
    minFeeB: "155381",
  },
  minUtxo: "34482",
  poolDeposit: "500000000",
  keyDeposit: "2000000",
  maxValSize: 5000,
  maxTxSize: 16384,
  priceMem: 0.0577,
  priceStep: 0.0000721,
  coinsPerUtxoWord: "34482",
};

export const useInjectableWalletHook = (
  supportingWallets: string[],
  expectedNetworkId: number | string
) => {
  const [supportedWallets, setSupportedWallets] = useState<any[]>([]);

  const HexToBuffer = (
    string:
      | WithImplicitCoercion<string>
      | { [Symbol.toPrimitive](hint: "string"): string }
  ) => {
    return Buffer.from(string, "hex");
  };

  const HexToAscii = (
    string:
      | WithImplicitCoercion<string>
      | { [Symbol.toPrimitive](hint: "string"): string }
  ) => {
    return HexToBuffer(string).toString("ascii");
  };

  const getSupportedWallets = (cardano: any) => {
    let wallets: string[] = [];

    supportingWallets.map((wallet: string) => {
      const cardanoWallet = cardano[toLower(wallet)];
      const isWalletAvailable = isNil(cardanoWallet);
      if (!isWalletAvailable) {
        wallets.push({ ...cardanoWallet, walletIdentifier: wallet });
      }
    });

    setSupportedWallets(wallets);
    return wallets.length;
  };

  const detectCardanoInjectableWallets = () => {
    try {
      const cardano = window?.cardano;

      if (isNil(cardano)) {
        throw new Error("Cardano wallet not found");
      }

      const isWalletsAvailable = getSupportedWallets(cardano);
      return isWalletsAvailable;
    } catch (error) {
      console.log(JSON.stringify(error));
      throw error;
    }
  };

  const getNetworkId = async () => {
    try {
      const networkId = await injectedWallet.getNetworkId();
      return networkId;
    } catch (error) {
      console.log("Error on getNetworkId: ", error);
      throw error;
    }
  };

  const connectWallet = async (walletName: string) => {
    try {
      const connectingWallet = toLower(walletName);
      if (window.cardano && window.cardano.hasOwnProperty(connectingWallet)) {
        injectedWallet = await window.cardano[connectingWallet].enable();
      } else {
        throw new Error(cardanoWalletExtensionError);
      }

      const currentNetworkId = await getNetworkId();
      if (Number(currentNetworkId) !== Number(expectedNetworkId)) {
        const error = `Invalid network selected please switch to ${
          currentNetworkId ? "Testnet" : "Mainnet"
        }`;
        throw new Error(error);
      }

      return injectedWallet;
    } catch (error) {
      console.log("Error on connectWallet: ", error);
      throw error;
    }
  };

  const getTokensAndBalance = async (walletIdentifier: string) => {
    try {
      if (isNil(injectedWallet)) {
        await connectWallet(walletIdentifier);
      }

      const raw = await injectedWallet.getBalance();
      const value = Value.from_bytes(Buffer.from(raw, "hex"));
      const assets: any = [];

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

      return assets;
    } catch (error) {
      console.log("Error on getTokensAndBalance: ", JSON.stringify(error));
      throw error;
    }
  };

  const getBalanceByPolicyScriptId = async (
    walletIdentifier: string,
    policyScriptId: string
  ) => {
    const balances = await getTokensAndBalance(walletIdentifier);
    const balance = balances.find(
      (balance: any) => balance.policy === policyScriptId
    );
    return balance;
  };

  const getUsedAddresses = async () => {
    try {
      const raw = await injectedWallet.getUsedAddresses();
      const usedAddresses = raw.map((address: string) => {
        return Address.from_bytes(Buffer.from(address, "hex")).to_bech32();
      });

      console.log("Used addresses: ", usedAddresses);

      return usedAddresses[0];
    } catch (error) {
      console.log("Error on getUsedAddresses: ", JSON.stringify(error));
      throw error;
    }
  };

  const getRewardAddresses = async () => {
    try {
      const raw = await injectedWallet.getRewardAddresses();
      const rewardAddressess = raw.map((address: string) => {
        return Address.from_bytes(Buffer.from(address, "hex")).to_bech32();
      });

      console.log("rewardAddressess: ", rewardAddressess);
    } catch (error) {
      console.log("Error on getRewardAddresses: ", JSON.stringify(error));
    }
  };

  const getUnusedAddresses = async () => {
    try {
      const raw = await injectedWallet.getUnusedAddresses();
      const unusedAddressess = raw.map((address: string) => {
        return Address.from_bytes(Buffer.from(address, "hex")).to_bech32();
      });

      console.log("unusedAddressess: ", unusedAddressess);
    } catch (error) {
      console.log("Error on getUnusedAddresses: ", JSON.stringify(error));
    }
  };

  const getChangeAddress = async () => {
    try {
      const raw = await injectedWallet.getChangeAddress();

      await getUsedAddresses();
      await getRewardAddresses();
      await getUnusedAddresses();

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

  const initTransactionBuilder = async () => {
    const txBuilder = TransactionBuilder.new(
      TransactionBuilderConfigBuilder.new()
        .fee_algo(
          LinearFee.new(
            BigNum.from_str(protocolParams.linearFee.minFeeA),
            BigNum.from_str(protocolParams.linearFee.minFeeB)
          )
        )
        .pool_deposit(BigNum.from_str(protocolParams.poolDeposit))
        .key_deposit(BigNum.from_str(protocolParams.keyDeposit))
        .coins_per_utxo_word(BigNum.from_str(protocolParams.coinsPerUtxoWord))
        .max_value_size(protocolParams.maxValSize)
        .max_tx_size(protocolParams.maxTxSize)
        .prefer_pure_change(true)
        .build()
    );

    return txBuilder;
  };

  const getUtxos = async () => {
    try {
      const utxosRaw = await injectedWallet.getUtxos();
      let utxos: any = utxosRaw.map(
        (
          utxo:
            | WithImplicitCoercion<string>
            | { [Symbol.toPrimitive](hint: "string"): string }
        ) => TransactionUnspentOutput.from_bytes(Buffer.from(utxo, "hex"))
      );

      return utxos;
    } catch (error) {
      console.log("Error on getUtxos: ", error);
      throw error;
    }
  };

  const getTxUnspentOutputs = async () => {
    const txOutputs = TransactionUnspentOutputs.new();
    const utxos = await getUtxos();
    for (const utxo of utxos) {
      txOutputs.add(utxo);
    }
    return txOutputs;
  };

  const transferTokens = async (
    walletName: string,
    transferWalletAddress: string,
    assetPolicyIdHex: string,
    assetNameHex: string,
    assetQuantity: string
  ) => {
    try {
      await connectWallet(walletName);
      const txBuilder = await initTransactionBuilder();
      const changeAddress = await getChangeAddress();
      const shelleyOutputAddress = Address.from_bech32(transferWalletAddress);
      const shelleyChangeAddress = Address.from_bech32(changeAddress);

      let txOutputBuilder: any = TransactionOutputBuilder.new();
      txOutputBuilder = txOutputBuilder.with_address(shelleyOutputAddress);
      txOutputBuilder = txOutputBuilder.next();

      const multiAsset = MultiAsset.new();
      const assets = Assets.new();
      assets.insert(
        AssetName.new(Buffer.from(assetNameHex, "hex")), // Asset Name
        BigNum.from_str(assetQuantity) // How much to send
      );
      multiAsset.insert(
        ScriptHash.from_bytes(Buffer.from(assetPolicyIdHex, "hex")), // PolicyID
        assets
      );

      txOutputBuilder = txOutputBuilder.with_asset_and_min_required_coin(
        multiAsset,
        BigNum.from_str(protocolParams.coinsPerUtxoWord)
      );
      const txOutput = txOutputBuilder.build();

      txBuilder.add_output(txOutput);

      // Find the available UTXOs in the wallet and
      // us them as Inputs
      const txUnspentOutputs = await getTxUnspentOutputs();
      txBuilder.add_inputs_from(txUnspentOutputs, 3);

      // calculate the min fee required and send any change to an address
      txBuilder.add_change_if_needed(shelleyChangeAddress);

      // once the transaction is ready, we build it to get the tx body without witnesses
      const txBody = await txBuilder.build();

      // Tx witness
      const transactionWitnessSet = TransactionWitnessSet.new();

      const tx: any = Transaction.new(
        txBody,
        TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes())
      );

      let txVkeyWitnesses = await injectedWallet.signTx(
        Buffer.from(tx.to_bytes(), "utf8").toString("hex"),
        true
      );
      txVkeyWitnesses = TransactionWitnessSet.from_bytes(
        Buffer.from(txVkeyWitnesses, "hex")
      );

      transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());

      const signedTx: any = Transaction.new(tx.body(), transactionWitnessSet);

      const submittedTxHash = await injectedWallet.submitTx(
        Buffer.from(signedTx.to_bytes(), "utf8").toString("hex")
      );

      return submittedTxHash;
    } catch (error) {
      console.log("Error on transferToken: ", error);
      throw error;
    }
  };

  const transferTokensWithMatadata = async (
    walletName: string,
    transferWalletAddress: string,
    assetQuantity: string,
    matadata: any
  ) => {
    try {
      await connectWallet(walletName);
      const txBuilder = await initTransactionBuilder();
      const changeAddress = await getChangeAddress();
      const shelleyOutputAddress = Address.from_bech32(transferWalletAddress);
      const shelleyChangeAddress = Address.from_bech32(changeAddress);

      const map = MetadataMap.new();
      const r = matadata.signature.slice(0, 64);
      const s = matadata.signature.slice(64, 128);
      const v = matadata.signature.slice(128, 130);
      const r1 = matadata.registrationId.slice(0, 64);
      const r2 = matadata.registrationId.slice(64, 88);

      map.insert(
        TransactionMetadatum.new_text("s1"),
        TransactionMetadatum.new_text(r)
      );
      map.insert(
        TransactionMetadatum.new_text("s2"),
        TransactionMetadatum.new_text(s)
      );
      map.insert(
        TransactionMetadatum.new_text("s3"),
        TransactionMetadatum.new_text(v)
      );
      map.insert(
        TransactionMetadatum.new_text("wid"),
        TransactionMetadatum.new_text(matadata.airdropWindowId)
      );
      map.insert(
        TransactionMetadatum.new_text("r1"),
        TransactionMetadatum.new_text(r1)
      );
      map.insert(
        TransactionMetadatum.new_text("r2"),
        TransactionMetadatum.new_text(r2)
      );
      const metadatum = TransactionMetadatum.new_map(map);
      const generalMatadata = GeneralTransactionMetadata.new();
      generalMatadata.insert(BigNum.from_str("1"), metadatum);

      txBuilder.set_metadata(generalMatadata);

      txBuilder.add_output(
        TransactionOutput.new(
          shelleyOutputAddress,
          Value.new(BigNum.from_str(assetQuantity.toString()))
        )
      );
      // Find the available UTXOs in the wallet and
      // us them as Inputs
      const txUnspentOutputs = await getTxUnspentOutputs();
      txBuilder.add_inputs_from(txUnspentOutputs, 0);

      // calculate the min fee required and send any change to an address
      txBuilder.add_change_if_needed(shelleyChangeAddress);
      // once the transaction is ready, we build it to get the tx body without witnesses
      const tx: any = txBuilder.build_tx();
      const transactionWitnessSet = TransactionWitnessSet.new();

      let txVkeyWitnesses = await injectedWallet.signTx(
        Buffer.from(tx.to_bytes(), "utf8").toString("hex"),
        true
      );
      txVkeyWitnesses = TransactionWitnessSet.from_bytes(
        Buffer.from(txVkeyWitnesses, "hex")
      );

      transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());

      const signedTx: any = Transaction.new(
        tx.body(),
        transactionWitnessSet,
        tx.auxiliary_data()
      );

      const submittedTxHash = await injectedWallet.submitTx(
        Buffer.from(signedTx.to_bytes(), "utf8").toString("hex")
      );

      return submittedTxHash;
    } catch (error) {
      console.log("Error on transferToken: ", error);
      throw error;
    }
  };

  return {
    connectWallet,
    getChangeAddress,
    getTokensAndBalance,
    supportedWallets,
    transferTokens,
    transferTokensWithMatadata,
    detectCardanoInjectableWallets,
    getBalanceByPolicyScriptId,
    getUsedAddresses,
  };
};
