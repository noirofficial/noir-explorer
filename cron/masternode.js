
require('babel-polyfill');
require('../lib/cron');
const config = require('../config');
const { exit, rpc } = require('../lib/cron');
const fetch = require('../lib/fetch');
const { forEach } = require('p-iteration');
const locker = require('../lib/locker');
const moment = require('moment');
const { CarverAddress } = require('../model/carver2d')
// Models.
const Masternode = require('../model/masternode');

/**
 * Get a list of the mns 
 */
async function syncMasternode() {
  // Increase the timeout for masternode.
  //@todo remove this and properly sync nodes instead
  // Commented this out for now to see what effect it would have. Theoretically there shouldn't be any issues 
  //rpc.timeout(10000); // 10 secs

  const date = moment().utc().startOf('minute').toDate();

  const mns = await rpc.call('noirnodelist', ['full']);
  const newMasternodes = [];
  const addressesToFetch = [];
  const mnsCount = Object.keys(mns).length;
  /*console.log(mnsCount);
  console.log(mns);*/
  var counter = 0;
  for (var i in mns) {
    //console.log(i);
    var str = mns[i];
    var str2 = i;
    counter++;
    /*console.log('rank: ' + counter);
    console.log('network: mainnet');
    console.log('txHash: ' + str2.substr(10, 64).trim());
    console.log('txOutIdx: ' + str2.substr(76, 1).trim());
    console.log('status: ' + str.substr(0, 18).trim());
    console.log('addr: ' + str.substr(25, 34).trim());
    console.log('ver: ' + str.substr(19, 6).trim());
    console.log('lastAt: ' + str.substr(60, 10).trim())
    console.log('active: ' + str.substr(70, 10).trim())
    console.log('lastPaidAt: ' + str.substr(80, 10).trim())*/
    const masternode = {
      rank: counter,
      network: "mainnet",
      txHash: str2.substr(10, 64).trim(),
      txOutIdx: str2.substr(76, 1).trim(), // @todo rename to outidx
      status: str.substr(0, 18).trim(),
      addr: str.substr(25, 34).trim(),
      ver: str.substr(19, 6).trim(), //@todo rename to version
      lastAt: new Date(str.substr(60, 10).trim() * 1000), // @todo rename to lastseen
      active: str.substr(70, 10).trim(), // @todo rename to activetime
      lastPaidAt: new Date(str.substr(80, 10).trim() * 1000), // @todo rename to lastpaidat

      createdAt: date,
    };

    newMasternodes.push(new Masternode(masternode));

    addressesToFetch.push(masternode.addr);
    addressesToFetch.push(`${masternode.addr}:MN`);
  }


  const carverAddresses = await CarverAddress.find({ label: { $in: addressesToFetch } });
  newMasternodes.forEach(newMasternode => {
    const carverAddress = carverAddresses.find(carverAddress => carverAddress.label === newMasternode.addr);
    const carverAddressMn = carverAddresses.find(carverAddress => carverAddress.label === `${newMasternode.addr}:MN`);

    if (carverAddress) {
      newMasternode.carverAddress = carverAddress._id;
    }

    if (carverAddressMn) {
      newMasternode.carverAddressMn = carverAddressMn._id;
    }
  });


  if (newMasternodes.length) {
    await Masternode.remove({}); //@ We need to rework this 
    await Masternode.insertMany(newMasternodes);
  }
}

/**
 * Handle locking.
 */
async function update() {
  const type = 'masternode';
  let code = 0;

  try {
    locker.lock(type);
    await syncMasternode();
  } catch (err) {
    console.log(err);
    code = 1;
  } finally {
    try {
      locker.unlock(type);
    } catch (err) {
      console.log(err);
      code = 1;
    }
    exit(code);
  }
}

update();
