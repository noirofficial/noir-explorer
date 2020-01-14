
require('babel-polyfill');
const mongoose = require('mongoose');
const blockchain = require('../lib/blockchain');
const config = require('../config');
const { exit, rpc } = require('../lib/cron');
const { forEachSeries } = require('p-iteration');
const locker = require('../lib/locker');
const util = require('./util');
const carver2d = require('./carver2d');
const { CarverAddressType, CarverMovementType, CarverTxType } = require('../lib/carver2d');
const { CarverMovement, CarverAddress, CarverAddressMovement } = require('../model/carver2d');
const { UTXO } = require('../model/utxo');

// Models.
const Block = require('../model/block');
const { BlockRewardDetails } = require('../model/blockRewardDetails');

/**
 * console.log but with date prepended to it
 */
console.dateLog = (...log) => {
  if (!config.verboseCron) {
    console.log(...log);
    return;
  }

  const currentDate = new Date().toGMTString();
  console.log(`${currentDate}\t`, ...log);
}

/**
 * Process the blocks and transactions.
 * @param {Number} start The current starting block height.
 * @param {Number} stop The current block height at the tip of the chain.
 * @param {Number} sequence For blockchain sequencing (last sequence of inserted block)
 */
async function syncBlocks(start, stop, sequence) {
  let block = null;

  // Addresses like COINBASE, FEE, MN, POS, ZEROCOIN will be stored in common address cache (this cache is not cleared during sync as these are common addresses)
  const commonAddressCache = new Map();
  // Instead of fetching addresses each time from db we'll store a certain number in cache (this is in config)
  const normalAddressCache = new Map();

  /**
   * Fetches address from one of the caches above (we could potentially have more cache types in the future)
   */
  const getCarverAddressFromCache = (label) => {
    const commonAddressFromCache = commonAddressCache.get(label);
    if (commonAddressFromCache) {
      return commonAddressFromCache;
    }

    const normalAddressFromCache = normalAddressCache.get(label);
    if (normalAddressFromCache) {
      return normalAddressFromCache;
    }
    return null;
  }

  for (let height = start + 1; height <= stop; height++) {
    const hash = await rpc.call('getblockhash', [height]);
    const rpcblock = await rpc.call('getblock', [hash]);
    const blockDate = new Date(rpcblock.time * 1000);
    block = new Block({
      _id: new mongoose.Types.ObjectId(),
      hash,
      height,
      bits: rpcblock.bits,
      confirmations: rpcblock.confirmations,
      createdAt: blockDate,
      diff: rpcblock.difficulty,
      merkle: rpcblock.merkleroot,
      nonce: rpcblock.nonce,
      prev: (rpcblock.height == 1) ? 'GENESIS' : rpcblock.previousblockhash ? rpcblock.previousblockhash : 'UNKNOWN',
      size: rpcblock.size,
      txs: [],
      ver: rpcblock.version,
      isConfirmed: rpcblock.confirmations > config.blockConfirmations // We can instantly confirm a block if it reached the required number of confirmations (that way we don't have to reconfirm it later)
    });

    // Flush cache every X addresses (set in config)
    if (normalAddressCache.size > config.blockSyncAddressCacheLimit) {
      normalAddressCache.clear();
    }


    const sequenceStart = sequence;

    // Count how many inputs/outputs are in each block
    let vinsCount = 0;
    let voutsCount = 0;


    for (let txIndex = 0; txIndex < rpcblock.tx.length; txIndex++) {
      const txhash = rpcblock.tx[txIndex];
      const rpctx = await util.getTX(txhash, false);


      let updatedAddresses = new Map(); // @todo this could be a Set<CarverAddress> instead of Map<addressLabel,CarverAddress>


      config.verboseCronTx && console.log(`txId: ${rpctx.txid}`);

      if ((block.height ==   4413 && rpctx.txid == "5a3780fa2e28a89044f0a9c3ee197a891e325dda560c5c2de76f12b319935b56")
       || (block.height ==   4413 && rpctx.txid == "c20a96e2b9875efc6d8ccf7c4595737196a8d509774bcec4c58056736e1de22d")
       || (block.height ==   4413 && rpctx.txid == "d7dc3783ce4bd9b1670542ba1a03327d3d19788e90dbd332a42a1f12d1306b82")
       || (block.height ==   4595 && rpctx.txid == "41f6a86d69b666a9ebe6279759e33bfc1c5cde5685b26618467392c3634cfffe")
       || (block.height ==   4951 && rpctx.txid == "36332f0798d31591ba28f6a0d96ce8f626230153a19b11fbe0412a29ddb68cdb")
       || (block.height ==   6340 && rpctx.txid == "ebf1117df58ca76deeeff61e5e6155a87d9a8defb0550874a77e4db2a10cb842")
       || (block.height ==   6406 && rpctx.txid == "9948f84762338742a478d052441ddc836cdfef038eb7036ff86c7ea7371da2c8")
       || (block.height ==   8473 && rpctx.txid == "393f3a841fcc2e73e043c8d2d8903acb6bbf8787bd20eb2a8e746dd3bfee398f")
       || (block.height ==   8474 && rpctx.txid == "14484f5f5abc2d4ccd13c4ce2b99956da76c93157d99bff3bd03c795d0748abb")
       || (block.height ==  28043 && rpctx.txid == "24be83b939eae57dcbf3f14c2c5e49ac43c0287f07d7e7764a8e83b4751d9782")
       || (block.height ==  28063 && rpctx.txid == "caa9a0c59f357c678633f0dcc2bd935fc6c4898285e0a84966b5e774ef8543c6")
       || (block.height ==  28064 && rpctx.txid == "7a79108b49786532920174a1712bedea5df49ddb4d46de480a4c90df7cae5be0")
       || (block.height ==  28127 && rpctx.txid == "e0c8609f813f451b0557b676d9ebf42702ea179b75f65107cf8cad9c15e16961")
       || (block.height ==  28176 && rpctx.txid == "fe9ba251988f8563b9bddfd5e91b30369057a9c3a20af96047f8ef04f1ffbcb2")
       || (block.height ==  28190 && rpctx.txid == "70b65e8eb3afea32509536e4c4af3c0989421a511d37287b368c91cd10ec48f4")
       || (block.height ==  28201 && rpctx.txid == "6ac1bd060903c3edc17ff37a848da48ac7dcdb542cc5e85d5e3a0167371ef02a")
       || (block.height ==  28201 && rpctx.txid == "6a299964382de2676dd4025aeaa1fd551236c8444e87de7ec375d685ca64f564")
       || (block.height ==  28201 && rpctx.txid == "bf946812a60bc6c43b9ebb541611b76cd34443dd75cd94a02f9d879b33ed96e4")
       || (block.height == 231326 && rpctx.txid == "39a427dafd7e959f98642354058a7e94f974ffc1fef21f081a595b8f0019d571")
       || (block.height == 231336 && rpctx.txid == "b79c6f9620cb142ffe6712a8226ff1dc631868c695515d5572f4b945182fc488")
       || (block.height == 231364 && rpctx.txid == "7568ab2af5521bc8e398ec1cb11b8e9df85fd531bc4ee4a4d062b07fba6b2dee")
       || (block.height == 231378 && rpctx.txid == "438717a415c56ae150df92e8b482b48c2712ad842ea78f7ba3458343f78990a9")
       || (block.height == 231379 && rpctx.txid == "e57ee908e7bdfdde28da44ea2572c86fd5f861dc40684c22916742c4cd78bb39")
       || (block.height == 232429 && rpctx.txid == "5d90cb03018cd3da09bcde6fe952e94c614f91a1f51abff7cac90543e90f7040")
       || (block.height == 232430 && rpctx.txid == "35475efcf64c50b20f572918c6299681296a318384f9392e9bf238acc0f43734")
       || (block.height == 232431 && rpctx.txid == "8e95b598af43ed4e0b180040f26c8584cdc151e615a0c38dec8d5cb33b213626")
       || (block.height == 232921 && rpctx.txid == "293f252e60a3a15e62c2410027cd5a461dda5f1799fa6ba6364ea8adcc292758")
       || (block.height == 233981 && rpctx.txid == "498ba92b27ecd617ec273af5fe70f5524b72a9fedab1eab77ef547ce9bb2cec4")
       || (block.height == 234949 && rpctx.txid == "eb31a2279643f0da2aabbdc2698975219a5ee7528a40a7be8f1d8fd121eb66e1")
       || (block.height == 236433 && rpctx.txid == "cd103a6ef4efa5bad6f8fb14d392326fc4f5dcaa4c6453c08af3a05d39bf86d9")
       || (block.height == 237228 && rpctx.txid == "95671204c731edff9f4c1fde105629e95abb263d590771c5ede400fe78681648")
       || (block.height == 240962 && rpctx.txid == "f1d3ff8bb9c13aad3cd85d40a8bfa7bd2f8e6187ccb5b770218042b6eead2b8e")
       || (block.height == 248400 && rpctx.txid == "e90da6ac7435ccd2652248f6b86bf9c9524922271425cda89c343ed4b2b6152b")
         ) {
        continue;
      }

      vinsCount += rpctx.vin.length;
      voutsCount += rpctx.vout.length;

      // Start Carver2D Data Analysis. Empty POS txs do not need to be processed
      if (!util.isEmptyNonstandardTx(rpctx)) {
        // Get UTXOS for all inputs that have txid+vout
        const vinUtxos = await carver2d.getVinUtxos(rpctx);

        const params = {
          rpcblock,
          rpctx,

          commonAddressCache,
          normalAddressCache,
          vinUtxos
        };

        // Convert tx into new pending CarverMovement object
        const parsedMovement = await carver2d.getRequiredMovement(params);
        const isReward = parsedMovement.txType === CarverTxType.ProofOfWork || parsedMovement.txType === CarverTxType.ProofOfStake;

        // Go through all used addresses in this tx and make sure they're loaded in cache (we will access the cache outside and we want all addresses to be there)
        await carver2d.fillAddressCache(params, parsedMovement.consolidatedAddressMovements);

        let newCarverAddressMovements = [];
        let carverAddressesToInsert = [];
        let carverAddressesToUpdate = [];
        let addressesIn = 0;
        let addressesOut = 0;

        const newCarverMovementId = new mongoose.Types.ObjectId();

        parsedMovement.consolidatedAddressMovements.forEach(movementData => {
          sequence++;

          const addressFromCache = getCarverAddressFromCache(movementData.label);
          if (!addressFromCache) {
            throw `Could not find address: ${movementData.label}`
          }

          // We don't want to count movements to address of the rewards. That way the received/sent balance on address is only for non-reward transactions
          const shouldCountTowardsMovement = !isReward || isReward && addressFromCache.carverAddressType !== CarverAddressType.Address;

          if (movementData.amountOut > 0) {
            if (shouldCountTowardsMovement) {
              addressFromCache.countOut++;
              addressFromCache.valueOut += movementData.amountOut;
            }
            addressFromCache.balance -= movementData.amountOut;
            addressesIn++;
          }

          if (movementData.amountIn > 0) {
            if (shouldCountTowardsMovement) {
              addressFromCache.countIn++;
              addressFromCache.valueIn += movementData.amountIn;
            }
            addressFromCache.balance += movementData.amountIn;
            addressesOut++;
          }

          addressFromCache.sequence = sequence;
          const lastMovement = addressFromCache.lastMovement;
          //addressFromCache.lastMovement = newCarverMovementId;

          // Do we need to insert or update this address? (if _id is null then add to batch insert otherwise batch updates)
          if (!addressFromCache._id) {
            addressFromCache._id = new mongoose.Types.ObjectId();
            addressFromCache.isNew = false; // Mark this mongoose document as not new (we're batch insert it outselves and next time we're calling .save() on it we want it to update instead of trying to insert)
            carverAddressesToInsert.push(addressFromCache);
          } else {
            carverAddressesToUpdate.push(addressFromCache);
          }

          let newCarverAddressMovement = new CarverAddressMovement({
            _id: new mongoose.Types.ObjectId(),
            date: parsedMovement.date,
            blockHeight: parsedMovement.blockHeight,

            carverAddress: addressFromCache._id,
            carverMovement: newCarverMovementId,
            amountIn: movementData.amountIn,
            amountOut: movementData.amountOut,
            balance: addressFromCache.balance - movementData.amount,
            sequence,
            previousAddressMovement: lastMovement,
            isReward
          });
          addressFromCache.lastMovement = newCarverAddressMovement._id;
          addressFromCache.lastMovementDate = newCarverAddressMovement.date;
          addressFromCache.lastMovementBlockHeight = newCarverAddressMovement.blockHeight;
          newCarverAddressMovements.push(newCarverAddressMovement);

          updatedAddresses.set(addressFromCache.label, addressFromCache);
        });

        await UTXO.insertMany(parsedMovement.newUtxos);


        const newCarverMovement = new CarverMovement({
          _id: newCarverMovementId,
          txId: parsedMovement.txId,
          txType: parsedMovement.txType,
          amountIn: parsedMovement.amountIn,
          amountOut: parsedMovement.amountOut,
          blockHeight: parsedMovement.blockHeight,
          date: parsedMovement.date,
          sequence,
          addressesIn,
          addressesOut,
          isReward
        });

        if (isReward) {
          const newBlockRewardDetails = await carver2d.getBlockRewardDetails(rpcblock, rpctx, parsedMovement, newCarverMovement, updatedAddresses);
          await newBlockRewardDetails.save();
          newCarverMovement.blockRewardDetails = newBlockRewardDetails._id;
        }
        await newCarverMovement.save();

        // Insert ledger movements for address
        await CarverAddressMovement.insertMany(newCarverAddressMovements);

        // Insert any new addresses that were used in this tx
        await CarverAddress.insertMany(carverAddressesToInsert);

        // Update all addresses in parallel
        await Promise.all(carverAddressesToUpdate.map(
          async (updatedAddress) => {
            await updatedAddress.save();
          }));
      }
    }

    block.vinsCount = vinsCount;
    block.voutsCount = voutsCount;
    block.sequenceStart = sequenceStart;
    block.sequenceEnd = sequence;

    // Notice how this is done at the end. If we crash half way through syncing a block, we'll re-try till the block was correctly saved.
    await block.save();

    const syncPercent = ((block.height / stop) * 100).toFixed(2);
    console.dateLog(`(${syncPercent}%) Height: ${block.height}/${stop} Hash: ${block.hash} Txs: ${rpcblock.tx.length} Vins: ${vinsCount} Vouts: ${voutsCount} Caches: ${normalAddressCache.size} (addresses)/${commonAddressCache.size} (common)`);



    // Uncomment to test unreconciliation (5% chance to unreconcile last 1-10 blocks)
    /*if (Math.floor((Math.random() * 100) + 1) < 5) {    //if (height % 3 == 0) {
      let dropNumBlocks = Math.floor((Math.random() * 10) + 1);
      console.log(`Dropping ${dropNumBlocks} blocks`)
      await undoCarverBlockMovements(height - dropNumBlocks + 1);
      height -= dropNumBlocks;

      // Clear caches because the addresses could now be invalid
      commonAddressCache.clear();
      normalAddressCache.clear(); // Clear cache because the addresses could now be invalid

      // Restore sequence to proper number
      const block = await Block.findOne().sort({ height: -1 });
      if (block) {
        sequence = block.sequenceEnd;
      } else {
        sequence = 0;
      }
    }*/


  }
}
/**
 * Unwind all movements in a block and delete the block & all movements / addresses created in this block (or after this block)
 */
