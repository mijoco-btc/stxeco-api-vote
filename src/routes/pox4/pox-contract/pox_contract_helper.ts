import { getPartialStackedByCycle } from "@mijoco/stx_helpers/dist/pox/pox";
import { getConfig } from "../../../lib/config";

export async function getPoxBitcoinAddressInfo(address:string, cycle:number, sender:string):Promise<any> {
  return {
    partialStackedByCycle: await getPartialStackedByCycle(getConfig().stacksApi, getConfig().network, getConfig().poxContractId!, address, cycle, sender),
  };
}



