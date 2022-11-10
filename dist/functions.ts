import BigNumber from "bignumber.js";

export const HexToBuffer = (
  string:
    | WithImplicitCoercion<string>
    | { [Symbol.toPrimitive](hint: "string"): string }
) => {
  return Buffer.from(string, "hex");
};

export const HexToAscii = (
  string:
    | WithImplicitCoercion<string>
    | { [Symbol.toPrimitive](hint: "string"): string }
) => {
  return HexToBuffer(string).toString("ascii");
};

export const fromCogs = (value: number, decimals: number) => {
  return new BigNumber(value).dividedBy(10 ** decimals).toString();
};

export const cardanoWalletExtensionError = 'WALLET_EXTENSION_NOT_FOUND';