async function undoCarverBlockMovements(height) {
  console.dateLog(`Undoing block > ${height}`);
  await Block.remove({ height: { $gte: height } }); // Start with removing all the blocks (that way we'll get stuck in dirty state in case this crashses requiring to undo carver movements again)
  await UTXO.remove({ blockHeight: { $gte: height } });
  await BlockRewardDetails.remove({ blockHeight: { $gte: height } });

  let sequence = 0;

  // Iterate over movements 1000 at a time backwards through most recent movements that were created
  // These could be partial (if we failed saving some during last sync in case of hard reset)
  while (true) {

    let updatedAddresses = new Map();

    const parsedMovements = await CarverAddressMovement
      .find({ blockHeight: { $gte: height } })
      .sort({ sequence: -1 })
      .limit(1000)
      .populate('carverAddress')
      .populate('previousAddressMovement', { sequence: 1, date: 1, blockHeight: 1 });

    if (parsedMovements.length === 0) {
      console.log(`No more movements for block: ${height}`)
      break;
    }
    console.log(`Undoing ${parsedMovements.length} movements. Sequences ${parsedMovements[parsedMovements.length - 1].sequence} to ${parsedMovements[0].sequence}`)

    parsedMovements.forEach(parsedMovement => {
      sequence = parsedMovement.sequence;

      const carverAddress = updatedAddresses.has(parsedMovement.carverAddress.label) ? updatedAddresses.get(parsedMovement.carverAddress.label) : parsedMovement.carverAddress;


      const isReward = parsedMovement.isReward;

      // We don't want to count movements to address of the rewards. That way the received/sent balance on address is only for non-reward transactions
      const shouldCountTowardsMovement = !isReward || isReward && carverAddress.carverAddressType !== CarverAddressType.Address;

      if (sequence === carverAddress.sequence) {
        if (parsedMovement.amountIn > 0) {
          if (shouldCountTowardsMovement) {
            carverAddress.countIn--;
            carverAddress.valueIn -= parsedMovement.amountIn;
          }
          carverAddress.balance -= parsedMovement.amountIn;
        }
        if (parsedMovement.amountOut > 0) {
          if (shouldCountTowardsMovement) {
            carverAddress.countOut--;
            carverAddress.valueOut -= parsedMovement.amountOut;
          }
          carverAddress.balance += parsedMovement.amountOut;
        }
        if (parsedMovement.previousAddressMovement) {
          carverAddress.lastMovement = parsedMovement.previousAddressMovement._id;
          carverAddress.lastMovementDate = parsedMovement.previousAddressMovement.date;
          carverAddress.lastMovementBlockHeight = parsedMovement.previousAddressMovement.blockHeight;
          carverAddress.sequence = parsedMovement.previousAddressMovement.sequence;
        } else {
          carverAddress.lastMovement = null;
          carverAddress.sequence = 0;
        }

        updatedAddresses.set(carverAddress.label, carverAddress);
      } else if (carverAddress.sequence > sequence) {
        throw `UNRECONCILIATION ERROR: Out-of-sequence carverAddress movement: ${carverAddress.sequence}>${sequence}`;
      }

    });

    /**
     * First we will ensure we save all addresses with the updated sequence.
     * If we fail anywhere here it's ok because we can resume without any errors.
     */
    await Promise.all([...updatedAddresses.values()].map(
      async (updatedAddress) => {
        await updatedAddress.save();
      }));


    if (sequence > 0) {
      await CarverAddressMovement.deleteMany({ sequence: { $gte: sequence } });
    }
  }

  await CarverMovement.deleteMany({ blockHeight: { $gte: height } });
  // Finally after unwinding we can remove all addresses that were created in/after this block
  await CarverAddress.remove({ blockHeight: { $gte: height } });
}
/**
 * Recursive Sequential Blockchain Unreconciliation (Undo carver movements on last block if merkle roots don't match and re-run confirmations again otherwise confirm block)
 */
