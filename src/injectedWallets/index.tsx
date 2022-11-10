import {
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { supportingInjectableWallets } from "../utils/supportedWallets";
import useInjectableWalletHook from "../lib/useInjectableWalletHook";

const InjectedWallets = () => {
  const { supportedWallets, connectWallet } = useInjectableWalletHook(
    supportingInjectableWallets, "5"
  );

  return (
    <List dense>
      {supportedWallets.map((wallet : any) => {
        return (
          <ListItem
            sx={{ borderBottom: "1px solid #f6f6f6" }}
            key={wallet.walletIdentifier}
          >
            <ListItemButton
              onClick={() => {
                connectWallet(wallet.walletIdentifier);
              }}
            >
              <ListItemText primary={wallet.name} />
              <Avatar src={wallet.icon} />
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

export default InjectedWallets;
