import { ConfigDaoI } from "../types/local_types";
import process from "process";

let CONFIG = {} as ConfigDaoI;

export function setDaoConfigOnStart() {
  const network = process.env.NODE_ENV;

  CONFIG.VITE_DOA = process.env[network + "_" + "VITE_DOA"] || "";
  CONFIG.VITE_DOAS = "ecosystem-dao,bitcoin-dao";
  CONFIG.VITE_DOA_SIP_VOTES = process.env[network + "_" + "VITE_DOA_SIP_VOTES"] || "";
  CONFIG.VITE_DOA_VOTING_CONTRACTS = "bde001-proposal-voting";
  CONFIG.VITE_DOA = process.env[network + "_" + "VITE_DOA"] || "";
  CONFIG.VITE_DOA_DEPLOYER = process.env[network + "_" + "VITE_DOA_DEPLOYER"] || "";
  CONFIG.VITE_DOA_EMERGENCY_EXECUTE_EXTENSION = process.env[network + "_" + "VITE_DOA_EMERGENCY_EXECUTE_EXTENSION"] || "";
  CONFIG.VITE_DOA_POX = process.env[network + "_" + "VITE_DOA_POX"] || "";
}

export function getDaoConfig() {
  return CONFIG;
}