async function confirmBlocks(rpcHeight) {
  let startHeight = 1;

  const lastBlock = await Block.findOne().sort({ height: -1 });

  // Find most recently confirmed block (there might not be any)
  const lastConfirmedBlock = await Block.findOne({ isConfirmed: true }).sort({ height: -1 });
  if (lastConfirmedBlock) {
    startHeight = lastConfirmedBlock.height + 1;
  }
  if (startHeight >= rpcHeight) {
    console.dateLog(`No block confirmations required (All previous blocks have been confirmed)`);
    return;
  }
  console.dateLog(`Confirming Blocks (${startHeight} to ${rpcHeight})`);

  // Go through each block and ensure merkle root matches (if above config.blockConfirmations)
  for (var height = startHeight; height <= rpcHeight; height++) {
    config.verboseCron && console.dateLog(`Confirming block ${height}/${rpcHeight}...`);

    const block = await Block.findOne({ height });
    if (!block) {
      console.dateLog(`Block ${height} doesn't exist...`);
      break;
    }

    const hashOfBlockToConfirm = await rpc.call('getblockhash', [block.height]);
    const rpcBlockToConfirm = await rpc.call('getblock', [hashOfBlockToConfirm]);

    if (rpcBlockToConfirm.confirmations < config.blockConfirmations) {
      console.dateLog(`Stopping confirmations at block ${height}. Not enough confirmations. (${rpcBlockToConfirm.confirmations}/${config.blockConfirmations})`)
      break;
    } else if (block) {
      if (block.merkle != rpcBlockToConfirm.merkleroot) {
        console.log('Undoing last block...');

        await undoCarverBlockMovements(lastBlock.height);

        await confirmBlocks(rpcHeight); // Re-run block conifrms again to see if we need to undo another block
        return;
      } else {
        block.isConfirmed = true;
        await block.save();
      }
    }
  }
}

