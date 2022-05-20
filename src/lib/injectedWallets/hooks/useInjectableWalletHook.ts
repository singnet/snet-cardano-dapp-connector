import { useState, useEffect } from "react";
import toLower from "lodash/toLower";
import isNil from "lodash/isNil";
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

  const getUtxos = async () => {
    let Utxos = [];

    try {
      const rawUtxos = await injectedWallet.getUtxos();

      for (const rawUtxo of rawUtxos) {
        const utxo = TransactionUnspentOutput.from_bytes(
          Buffer.from(rawUtxo, "hex")
        );
        const input: any = utxo.input();

        const txid: any = Buffer.from(
          input.transaction_id().to_bytes(),
          "utf8"
        ).toString("hex");

        const txindx = input.index();
        const output = utxo.output();
        const amount = output.amount().coin().to_str(); // ADA amount in lovelace
        const multiasset = output.amount().multiasset();
        let multiAssetStr = "";

        if (multiasset) {
          const keys = multiasset.keys(); // policy Ids of thee multiasset
          const N = keys.len();
          // console.log(`${N} Multiassets in the UTXO`)

          for (let i = 0; i < N; i++) {
            const policyId: any = keys.get(i);
            const policyIdHex = Buffer.from(
              policyId.to_bytes(),
              "utf8"
            ).toString("hex");
            // console.log(`policyId: ${policyIdHex}`)
            const assets = multiasset.get(policyId);
            const assetNames = assets?.keys();
            const K: any = assetNames?.len();
            // console.log(`${K} Assets in the Multiasset`)

            for (let j = 0; j < K; j++) {
              const assetName: any = assetNames?.get(j);
              const assetNameString = Buffer.from(
                assetName.name(),
                "utf8"
              ).toString();
              const assetNameHex = Buffer.from(
                assetName.name(),
                "utf8"
              ).toString("hex");
              const multiassetAmt = multiasset.get_asset(policyId, assetName);
              multiAssetStr += `+ ${multiassetAmt.to_str()} + ${policyIdHex}.${assetNameHex} (${assetNameString})`;
            }
          }
        }

        const obj = {
          txid: txid,
          txindx: txindx,
          amount: amount,
          str: `${txid} #${txindx} = ${amount}`,
          multiAssetStr: multiAssetStr,
          TransactionUnspentOutput: utxo,
        };
        Utxos.push(obj);
        // console.log(`utxo: ${str}`)
      }
      return Utxos;
    } catch (err) {
      console.log(err);
    }
  };

  const transferTokens = async (
    recepientWalletAddressess: string[],
    walletAddress: string,
    assetNameHex: string,
    assetAmountToSend: string,
    assetPolicyIdHex: string
  ) => {
    const txBuilder = await initTransactionBuilder();
    const shelleyChangeAddress = Address.from_bech32(walletAddress);

    let txOutputBuilder: any = TransactionOutputBuilder.new();
    for (const recepientWalletAddress of recepientWalletAddressess) {
      txOutputBuilder = txOutputBuilder.with_address(
        Address.from_bech32(recepientWalletAddress)
      );
    }

    txOutputBuilder = txOutputBuilder.next();

    let multiAsset = MultiAsset.new();
    let assets = Assets.new();
    assets.insert(
      AssetName.new(Buffer.from(assetNameHex, "hex")), // Asset Name
      BigNum.from_str(assetAmountToSend) // How much to send
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

    // set the time to live - the absolute slot value before the tx becomes invalid
    // txBuilder.set_ttl(51821456);

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
  };

  const transferToken = async (
    recepientWalletAddress: string,
    walletAddress: string,
    assetNameHex: string,
    assetAmountToSend: string,
    assetPolicyIdHex: string
  ) => {
    const txBuilder = await initTransactionBuilder();
    const shelleyOutputAddress = Address.from_bech32(recepientWalletAddress);
    const shelleyChangeAddress = Address.from_bech32(walletAddress);

    let txOutputBuilder: any = TransactionOutputBuilder.new();
    txOutputBuilder = txOutputBuilder.with_address(shelleyOutputAddress);
    txOutputBuilder = txOutputBuilder.next();

    let multiAsset = MultiAsset.new();
    let assets = Assets.new();
    assets.insert(
      AssetName.new(Buffer.from(assetNameHex, "hex")), // Asset Name
      BigNum.from_str(assetAmountToSend) // How much to send
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

    // set the time to live - the absolute slot value before the tx becomes invalid
    // txBuilder.set_ttl(51821456);

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
    transferToken,
    transferTokens,
  };
};

export default useInjectableWalletHook;
