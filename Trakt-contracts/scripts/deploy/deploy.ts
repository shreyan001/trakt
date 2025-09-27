import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CONTRACTS, deployInBeaconProxy, deployDirectly, getTypedContract } from "../utils/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    // 1. Deploy TEEVerifier
    console.log("Deploying TEE Verifier...");
    await deployDirectly(hre, CONTRACTS.TEEVerifier, ["0x0000000000000000000000000000000000000000"]);
    const verifier_ = await getTypedContract(hre, CONTRACTS.TEEVerifier);
    const verifierAddress = await verifier_.getAddress();
    console.log("TEEVerifier deployed to:", verifierAddress);

    // 1. Deploy ZKPVerifier (alternative)

    // 2. Prepare initialization parameters
    const nftName =  "Trakt Agent";
    const nftSymbol = "PACT";
    const chainURL = process.env.ZG_RPC_URL || "https://evmrpc-testnet.0g.ai";
    const indexerURL = process.env.ZG_INDEXER_URL || "https://indexer-storage-testnet-turbo.0g.ai";

    // 3. Prepare initialization data
    const AgentNFTFactory = await hre.ethers.getContractFactory("AgentNFT");
    const initData = AgentNFTFactory.interface.encodeFunctionData("initialize", [
        nftName,
        nftSymbol,
        verifierAddress,
        chainURL,
        indexerURL
    ]);

    // 4. Deploy AgentNFT with beacon proxy
    await deployInBeaconProxy(
        hre,
        CONTRACTS.AgentNFT,
        false,  // onlyBeacon
        [],     // constructor args
        initData // initialization data
    );

    console.log("Deployment and initialization complete");
};

func.tags = [CONTRACTS.AgentNFT.name, "prod"];
func.dependencies = [];

export default func;