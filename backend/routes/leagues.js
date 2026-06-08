const express = require("express");
const router = express.Router();
const League = require("../models/League");
const Team = require("../models/Team");

// Generar código único de 6 dígitos
function generateUniqueCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function getUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = generateUniqueCode();
    const existingLeague = await League.findOne({ code });
    if (!existingLeague) {
      exists = false;
    }
  }
  return code;
}

// GET todas las ligas
router.get("/", async (req, res) => {
  try {
    const leagues = await League.find()
      .sort({ createdAt: -1 })
      .select('name creatorName code maxTeams teams status createdAt isPrivate');
    
    // Añadir conteo de equipos a cada liga
    const leaguesWithCount = leagues.map(league => ({
      ...league.toObject(),
      teamsCount: league.teams.length
    }));
    
    res.json(leaguesWithCount);
  } catch (err) {
    console.error("Error obteniendo ligas:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET ligas del usuario actual
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const leagues = await League.find({
      $or: [
        { creatorId: userId },
        { "teams.userId": userId }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(leagues);
  } catch (err) {
    console.error("Error obteniendo ligas del usuario:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET buscar ligas por nombre o código
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }
    
    const leagues = await League.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } }
      ],
      status: 'active'
    }).limit(20);
    
    res.json(leagues);
  } catch (err) {
    console.error("Error buscando ligas:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST crear nueva liga
router.post("/create", async (req, res) => {
  try {
    const { name, maxTeams, isPrivate, creatorId, creatorName } = req.body;
    
    if (!name || !creatorId || !creatorName) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }
    
    if (maxTeams < 2 || maxTeams > 50) {
      return res.status(400).json({ error: "El número máximo de equipos debe estar entre 2 y 50" });
    }
    
    // Generar código único
    const code = await getUniqueCode();
    
    const league = new League({
      name,
      code,
      creatorId,
      creatorName,
      maxTeams,
      isPrivate: isPrivate || false,
      teams: [{
        userId: creatorId,
        username: creatorName,
        teamName: "Mi Equipo",
        joinedAt: new Date(),
        totalPoints: 0
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await league.save();
    
    res.json({ 
      success: true, 
      league,
      message: "Liga creada exitosamente"
    });
  } catch (err) {
    console.error("Error creando liga:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST unirse a liga por código
router.post("/join", async (req, res) => {
  try {
    const { code, userId, username, teamName } = req.body;
    
    if (!code || !userId || !username) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }
    
    const league = await League.findOne({ code });
    
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    if (league.status !== 'active') {
      return res.status(400).json({ error: "Esta liga ya no está activa" });
    }
    
    // Verificar si el usuario ya está en la liga
    const alreadyInLeague = league.teams.some(team => team.userId.toString() === userId);
    if (alreadyInLeague) {
      return res.status(400).json({ error: "Ya estás en esta liga" });
    }
    
    // Verificar límite de equipos
    if (league.teams.length >= league.maxTeams) {
      return res.status(400).json({ error: "La liga ha alcanzado el límite de equipos" });
    }
    
    // Obtener el nombre del equipo del usuario
    const userTeam = await Team.findOne({ userId });
    const finalTeamName = teamName || userTeam?.teamName || "Mi Equipo";
    
    league.teams.push({
      userId,
      username,
      teamName: finalTeamName,
      joinedAt: new Date(),
      totalPoints: 0
    });
    
    league.updatedAt = new Date();
    await league.save();
    
    res.json({ 
      success: true, 
      league,
      message: "Te has unido a la liga exitosamente"
    });
  } catch (err) {
    console.error("Error uniéndose a liga:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET detalles de una liga específica
router.get("/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    // Ordenar equipos por puntos (ranking)
    const sortedTeams = [...league.teams].sort((a, b) => b.totalPoints - a.totalPoints);
    
    res.json({
      ...league.toObject(),
      teams: sortedTeams
    });
  } catch (err) {
    console.error("Error obteniendo liga:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT actualizar puntos de los equipos en una liga
router.put("/update-points/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;
    const { teamsPoints } = req.body; // Array de { userId, points }
    
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    // Actualizar puntos de cada equipo
    for (const teamPoints of teamsPoints) {
      const team = league.teams.find(t => t.userId.toString() === teamPoints.userId);
      if (team) {
        team.totalPoints = teamPoints.points;
      }
    }
    
    league.updatedAt = new Date();
    await league.save();
    
    res.json({ success: true, league });
  } catch (err) {
    console.error("Error actualizando puntos:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE abandonar liga
router.delete("/leave/:leagueId/:userId", async (req, res) => {
  try {
    const { leagueId, userId } = req.params;
    
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    // Verificar si el usuario es el creador
    if (league.creatorId.toString() === userId) {
      return res.status(400).json({ error: "El creador no puede abandonar la liga. Puede eliminarla si lo desea." });
    }
    
    league.teams = league.teams.filter(team => team.userId.toString() !== userId);
    league.updatedAt = new Date();
    await league.save();
    
    res.json({ success: true, message: "Has abandonado la liga" });
  } catch (err) {
    console.error("Error abandonando liga:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE eliminar liga (solo creador)
router.delete("/:leagueId/:userId", async (req, res) => {
  try {
    const { leagueId, userId } = req.params;
    
    const league = await League.findById(leagueId);
    
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    // Verificar que el usuario sea el creador
    if (league.creatorId.toString() !== userId) {
      return res.status(403).json({ error: "Solo el creador puede eliminar la liga" });
    }
    
    await League.findByIdAndDelete(leagueId);
    
    res.json({ success: true, message: "Liga eliminada correctamente" });
  } catch (err) {
    console.error("Error eliminando liga:", err);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/leagues/sync-points/:leagueId - Sincronizar puntos de todos los equipos en una liga
router.post("/sync-points/:leagueId", async (req, res) => {
  try {
    const { leagueId } = req.params;
    
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    let updatedCount = 0;
    
    // Para cada equipo en la liga, obtener sus puntos actuales del modelo Team
    for (const teamEntry of league.teams) {
      const team = await Team.findOne({ userId: teamEntry.userId });
      if (team) {
        const oldPoints = teamEntry.totalPoints || 0;
        const newPoints = team.totalPoints || 0;
        
        if (oldPoints !== newPoints) {
          teamEntry.totalPoints = newPoints;
          updatedCount++;
        }
      }
    }
    
    // Ordenar equipos por puntos después de la actualización
    league.teams.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    league.updatedAt = new Date();
    await league.save();
    
    console.log(`🔄 Sincronizada liga ${league.name}: ${updatedCount} equipos actualizados`);
    
    res.json({ 
      success: true, 
      updatedCount,
      message: `Sincronizados ${updatedCount} equipos en la liga ${league.name}`
    });
  } catch (err) {
    console.error("Error sincronizando puntos:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leagues/sync-all - Sincronizar TODAS las ligas
router.post("/sync-all", async (req, res) => {
  try {
    const leagues = await League.find({});
    let totalUpdated = 0;
    
    for (const league of leagues) {
      let updatedCount = 0;
      
      for (const teamEntry of league.teams) {
        const team = await Team.findOne({ userId: teamEntry.userId });
        if (team) {
          const oldPoints = teamEntry.totalPoints || 0;
          const newPoints = team.totalPoints || 0;
          
          if (oldPoints !== newPoints) {
            teamEntry.totalPoints = newPoints;
            updatedCount++;
          }
        }
      }
      
      if (updatedCount > 0) {
        league.teams.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        league.updatedAt = new Date();
        await league.save();
        totalUpdated += updatedCount;
        console.log(`   Liga "${league.name}": ${updatedCount} equipos actualizados`);
      }
    }
    
    res.json({ 
      success: true, 
      totalUpdated,
      message: `Sincronizadas todas las ligas. ${totalUpdated} equipos actualizados.`
    });
  } catch (err) {
    console.error("Error sincronizando todas las ligas:", err);
    res.status(500).json({ error: err.message });
  }
});




// GET /api/leagues/:leagueId/points-by-stage/:stageNumber - Obtener puntos de los equipos por etapa
router.get("/:leagueId/points-by-stage/:stageNumber", async (req, res) => {
  try {
    const { leagueId, stageNumber } = req.params;
    const stageNum = parseInt(stageNumber);
    
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ error: "Liga no encontrada" });
    }
    
    // Obtener la etapa de la base de datos
    const Stage = require('../models/Stage');
    let stage = await Stage.findOne({ stageNumber: stageNum });
    
    // Sistema de puntuación
    const stagePoints = {
      1: 220, 2: 180, 3: 160, 4: 140, 5: 120,
      6: 110, 7: 95, 8: 80, 9: 70, 10: 60,
      11: 50, 12: 40, 13: 35, 14: 30, 15: 25,
      16: 20, 17: 16, 18: 12, 19: 8, 20: 4
    };
    
    const gcDailyPoints = {
      1: 30, 2: 26, 3: 22, 4: 18, 5: 16,
      6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
      11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
      16: 5, 17: 4, 18: 3, 19: 2, 20: 1
    };
    
    function getStagePoints(position) {
      return stagePoints[position] || 0;
    }
    
    function getGcDailyPoints(position) {
      if (!position) return 0;
      return gcDailyPoints[position] || 0;
    }
    
    function cleanNameForComparison(name) {
      if (!name) return '';
      return name.replace(/^\d+\s+/, '').trim().toLowerCase();
    }
    
    // Para cada equipo en la liga, calcular puntos de la etapa
    const teamPointsByStage = [];
    
    for (const teamEntry of league.teams) {
      const team = await Team.findOne({ userId: teamEntry.userId });
      if (!team || !team.riders || team.riders.length === 0) {
        teamPointsByStage.push({
          userId: teamEntry.userId,
          username: teamEntry.username,
          teamName: teamEntry.teamName || team?.teamName || "Mi Equipo",
          totalPoints: 0,
          ridersPoints: []
        });
        continue;
      }
      
      let teamStagePoints = 0;
      const ridersPoints = [];
      
      for (const rider of team.riders) {
        let riderPoints = 0;
        let position = null;
        let gcPosition = null;
        
        if (stage && stage.results) {
          for (const result of stage.results) {
            const resultCleanName = cleanNameForComparison(result.riderName);
            const riderCleanName = cleanNameForComparison(rider.riderName);
            
            if (resultCleanName === riderCleanName || 
                resultCleanName.includes(riderCleanName) || 
                riderCleanName.includes(resultCleanName) ||
                (resultCleanName.split(' ').pop() === riderCleanName.split(' ').pop())) {
              
              position = result.position;
              gcPosition = result.gcPosition || result.generalClassificationPosition;
              riderPoints = getStagePoints(position) + getGcDailyPoints(gcPosition);
              break;
            }
          }
        }
        
        if (riderPoints > 0) {
          teamStagePoints += riderPoints;
          ridersPoints.push({
            riderName: rider.riderName,
            points: riderPoints,
            position: position,
            gcPosition: gcPosition
          });
        }
      }
      
      teamPointsByStage.push({
        userId: teamEntry.userId,
        username: teamEntry.username,
        teamName: teamEntry.teamName || team.teamName,
        totalPoints: teamStagePoints,
        ridersPoints: ridersPoints.sort((a, b) => b.points - a.points)
      });
    }
    
    // Ordenar equipos por puntos de la etapa
    teamPointsByStage.sort((a, b) => b.totalPoints - a.totalPoints);
    
    res.json({
      success: true,
      stageNumber: stageNum,
      stageName: stage?.name || `Etapa ${stageNum}`,
      distanceKm: stage?.distanceKm,
      hasResults: stage && stage.results && stage.results.length > 0,
      teamPoints: teamPointsByStage
    });
    
  } catch (err) {
    console.error("Error obteniendo puntos por etapa:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;