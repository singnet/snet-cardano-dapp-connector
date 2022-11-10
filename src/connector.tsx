import { lazy, Suspense } from "react";

const InjectedWallets = lazy(() => import("./injectedWallets"));

declare global {
  interface Window {}
}

const Wallet = () => {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <InjectedWallets />
    </Suspense>
  );
};

export default Wallet;
