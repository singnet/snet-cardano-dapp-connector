import { useState, useEffect } from "react";
import toLower from "lodash/toLower";
import isNil from "lodash/isNil";
import {
  Address,
  AssetName,
  Assets,
  BigNum,
  LinearFee,
  min_ada_required,
  MultiAsset,
  ScriptHash,
  Transaction,
  TransactionBuilder,
  TransactionBuilderConfigBuilder,
  TransactionOutput,
  TransactionOutputBuilder,
  TransactionOutputs,
  TransactionUnspentOutput,
  TransactionUnspentOutputs,
  TransactionWitnessSet,
  Value,
} from "@emurgo/cardano-serialization-lib-asmjs";
import AssetFingerprint from "@emurgo/cip14-js";
import { HexToAscii } from "../../../utils/functions";

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

  const connectWallet = async (walletName: string) => {
    try {
      const connectingWallet = toLower(walletName);
      console.log("Connecting wallet: ", connectingWallet);
      injectedWallet = await window.cardano[connectingWallet].enable();
    } catch (error) {
      throw error;
    }
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
    let txOutputs = TransactionUnspentOutputs.new();
    const utxos: any = await getUtxos();
    for (const utxo of utxos) {
      txOutputs.add(utxo);
    }
    return txOutputs;
  };

  const transferTokens = async (
    transferWalletAddress: string,
    assetPolicyIdHex: string,
    assetNameHex: string,
    assetQuantity: string
  ) => {
    try {
      const txBuilder = await initTransactionBuilder();
      const changeAddress = await getChangeAddress();
      const shelleyOutputAddress = Address.from_bech32(transferWalletAddress);
      const shelleyChangeAddress = Address.from_bech32(changeAddress);

      let txOutputBuilder: any = TransactionOutputBuilder.new();
      txOutputBuilder = txOutputBuilder.with_address(shelleyOutputAddress);
      txOutputBuilder = txOutputBuilder.next();

      let multiAsset = MultiAsset.new();
      let assets = Assets.new();
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
      const txBody = txBuilder.build();

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

  return {
    connectWallet,
    getChangeAddress,
    getTokensAndBalance,
    supportedWallets,
    transferTokens,
  };
};

export default useInjectableWalletHook;
