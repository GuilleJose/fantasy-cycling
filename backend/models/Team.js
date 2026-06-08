const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  teamName: {
    type: String,
    default: "Mi Equipo"
  },
  directorName: {
    type: String,
    default: "Director"
  },
  riders: [
    {
      riderId: mongoose.Schema.Types.ObjectId,
      riderName: String,
      riderTeam: String,
      riderPrice: Number,
      riderRating: Number,
      points: {
        type: Number,
        default: 0
      }
    }
  ],
  maillotImage: {
    type: String,
    default: "rabobank.png"
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Team", teamSchema, "equipo");