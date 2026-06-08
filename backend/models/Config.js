const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  maxRiders: {
    type: Number,
    default: 8
  },
  budget: {
    type: Number,
    default: 100
  },
  raceName: {
    type: String,
    default: "Giro d'Italia 2026"
  },
  pcsImportUrl: {
    type: String,
    default: "https://www.procyclingstats.com/race/giro-d-italia/2026/startlist"
  },
  pcsUpdateRidersUrl: {
    type: String,
    default: "https://www.procyclingstats.com/race/giro-d-italia/2026"
  },
  pcsUpdateStagesUrl: {
    type: String,
    default: "https://www.procyclingstats.com/race/giro-d-italia/2026/stages"
  },
  maxTeamCreationDate: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Config", configSchema, "configuracion");