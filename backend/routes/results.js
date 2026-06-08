// backend/routes/results.js
const express = require('express');
const router = express.Router();
const Stage = require('../models/Stage');
const pcsScraper = require('../services/pcsScraper');

// GET - Resultados STAGE de una etapa
// backend/routes/results.js - Modificar la ruta stage/:stageNumber

router.get('/stage/:stageNumber', async (req, res) => {
  try {
    const stageNumber = parseInt(req.params.stageNumber);
    const forceRefresh = req.query.refresh === 'true' || req.query.cache === 'false';
    
    let stage = null;
    
    if (!forceRefresh) {
      stage = await Stage.findOne({ stageNumber });
    }
    
    if (!stage || forceRefresh) {
      const freshData = await pcsScraper.getFullStageResults(stageNumber);
      
      if (!freshData.success || freshData.error) {
        return res.status(404).json({ success: false, error: freshData.message });
      }
      
      stage = await Stage.findOneAndUpdate(
        { stageNumber },
        { 
          $set: {
            stageNumber,
            results: freshData.results,
            name: freshData.name,
            distanceKm: freshData.distanceKm,
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );
      
      if (forceRefresh) {
        console.log(`🔄 Recalculando puntos después de actualizar etapa ${stageNumber}...`);
        await recalculateAllPoints();
      }
    }
    
    res.json({ success: true, stage });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET - Clasificación General (GC)
router.get('/general-classification', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.cache === 'false';
    
    let gcStage = null;
    
    if (!forceRefresh) {
      gcStage = await Stage.findOne({ stageNumber: 0 });
    }
    
    if (!gcStage || forceRefresh) {
      const gcData = await pcsScraper.getGeneralClassification();
      
      if (gcData.error) {
        return res.status(404).json({ success: false, error: gcData.message });
      }
      
      gcStage = await Stage.findOneAndUpdate(
        { stageNumber: 0 },
        { 
          $set: {
            stageNumber: 0,
            name: 'Clasificación General',
            generalClassification: gcData.classification,
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );
      
      // Si se actualizó con forceRefresh, recalcular puntos
      if (forceRefresh) {
        console.log(`🔄 Recalculando puntos después de actualizar GC desde web...`);
        await recalculateAllPoints();
      }
    }
    
    res.json({ success: true, classification: gcStage.generalClassification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Función auxiliar para recalcular todos los puntos
async function recalculateAllPoints() {
  const Stage = require('../models/Stage');
  const Rider = require('../models/Rider');
  const Team = require('../models/Team');
  const League = require('../models/League');
  
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
  
  const gcFinalPoints = {
    1: 500, 2: 400, 3: 350, 4: 300, 5: 280,
    6: 260, 7: 240, 8: 220, 9: 200, 10: 180,
    11: 160, 12: 140, 13: 120, 14: 100, 15: 80,
    16: 60, 17: 50, 18: 40, 19: 30, 20: 20
  };
  
  function cleanNameForComparison(name) {
    if (!name) return '';
    return name.replace(/^\d+\s+/, '').trim().toLowerCase();
  }
  
 // ⭐ FUNCIÓN CORREGIDA: Limpiar nombre (remover dorsal de la BD)
function cleanNameForComparison(name) {
  if (!name) return '';
  // Remover dorsal si está al inicio (ej: "1 Tadej Pogacar" -> "Tadej Pogacar")
  let cleaned = name.replace(/^\d+\s+/, '').trim();
  return cleaned.toLowerCase();
}

// ⭐ FUNCIÓN CORREGIDA: Buscar corredor por nombre
async function findRiderByName(pcsRiderName) {
  if (!pcsRiderName) return null;
  
  const pcsCleanName = cleanNameForComparison(pcsRiderName);
  
  // Buscar todos los corredores y comparar manualmente
  const allRiders = await Rider.find({});
  
  for (const rider of allRiders) {
    const riderCleanName = cleanNameForComparison(rider.name);
    
    // Comparación exacta
    if (riderCleanName === pcsCleanName) {
      return rider;
    }
    
    // Comparación por apellido (última palabra)
    const pcsLastName = pcsCleanName.split(' ').pop();
    const riderLastName = riderCleanName.split(' ').pop();
    
    if (pcsLastName && riderLastName && pcsLastName === riderLastName) {
      if (riderCleanName.includes(pcsCleanName) || pcsCleanName.includes(riderCleanName)) {
        return rider;
      }
    }
  }
  
  return null;
}
  
  function getStagePoints(position) {
    return stagePoints[position] || 0;
  }
  
  function getGcDailyPoints(position) {
    if (!position) return 0;
    return gcDailyPoints[position] || 0;
  }
  
  // Resetear puntos
  await Rider.updateMany({}, { $set: { points: 0 } });
  await Team.updateMany({}, { $set: { totalPoints: 0, 'riders.$[].points': 0 } });
  
  // Obtener todas las etapas
  const allStages = await Stage.find({ stageNumber: { $gt: 0 } }).sort({ stageNumber: 1 });
  
  let totalPointsAssigned = 0;
  
  // Procesar cada etapa
  for (const stage of allStages) {
    if (!stage.results || stage.results.length === 0) continue;
    
    for (const result of stage.results) {
      const position = result.position;
      let riderName = result.riderName || '';
      riderName = riderName.replace(/^\d+\s+/, '').trim();
      
      if (!riderName || riderName.length < 2) continue;
      
      const stagePointsEarned = getStagePoints(position);
      let gcPosition = result.gcPosition || result.generalClassificationPosition || null;
      const gcPointsEarned = getGcDailyPoints(gcPosition);
      const totalPointsEarned = stagePointsEarned + gcPointsEarned;
      
      if (totalPointsEarned === 0) continue;
      
      const rider = await findRiderByName(riderName);
      
      if (rider) {
        rider.points = (rider.points || 0) + totalPointsEarned;
        await rider.save();
        
        await Team.updateMany(
          { 'riders.riderId': rider._id },
          { 
            $inc: { totalPoints: totalPointsEarned },
            $set: { 'riders.$.points': rider.points }
          }
        );
        
        totalPointsAssigned += totalPointsEarned;
      }
    }
  }
  
  // Procesar GC Final
  const gcStage = await Stage.findOne({ stageNumber: 0 });
  if (gcStage && gcStage.generalClassification && gcStage.generalClassification.length > 0) {
    for (const result of gcStage.generalClassification) {
      let riderName = result.riderName || '';
      riderName = riderName.replace(/^\d+\s+/, '').trim();
      const position = result.position;
      
      const gcFinalPointsEarned = gcFinalPoints[position] || 0;
      if (gcFinalPointsEarned === 0) continue;
      
      const rider = await findRiderByName(riderName);
      
      if (rider) {
        rider.points = (rider.points || 0) + gcFinalPointsEarned;
        await rider.save();
        
        await Team.updateMany(
          { 'riders.riderId': rider._id },
          { 
            $inc: { totalPoints: gcFinalPointsEarned },
            $set: { 'riders.$.points': rider.points }
          }
        );
        
        totalPointsAssigned += gcFinalPointsEarned;
      }
    }
  }
  
  // Sincronizar ligas
  const leagues = await League.find({});
  for (const league of leagues) {
    let leagueUpdated = false;
    for (const teamEntry of league.teams) {
      const team = await Team.findOne({ userId: teamEntry.userId });
      if (team && teamEntry.totalPoints !== team.totalPoints) {
        teamEntry.totalPoints = team.totalPoints || 0;
        leagueUpdated = true;
      }
    }
    if (leagueUpdated) {
      league.teams.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      league.updatedAt = new Date();
      await league.save();
    }
  }
  
  console.log(`✅ Puntos recalculados: ${totalPointsAssigned} pts`);
  return totalPointsAssigned;
}

// GET - Clasificación General (GC)
router.get('/general-classification', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true' || req.query.cache === 'false';
    
    let gcStage = null;
    
    if (!forceRefresh) {
      gcStage = await Stage.findOne({ stageNumber: 0 });
    }
    
    if (!gcStage || forceRefresh) {
      const gcData = await pcsScraper.getGeneralClassification();
      
      if (gcData.error) {
        return res.status(404).json({ success: false, error: gcData.message });
      }
      
      gcStage = await Stage.findOneAndUpdate(
        { stageNumber: 0 },
        { 
          $set: {
            stageNumber: 0,
            name: 'Clasificación General',
            generalClassification: gcData.classification,
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }
    
    res.json({ success: true, classification: gcStage.generalClassification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET - Verificar disponibilidad de resultados
router.get('/check-availability', async (req, res) => {
  try {
    // Verificar si hay alguna etapa en la base de datos
    const anyStage = await Stage.findOne({});
    
    if (!anyStage) {
      return res.json({ 
        available: false, 
        hasResults: false,
        reason: 'No hay resultados cargados. Usa el panel de administración para importar los resultados.' 
      });
    }
    
    // Verificar si hay resultados reales
    const stageWithResults = await Stage.findOne({ 
      $or: [
        { 'results.0': { $exists: true } },
        { 'generalClassification.0': { $exists: true } }
      ]
    });
    
    if (!stageWithResults) {
      return res.json({ 
        available: true, 
        hasResults: false,
        reason: 'Los resultados aún no están disponibles. Puedes usar el botón "Actualizar desde web" para obtenerlos.' 
      });
    }
    
    res.json({ available: true, hasResults: true });
  } catch (err) {
    console.error("Error checking availability:", err);
    res.json({ available: false, hasResults: false, error: err.message });
  }
});

// GET - Obtener el número de la última etapa disponible
router.get('/last-stage', async (req, res) => {
  try {
    const lastStage = await Stage.findOne({ stageNumber: { $gt: 0 } })
      .sort({ stageNumber: -1 })
      .limit(1);
    
    if (lastStage) {
      res.json({ success: true, lastStage: lastStage.stageNumber });
    } else {
      // Si no hay etapas, devolver 1 por defecto
      res.json({ success: true, lastStage: 1 });
    }
  } catch (err) {
    console.error("Error obteniendo última etapa:", err);
    res.json({ success: false, lastStage: 1 });
  }
});


// GET /api/results/available-stages - Obtener lista de etapas disponibles
router.get('/available-stages', async (req, res) => {
  try {
    const stages = await Stage.find({ stageNumber: { $gt: 0 } })
      .sort({ stageNumber: 1 })
      .select('stageNumber name distanceKm');
    
    const stageNumbers = stages.map(s => s.stageNumber);
    
    res.json({ 
      success: true, 
      stages: stageNumbers,
      stagesWithDetails: stages
    });
  } catch (err) {
    console.error("Error obteniendo etapas disponibles:", err);
    res.json({ success: false, stages: [] });
  }
});

module.exports = router;