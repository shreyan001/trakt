import { ethers } from "hardhat";

async function main() {
    // 1. deploy new implementation
    console.log("Deploying new implementation...");
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const newImplementation = await AgentNFT.deploy();
    await newImplementation.waitForDeployment();
    console.log("New implementation deployed to:", await newImplementation.getAddress());

    // 2. get Beacon instance
    const beacon = await ethers.getContractAt(
        "UpgradeableBeacon",
        "0x17337fa916E3db08062dFEd31324dDEc5c258832"
    );

    // 3. upgrade implementation
    console.log("Upgrading Beacon...");
    const tx = await beacon.upgradeTo(await newImplementation.getAddress());
    await tx.wait();
    console.log("Upgrade complete");

    // 4. verify upgrade
    const currentImpl = await beacon.implementation();
    console.log("Current implementation:", currentImpl);
    console.log("Upgrade successful:", currentImpl === await newImplementation.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });