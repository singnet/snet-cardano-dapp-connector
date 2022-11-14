import React from "react";
import { useInjectableWalletHook } from "snet-cardano-dapp-connector";

const App = () => {
  const { supportedWallets } = useInjectableWalletHook(["NAMI"], "5");

  console.log("===supportedWallets===", supportedWallets);
  return (
    <div>
      {supportedWallets.map((wallet) => (
        <text>{wallet.name}</text>
      ))}
    </div>
  );
};
export default App;
