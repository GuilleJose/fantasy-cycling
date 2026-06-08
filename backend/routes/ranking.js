const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const User = require("../models/User");
const League = require("../models/League");

// GET clasificación general de todos los equipos
router.get("/general", async (req, res) => {
  try {
    // Obtener todos los equipos con sus datos
    const teams = await Team.find()
      .select('teamName directorName totalPoints userId riders')
      .sort({ totalPoints: -1 }); // Ordenar por puntos de mayor a menor
    
    // Enriquecer los datos con información del usuario
    const ranking = [];
    for (const team of teams) {
      const user = await User.findById(team.userId);
      ranking.push({
        teamId: team._id,
        teamName: team.teamName,
        directorName: team.directorName,
        username: user?.username || "Usuario desconocido",
        totalPoints: team.totalPoints || 0,
        ridersCount: team.riders?.length || 0,
        riders: team.riders || []
      });
    }
    
    res.json({ success: true, ranking });
  } catch (err) {
    console.error("Error obteniendo clasificación:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET detalles de un equipo específico para el modal
router.get("/team/:teamId", async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }
    
    const user = await User.findById(team.userId);
    
    // Obtener las ligas a las que pertenece este equipo
    const leagues = await League.find({
      "teams.userId": team.userId
    }).select('name code teams teamsCount status');
    
    // Enriquecer datos de riders con información adicional
    const ridersWithDetails = team.riders.map(rider => ({
      ...rider.toObject(),
      pointsPerRider: rider.points || 0
    }));
    
    // Ordenar riders por puntos (de mayor a menor)
    ridersWithDetails.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    res.json({
      success: true,
      team: {
        teamId: team._id,
        teamName: team.teamName,
        directorName: team.directorName,
        username: user?.username || "Usuario desconocido",
        totalPoints: team.totalPoints || 0,
        totalPrice: team.totalPrice || 0,
        maillotImage: team.maillotImage,
        riders: ridersWithDetails,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt
      },
      leagues: leagues.map(league => ({
        leagueId: league._id,
        name: league.name,
        code: league.code,
        teamsCount: league.teams.length,
        maxTeams: league.maxTeams,
        status: league.status,
        position: getTeamPositionInLeague(league, team.userId)
      }))
    });
  } catch (err) {
    console.error("Error obteniendo detalles del equipo:", err);
    res.status(500).json({ error: err.message });
  }
});

// Función auxiliar para obtener la posición del equipo en la liga
function getTeamPositionInLeague(league, userId) {
  const sortedTeams = [...league.teams].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  const position = sortedTeams.findIndex(team => team.userId.toString() === userId.toString());
  return position !== -1 ? position + 1 : null;
}

// GET ranking por liga específica
router.get("/league/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    // Ordenar equipos por puntos
    const sortedTeams = [...league.teams].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    
    // Enriquecer con datos del equipo
    const rankingWithDetails = [];
    for (let i = 0; i < sortedTeams.length; i++) {
      const teamData = sortedTeams[i];
      const team = await Team.findOne({ userId: teamData.userId });
      rankingWithDetails.push({
        position: i + 1,
        teamId: team?._id,
        teamName: teamData.teamName || team?.teamName || "Equipo",
        directorName: team?.directorName || teamData.username,
        username: teamData.username,
        totalPoints: teamData.totalPoints || 0,
        userId: teamData.userId
      });
    }
    
    res.json({ 
      success: true, 
      league: {
        name: league.name,
        code: league.code,
        maxTeams: league.maxTeams
      },
      ranking: rankingWithDetails 
    });
  } catch (err) {
    console.error("Error obteniendo ranking de liga:", err);
    res.status(500).json({ error: err.message });
  }
});


// GET obtener teamId a partir de userId
router.get("/team-by-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const team = await Team.findOne({ userId });
    if (!team) {
      return res.status(404).json({ success: false, error: "Equipo no encontrado" });
    }
    
    res.json({ success: true, teamId: team._id });
  } catch (err) {
    console.error("Error obteniendo teamId:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;