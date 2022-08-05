function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep() {
  return await timeout(10000);
}

function save(chainId, name, value) {

  const fs = require("fs");

  const filename = './squiddy-addresses/' + chainId + '.json'

  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, "utf8")) : {}

  data[name] = value;

  fs.writeFileSync(filename, JSON.stringify(data, null, 4))

}

async function deploy(name, args=[]) {
  const signers = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(signers[0].address)
  const { chainId } = await ethers.provider.getNetwork();
  const Token = await ethers.getContractFactory(name);
  const finalArgs = [...args, { nonce }] 
  const token = await Token.deploy.apply(Token, finalArgs);
  
  save(chainId, name, token.address); 
  console.log("deployed ", name, "args", args, "contract address: ", token.address);
  await sleep()
  return token.address

}

async function main() {
  // We get the contract to deploy

  const signers = await ethers.getSigners();

  const { chainId } = await ethers.provider.getNetwork();

  save(chainId, "owner", signers[0].address);
  
  // usage is here
  
  
  const Multicall = await deploy("Multicall2");
  const SQUIDDYToken = await deploy("SQUIDDYToken");

  // const WMATIC = await deploy("WVLX");
  const WMATIC =  "0x0db676216A3cdF226dfD1215DA88B6eF87a0a5B2";

  const admins = JSON.parse(require("fs").readFileSync('./squiddy-addresses/admins.json', 'utf8'))

  const defaultTokens = admins.defaultTokens[chainId.toString()];

  //deplay WETH, BUSD, USDT, USDC
  // for (var i=0; i < defaultTokens.length; i++) {
  //   await deploy(defaultTokens[i]);
  // }

  const SQUIDDYStake = await deploy("SQUIDDYStake", [SQUIDDYToken]);

  const _cakePerSecond = "13000000000000000000"
  
  //const blockNumber = await ethers.provider.getBlockNumber();

  const _startTimestamp = parseInt(new Date().getTime() / 1000)
  const _devaddr = admins._devaddr
  //const bonusPeriodSeconds = 10000
  //const bonusEndTimestamp = _startTimestamp + bonusPeriodSeconds
  //const vlxStakingRewardPerSecond = '42000000000000000'
  
  //Timelock
  const Timelock = await deploy("Timelock", [_devaddr, 21700]);

  const SQUIDDYFarm = await deploy("SQUIDDYFarm", [SQUIDDYToken, SQUIDDYStake, _devaddr, _cakePerSecond, _startTimestamp]);

  const SquiddyVault = await deploy("SquiddyVault", [SQUIDDYToken, SQUIDDYStake, SQUIDDYFarm, _devaddr, _devaddr]);

  await deploy("VaultOwner", [SquiddyVault]);

  //await deploy("VLXStaking", [WVLX, WAGToken, vlxStakingRewardPerSecond, _startTimestamp, bonusEndTimestamp, _devaddr, WVLX]);

  await deploy("SQUIDDYStakingFactory");

  //MasterChef _chef, IBEP20 _wagyu, address _admin, address _receiver
  //const LotteryRewardPool = await deploy("LotteryRewardPool", [WAGFarm, WagyuToken, _devaddr, _devaddr]);

  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
