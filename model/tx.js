
const mongoose = require('mongoose');

/**
 * The transaction object.  Very basic as
 * details will be requested by txid (hash)
 * from the node on demand.  A cache can be
 * implemented if needed for recent txs.
 */
const TX = mongoose.model('TX', new mongoose.Schema({
  __v: { select: false, type: Number },
  _id: { required: true, select: false, type: String },
  block: { index: 1, required: true, type: String },
  createdAt: { required: true, type: Date },
  hash: { index: 1, required: true, type: String },
  height: { index: 1, required: true, type: Number },
  recipients: { required: true, type: Number },
  ver: { required: true, type: Number },
  vout: { required: true, type: Number }
}, { versionKey: false }), 'txs');

module.exports =  TX;
