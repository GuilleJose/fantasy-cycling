// backend/models/Rider.js
const mongoose = require('mongoose');

const RiderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pcsSlug: { type: String, required: true },
  price: { 
    type: Number, 
    default: 4,
    min: 4,
    max: 35
  },
  priceScore: { type: Number, default: 0 },
  priceFactors: { type: Object, default: {} },
  status: { type: String, default: 'unknown' },
  points: { type: Number, default: 0 },
  isRetired: { type: Boolean, default: false },  // NUEVO CAMPO
  retiredInStage: { type: Number, default: null }, // Etapa en la que se retiró
  retiredReason: { type: String, default: null }, // DNF, DNS, DSQ
  // Campos extendidos
  photo: { type: String, default: null },
  team: { type: String, default: 'Sin equipo' },
  teamCode: { type: String, default: null },
  dateOfBirth: { type: String, default: null },
  nationality: { type: String, default: null },
  weight: { type: Number, default: null },
  height: { type: Number, default: null },
  placeOfBirth: { type: String, default: null },
  age: { type: Number, default: null },
  specialty: { type: String, default: null },
  riderType: { type: String, default: null },
  uciPoints: { type: Number, default: null },
  uciRank: { type: Number, default: null },
  pcsRank: { type: Number, default: null },  // Añadir PCS Rank
  wins: { type: Number, default: 0 },
  grandTours: { type: Number, default: 0 },
  popularity: { type: Number, default: null },
  specialties: { type: Object, default: {} },
  // Campo para datos completos de PCS
  pcsData: { type: Object, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Rider', RiderSchema);