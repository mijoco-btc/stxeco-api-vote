import { serializeCV, uintCV } from "@stacks/transactions";
import { getConfig } from "../../../lib/config";
import { hex } from '@scure/base';
import { StackerDbConfig, callContractReadOnly, getPoxInfo } from "@mijoco/stx_helpers/dist/index";

export async function getSigners(cycle:number):Promise<any> {
  const functionArgs = [`0x${hex.encode(serializeCV(uintCV(cycle)))}`];
  const data = {
    contractAddress: getConfig().signersContractId!.split('.')[0],
    contractName: getConfig().signersContractId!.split('.')[1],
    functionName: 'get-signers',
    functionArgs,
  }
  try { 
    const signers = []
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    if (result.value?.value?.length > 0) {
      for (const el of result.value.value) {
        signers.push({
          signer: el.signer.value,
          weight: el.weight.value
        })
      }
    }
    return signers;
  } catch (e) {
    return []
  }
}

export async function getSignersRecent():Promise<any> {
  const poxInfo = await getPoxInfo(getConfig().stacksApi)
  const currentCycle = poxInfo.current_cycle.id;
  return {
    current: {
      cycle: currentCycle,
      signers: await getSigners(currentCycle)
    },
    previous: {
      cycle: currentCycle - 1,
      signers: await getSigners(currentCycle - 1)
    }
  }
}

export async function stackerdbGetConfig():Promise<StackerDbConfig> {
  const data = {
    contractAddress: getConfig().signersContractId!.split('.')[0],
    contractName: getConfig().signersContractId!.split('.')[1],
    functionName: 'stackerdb-get-config',
    functionArgs: [],
  }
  try {
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    const config:StackerDbConfig = {
      chunkSize: result.value.value['chunk-size'].value,
      hintReplicas: result.value.value['hint-replicas'].value,
      maxNeighbors: result.value.value['max-neighbors'].value,
      maxWrites: result.value.value['max-writes'].value,
      writeFreq: result.value.value['write-freq'].value,
    }
    return config;
  } catch (e) { 
  }
  return {} as StackerDbConfig;
}

export async function stackerdbGetSignerSlotsPage(page:number):Promise<Array<any>> {
  const functionArgs = [`0x${hex.encode(serializeCV(uintCV(page)))}`];
  const data = {
    contractAddress: getConfig().signersContractId!.split('.')[0],
    contractName: getConfig().signersContractId!.split('.')[1],
    functionName: 'stackerdb-get-signer-slots-page',
    functionArgs,
  }
  try {
    const signers = []
    const result = await callContractReadOnly(getConfig().stacksApi, data);
    if (result.value?.value?.length > 0) {
      for (const el of result.value.value) {
        signers.push({
          signer: el.signer.value,
          numSlots: el['num-slots'].value
        })
      }
    }
    return signers;
  } catch (e) {
    return [];
  }
}
