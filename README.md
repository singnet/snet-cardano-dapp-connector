# snet-cardano-dapp-connector

> This is a testing package

[![NPM](https://img.shields.io/npm/v/snet-cardano-dapp-connector.svg)](https://www.npmjs.com/package/snet-cardano-dapp-connector) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save snet-cardano-dapp-connector
```

## Usage

```tsx
import * as React from "react";

import { useInjectableWalletHook } from "snet-cardano-dapp-connector";

const Example = () => {
  const { supportedWallets } = useInjectableWalletHook(["NAMI"], "1");
  <div>
    {supportedWallets.map((wallet) => (
      <text>{wallet.name}</text>
    ))}
  </div>;
};
```

## License

MIT © [Shyam-Khokhariya](https://github.com/Shyam-Khokhariya)

---

This hook is created using [create-react-hook](https://github.com/hermanya/create-react-hook).
