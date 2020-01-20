
const params = {
  LAST_POW_BLOCK: 551001, // 345600
  //RAMP_TO_BLOCK: 960,
  //LAST_SEESAW_BLOCK: 200000
};

const avgBlockTime = 150; // 2.5 minutes (150 seconds)

const blocksPerDay = (24 * 60 * 60) / avgBlockTime; // 960

const blocksPerWeek = blocksPerDay * 7; // 6720

const blocksPerMonth = (blocksPerDay * 365.25) / 12; // 29220

const blocksPerYear = blocksPerDay * 365.25; // 350640

const mncoins = 25000.0;

const getMNBlocksPerDay = (mns) => {
  return blocksPerDay / mns;
};

const getMNBlocksPerWeek = (mns) => {
  return getMNBlocksPerDay(mns) * (365.25 / 52);
};

const getMNBlocksPerMonth = (mns) => {
  return getMNBlocksPerDay(mns) * (365.25 / 12);
};

const getMNBlocksPerYear = (mns) => {
  return getMNBlocksPerDay(mns) * 365.25;
};

const getMNSubsidy = (nHeight = 0, nMasternodeCount = 0, nMoneySupply = 0) => {
  const blockValue = getSubsidy(nHeight);
  let ret = 0.0;

  if (nHeight > 0) {
    ret = blockValue * 0;
  } else if (nHeight > 262099) {
    ret = blockValue * 0.65;
  } else if (nHeight > 479999) {
    ret = blockValue * 0.0000143;
  } else if (nHeight > 480005) {
    ret = blockValue * 0.5;
  }

  return ret;
};

const getSubsidy = (nHeight = 1) => {
  let nSubsidy = 0.0;

  if (nHeight > 0) {
    nSubsidy = 100;
  } else if (nHeight > 104999) {
    nSubsidy = 50;
  } else if (nHeight > 209999) {
    nSubsidy = 12.5;
  } else if (nHeight > 230249) {
    nSubsidy = 50;
  } else if (nHeight > 255250) {
    nSubsidy = 12.5;
  } else if (nHeight > 419999) {
    nSubsidy = 6.25;
  } else if (nHeight > 435005) {
    nSubsidy = 2.2;
  } else if (nHeight > 479999) {
    nSubsidy = 100002.2; 
  } else if (nHeight > 480005) {
    nSubsidy = 2.2;
  }
  

  return nSubsidy;
};

const getROI = (subsidy, mns) => {
  return ((getMNBlocksPerYear(mns) * subsidy) / mncoins) * 100.0;
};

const isAddress = (s) => {
  return typeof (s) === 'string' && (s.length === 34 || ('SIGMA' || 'ZEROCOIN'));
};

const isBlock = (s) => {
  return !isNaN(s) || (typeof (s) === 'string');
};

const isPoS = (b) => {
  return !!b && b.height > params.LAST_POW_BLOCK; // > 182700
};

const isTX = (s) => {
  return typeof (s) === 'string' && s.length === 64;
};

/**
 * How we identify if a raw transaction is Proof Of Stake & Masternode reward
 * @param {String} rpctx The transaction hash string.
 */
const isRewardRawTransaction = (rpctx) => {
  return rpctx.vin.length == 1 &&
    rpctx.vout.length == 3 && // @todo it's possible for reward to have >3 outputs. Ex: "159ff849ae833c3abd05a7b36c5ecc7c4a808a8f1ef292dad0b02875009e009e" on Bulwark Coin (governance)
    // First vout is always in this format
    rpctx.vout[0].value == 0.0 &&
    rpctx.vout[0].n == 0 &&
    rpctx.vout[0].scriptPubKey &&
    rpctx.vout[0].scriptPubKey.type == "nonstandard";

}

module.exports = {
  avgBlockTime,
  blocksPerDay,
  blocksPerMonth,
  blocksPerWeek,
  blocksPerYear,
  mncoins,
  params,
  getMNBlocksPerDay,
  getMNBlocksPerMonth,
  getMNBlocksPerWeek,
  getMNBlocksPerYear,
  getMNSubsidy,
  getSubsidy,
  getROI,
  isAddress,
  isBlock,
  isPoS,
  isTX,
  isRewardRawTransaction
};