/**
 * Handle locking.
 */
async function update() {
  const type = 'block';
  let code = 0;
  let hasAcquiredLocked = false;

  config.verboseCron && console.dateLog(`Block Sync Started`)
  try {

    if (!isNaN(process.argv[2])) {
      const undoHeight = parseInt(process.argv[2], 10);
      console.dateLog(`[CLEANUP] UNDOING all carver movements height >= ${undoHeight}`);
      await undoCarverBlockMovements(undoHeight); // Uncomment this to test unreconciling a bunch of blocks
      console.dateLog(`[CLEANUP] All movements unreconciled successfully!`);

      // Silently fail unlocking failure (worst case when you re-run normal version you will get same error and you can rm the file manually)
      try {
        locker.unlock(type);
      } catch (ex) { }

      return;
    }

    // Create the cron lock, if return is called below the finally will still be triggered releasing the lock without errors
    // Notice how we moved the cron lock on top so we lock before block height is fetched otherwise collisions could occur
    locker.lock(type);
    hasAcquiredLocked = true;
    const info = await rpc.call('getinfo');

    // Before syncing we'll confirm merkle root of X blocks back
    await confirmBlocks(info.blocks);

    const block = await Block.findOne().sort({ height: -1 });

    // Find any address/movement with sequence afer this block (so we can properly undo corrupt data)
    if (block) {
      const lastCarverMovement = await CarverMovement.findOne().sort({ sequence: -1 });
      const lastCarverAddress = await CarverAddress.findOne().sort({ sequence: -1 });
      const lastUtxo = await UTXO.findOne().sort({ blockHeight: -1 });

      if (lastCarverMovement && lastCarverMovement.sequence > block.sequenceEnd ||
        lastCarverAddress && lastCarverAddress.sequence > block.sequenceEnd ||
        lastUtxo && lastUtxo.blockHeight > block.height
      ) {
        console.dateLog("[CLEANUP] Partial block entry found, removing corrupt sync data");
        await undoCarverBlockMovements(block.height + 1);
      }
    } else {
      console.dateLog("[CLEANUP] No blocks found, erasing all carver movements");
      await undoCarverBlockMovements(1);
    }


    let sequence = block ? block.sequenceEnd : 0;

    let clean = true;
    let dbHeight = block && block.height ? block.height : 0;
    let rpcHeight = info.blocks;

    // If you pass in a parameter into the sync script then we will assume that this is the current tip
    // All blocks after this will be dirty and will be removed
    if (!isNaN(process.argv[3])) {
      clean = true;
      rpcHeight = parseInt(process.argv[3], 10);
    }

    console.dateLog(`DB Height: ${dbHeight}, RPC Height: ${rpcHeight}, Clean Start: (${clean ? "YES" : "NO"})`);

    // If last db block matches rpc block (or forced rpc block number) then no syncing is required
    if (dbHeight >= rpcHeight) {
      console.dateLog(`No Sync Required!`);
      return;
    }
    config.verboseCron && console.dateLog(`Sync Started!`);
    await syncBlocks(dbHeight, rpcHeight, sequence);
    config.verboseCron && console.dateLog(`Sync Finished!`);
  } catch (err) {
    console.log(err);
    console.dateLog(`*** Cron Exception!`);
    code = 1;
  } finally {
    // Try to release the lock if lock was acquired
    if (hasAcquiredLocked) {
      locker.unlock(type);
    }

    config.verboseCron && console.log(""); // Adds new line between each run with verbosity
    exit(code);
  }
}

update();
