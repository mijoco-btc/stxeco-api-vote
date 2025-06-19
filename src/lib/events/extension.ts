import { hex } from "@scure/base";
import { contractPrincipalCV, serializeCV } from "@stacks/transactions";
import { getConfig } from "../config";
import { callContractReadOnly } from "@mijoco/stx_helpers/dist/index";

export async function isExtension(
  daoContractAddress: string,
  daoContractName: string,
  extensionCid: string
): Promise<{ result: boolean }> {
  const functionArgs = [
    `0x${hex.encode(
      serializeCV(
        contractPrincipalCV(
          extensionCid.split(".")[0],
          extensionCid.split(".")[1]
        )
      )
    )}`,
  ];
  const data = {
    contractAddress: daoContractAddress,
    contractName: daoContractName,
    functionName: "is-extension",
    functionArgs,
  };
  let res: { value: boolean; type: string };
  try {
    res = await callContractReadOnly(getConfig().stacksApi, data);
    return { result: res.value };
  } catch (e) {
    return { result: false };
  }
}
