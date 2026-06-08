// backend/models/Stage.js
const mongoose = require('mongoose');

const stageResultSchema = new mongoose.Schema({
  position: { type: mongoose.Schema.Types.Mixed, required: true },
  positionDisplay: { type: String, default: null },
  positionType: { type: String, enum: ['numeric', 'DNF', 'DNS', 'DSQ', 'OTL', 'unknown'], default: 'numeric' },
  riderName: { type: String, required: true },
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
  team: { type: String, default: '' },
  time: { type: String, default: null },
  gcPosition: { type: Number, default: null },
  points: { type: Number, default: 0 }
});

const stageSchema = new mongoose.Schema({
  stageNumber: { type: Number, required: true, unique: true },
  name: { type: String, default: null },
  distanceKm: { type: Number, default: null },
  date: { type: String, default: null },
  results: [stageResultSchema],
  generalClassification: [stageResultSchema],
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Stage', stageSchema);