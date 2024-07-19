import express from "express";
import { getConfig } from "../../../lib/config";
import { checkCallerAllowed, getAllowanceContractCallers, getBurnHeightToRewardCycle, getPoxCycleInfo, getRewardCycleToBurnHeight, getStackerInfoFromContract } from "@mijoco/stx_helpers/dist/pox/pox";
import { getPoxInfo } from "@mijoco/stx_helpers/dist/index";
import { getPoxBitcoinAddressInfo } from "../../voting/pox_entries/pox_contract_helper";

const router = express.Router();

router.get("/info", async (req, res, next) => {
  try {
    const response = await getPoxInfo(getConfig().stacksApi);
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/burn-height-to-reward-cycle/:height", async (req, res, next) => {
  try {
    const cycleInfo = await getBurnHeightToRewardCycle(getConfig().stacksApi, getConfig().poxContractId!, Number(req.params.height));
    return res.send(cycleInfo);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/reward-cycle-to-burn-height/:cycle", async (req, res, next) => {
  try {
    const cycleInfo = await getRewardCycleToBurnHeight(getConfig().stacksApi, getConfig().poxContractId!, Number(req.params.cycle));
    return res.send(cycleInfo);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/check-caller-allowed/:stxAddress", async (req, res, next) => {
  try {
    const cycleInfo = await checkCallerAllowed(getConfig().stacksApi, getConfig().poxContractId!, req.params.stxAddress);
    return res.send(cycleInfo);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/info/cycle/:cycle", async (req, res, next) => {
  try {
    const cycleInfo = await getPoxCycleInfo(getConfig().stacksApi, getConfig().poxContractId!, Number(req.params.cycle));
    return res.send(cycleInfo);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/solo-stacker/:btcAddress/:cycle/:sender", async (req, res, next) => {
  try {
    const btcAddress = req.params.btcAddress
    let response:any = {};
    response = await getPoxBitcoinAddressInfo(btcAddress, Number(req.params.cycle), req.params.sender);
    console.log(response)
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/get-allowance-contract-callers/:address/:contract", async (req, res, next) => {
  try {
    const response = await getAllowanceContractCallers(getConfig().stacksApi, getConfig().poxContractId!, req.params.address, req.params.contract);
    console.log(response)
    return res.send(response);
  } catch (error) {
    console.log('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});

router.get("/stacker/:stxAddress/:cycle", async (req, res, next) => {
  try {
    const stxAddress = req.params.stxAddress
    let response:any = {};
    response = await getStackerInfoFromContract(getConfig().stacksApi, getConfig().network, getConfig().poxContractId!, stxAddress, Number(req.params.cycle));
    response.cycleInfo = await getPoxCycleInfo(getConfig().stacksApi, getConfig().poxContractId!, Number(req.params.cycle));
    console.log(response)
    return res.send(response);
  } catch (error) {
    console.error('Error in routes: ', error)
    next('An error occurred fetching pox-info.')
  }
});


export { router as pox4ContractRoutes }


