import { useState, useEffect } from "react";

const useInjectableWalletHook = () => {
  const [addresses, setAddresses] = useState<string[]>([]);
  const [wallet, setWallet] = useState<any | null>(null); // Type will be set

  const detectCardanoInjectableWallets = () => {
    try {
      const cardano = window?.cardano;

      if (!cardano) {
        throw new Error("Cardano wallet not found");
      }
    } catch (error: any) {
      console.log(JSON.stringify(error));
      throw error;
    }
  };

  useEffect(() => {
    detectCardanoInjectableWallets();
  }, []);

  const getBalance = async () => {
    try {
      if (!wallet) {
        throw new Error("Wallet not connected");
      }

      return await wallet.getBalance();
    } catch (error: any) {
      console.log(JSON.stringify(error));
      throw error;
    }
  };

  const connectWallet = async (walletName: string) => {
    try {
      const injectedWallet: any = await window.cardano[walletName].enable();

      const addresses = await injectedWallet.getUsedAddresses();

      setAddresses(addresses);
      setWallet(injectedWallet);
    } catch (error) {
      throw error;
    }
  };

  return { addresses, wallet, connectWallet, getBalance };
};

export default useInjectableWalletHook;
