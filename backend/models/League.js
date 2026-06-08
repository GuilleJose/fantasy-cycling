const mongoose = require("mongoose");

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  maxTeams: {
    type: Number,
    required: true,
    default: 10,
    min: 2,
    max: 50
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  teams: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    username: String,
    teamName: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    totalPoints: {
      type: Number,
      default: 0
    }
  }],
  status: {
    type: String,
    enum: ['active', 'finished', 'draft'],
    default: 'active'
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

module.exports = mongoose.model("League", leagueSchema, "ligas");