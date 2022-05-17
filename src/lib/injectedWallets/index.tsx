import { supportedInjectableWallets } from "../../utils/supportedWallets";
import useInjectableWalletHook from "./hooks/useInjectableWalletHook";

const InjectedWallets = () => {
  const {} = useInjectableWalletHook();

  return <div>Display wallets</div>;
};

export default InjectedWallets;
