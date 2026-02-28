import { useRouter } from "next/router";

import { api } from "@/utils/api";
import { useSiteStore } from "@/lib/zustand/site";
import { useUserStore } from "@/lib/zustand/user";
import { buildMultisigWallet, buildWallet } from "@/utils/common";
import { DbWalletWithLegacy } from "@/types/wallet";

export default function useMultisigWallet() {
  const router = useRouter();
  const walletId = router.query.wallet as string;

  const network = useSiteStore((state) => state.network);
  const userAddress = useUserStore((state) => state.userAddress);

  const { data: wallet, isLoading } = api.wallet.getWallet.useQuery(
    { address: userAddress!, walletId: walletId },
    {
      enabled: walletId !== undefined && userAddress !== undefined,
    },
  );
  if (wallet) {
    const dbWallet = wallet as DbWalletWithLegacy;
    return {
      multisigWallet: buildMultisigWallet(dbWallet, network),
      builtWallet: buildWallet(dbWallet, network),
      wallet: dbWallet,
      isLoading,
    };
  }

  return { multisigWallet: undefined, builtWallet: undefined, wallet: undefined, isLoading };
}
