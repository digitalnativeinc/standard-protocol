require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");
// const { start } = require("node:repl");
const LPS = require("./test/LiquidityProtectionService.json");

const assert = (condition, message) => {
  if (condition) return;
  throw new Error(message);
};

task("deploy", "Deploy Standard Token").setAction(async () => {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying Standard Token with the account: ${deployer.address}`);

  console.log(
    `Deployer balance: ${ethers.utils.formatEther(
      await deployer.getBalance()
    )} ETH`
  );

  const Token = await ethers.getContractFactory("Standard");
  const token = await Token.deploy();

  console.log("Token address:", token.address);

  console.log("Mining...");
  await token.deployed();
  console.log(
    `Deployer balance: ${ethers.utils.formatEther(
      await deployer.getBalance()
    )} ETH`
  );
});

task("deploy-pool", "Deploy Standard Staking pools")
  .addParam("reward", "Address of the reward token contract")
  .addParam("input", "Address of the input token contract")
  .addParam("starttime", "timestamp when reward starts")
  .setAction(
    async ({ reward: rewardAddress, input: inputAddress, starttime }) => {
      assert(
        ethers.utils.isAddress(rewardAddress),
        `Token address '${rewardAddress}' is invalid.`
      );
      assert(
        ethers.utils.isAddress(inputAddress),
        `Token address '${inputAddress}' is invalid.`
      );

      const [deployer] = await ethers.getSigners();

      console.log(
        `Deploying Standard Staking Pool with the account: ${deployer.address}`
      );

      console.log(
        `Deployer balance: ${ethers.utils.formatEther(
          await deployer.getBalance()
        )} ETH`
      );

      const Pool = await ethers.getContractFactory("WETHSTNDLPTokenSharePool");
      const pool = await Pool.deploy(rewardAddress, inputAddress, starttime);

      console.log("Pool address:", pool.address);

      console.log("Mining...");
      await pool.deployed();
      console.log(
        `Deployer balance: ${ethers.utils.formatEther(
          await deployer.getBalance()
        )} ETH`
      );
    }
  );

task("revoke-blocked", "Revoke tokens from blocked accounts")
  .addParam("token", "Address of the protected token contract")
  .addParam("to", "Address to transfer revoked tokens to")
  .addParam(
    "json",
    'Path to the blocked accounts json. Example: ["0x1234", "0x5678", ...]'
  )
  .setAction(async ({ token: tokenAddress, json, to }) => {
    assert(
      ethers.utils.isAddress(tokenAddress),
      `Token address '${tokenAddress}' is invalid.`
    );
    assert(ethers.utils.isAddress(to), `Revoke to address '${to}' is invalid.`);
    const blocked = require(json);
    for (let account of blocked) {
      assert(
        ethers.utils.isAddress(account),
        `Blocked address '${account}' is invalid.`
      );
    }
    const [sender] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Standard");
    const token = await Token.attach(tokenAddress, Token.interface);

    console.log(
      `Revoking tokens from blocked accounts to ${to}. Transaction sender: ${sender.address}`
    );

    console.log(
      `To balance: ${ethers.utils.formatEther(await token.balanceOf(to))}`
    );
    console.log(
      `Sender balance: ${ethers.utils.formatEther(
        await sender.getBalance()
      )} ETH`
    );

    let tx;
    const batchSize = 50n;
    for (let i = 0n; i <= BigInt(blocked.length) / batchSize; i++) {
      let entries = blocked.slice(
        parseInt(i * batchSize),
        parseInt((i + 1n) * batchSize)
      );
      tx = await token.connect(sender).revokeBlocked(entries, to);
      console.log(`Batch ${i + 1n}: ${tx.hash}`);
    }
    console.log("Mining...");
    await (tx && tx.wait());

    console.log(
      `To balance: ${ethers.utils.formatEther(await token.balanceOf(to))}`
    );
    console.log(
      `Sender balance: ${ethers.utils.formatEther(
        await sender.getBalance()
      )} ETH`
    );
  });

task("disableProtection", "Manually disable liquidity protection")
  .addParam("token", "Address of the protected token contract")
  .setAction(async ({ token: tokenAddress }) => {
    assert(
      ethers.utils.isAddress(tokenAddress),
      `Token address '${tokenAddress}' is invalid.`
    );
    const [sender] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Standard");
    const token = await Token.attach(tokenAddress, Token.interface);

    console.log(
      `Disabling liquidity protection with account: ${sender.address}`
    );

    console.log(
      `Sender balance: ${ethers.utils.formatEther(
        await sender.getBalance()
      )} ETH`
    );

    const tx = await token.connect(sender).disableProtection();
    console.log(`${tx.hash}`);
    console.log("Mining...");
    await tx.wait();

    console.log(
      `Sender balance: ${ethers.utils.formatEther(
        await sender.getBalance()
      )} ETH`
    );
  });

module.exports = {
  networks: {
    target: {
      url: process.env.RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    fork: {
      url: "http://localhost:8545",
    },
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
};
