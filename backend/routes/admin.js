const express = require("express");
const router = express.Router();
const Rider = require("../models/Rider");
const Team = require("../models/Team");
const axios = require("axios");
const cheerio = require("cheerio");
const { exec } = require("child_process");
const util = require('util');
const execPromise = util.promisify(exec);  // <-- IMPORTANTE: Definir execPromise

// Middleware para verificar admin
async function verifyAdmin(req, res, next) {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: "No autorizado" });
  }
  
  const User = require("../models/User");
  const user = await User.findById(userId);
  
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador" });
  }
  
  next();
}

// Configuración del sistema
router.get("/config", async (req, res) => {
  try {
    const Config = require("../models/Config");
    let config = await Config.findOne({});
    if (!config) {
      config = new Config();
      await config.save();
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/config", verifyAdmin, async (req, res) => {
  try {
    const { maxRiders, budget, raceName, pcsImportUrl, pcsUpdateRidersUrl, pcsUpdateStagesUrl, maxTeamCreationDate } = req.body;
    const Config = require("../models/Config");
    
    let config = await Config.findOne({});
    if (!config) {
      config = new Config();
    }
    
    if (maxRiders !== undefined) config.maxRiders = maxRiders;
    if (budget !== undefined) config.budget = budget;
    if (raceName !== undefined) config.raceName = raceName;
    if (pcsImportUrl !== undefined) config.pcsImportUrl = pcsImportUrl;
    if (pcsUpdateRidersUrl !== undefined) config.pcsUpdateRidersUrl = pcsUpdateRidersUrl;
    if (pcsUpdateStagesUrl !== undefined) config.pcsUpdateStagesUrl = pcsUpdateStagesUrl;
    if (maxTeamCreationDate !== undefined) config.maxTeamCreationDate = maxTeamCreationDate || null;
    
    await config.save();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Importar desde Wikipedia
router.post("/import-riders", verifyAdmin, async (req, res) => {
  try {
    console.log("📥 Importando del Giro 2026 desde Wikipedia...");
    
    const wikiUrl = "https://en.wikipedia.org/wiki/List_of_teams_and_cyclists_in_the_2026_Giro_d%27Italia";
    
    const response = await axios.get(wikiUrl, {
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FantasyCycling/1.0" 
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const parsedRiders = [];
    
    let targetTable = null;
    
    $("h2, h3, span.mw-headline").each((_, el) => {
      if ($(el).text().includes("By starting number")) {
        targetTable = $(el).closest("h2, h3").nextAll("table.wikitable").first();
        return false;
      }
    });
    
    if (!targetTable || targetTable.length === 0) {
      $("table.wikitable").each((_, table) => {
        const firstRow = $(table).find("tr").first();
        const headers = firstRow.find("th").map((_, th) => $(th).text().trim()).get();
        
        if (headers[0] === "No." && headers[1] === "Name") {
          targetTable = $(table);
          return false;
        }
      });
    }
    
    if (!targetTable || targetTable.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "No se encontró la tabla de corredores en Wikipedia" 
      });
    }
    
    const getWikipediaData = async (riderName) => {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(riderName)}&format=json`;
        const searchResponse = await axios.get(searchUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FantasyCycling/1.0" },
          timeout: 5000
        });
        
        const searchResults = searchResponse.data.query.search;
        if (searchResults.length === 0) return { photo: null, riderType: "Other" };
        
        const pageTitle = searchResults[0].title;
        const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
        const pageResponse = await axios.get(pageUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FantasyCycling/1.0" },
          timeout: 5000
        });
        
        const cheerioPage = cheerio.load(pageResponse.data);
        let photo = null;
        let riderType = "Other";
        
        const infobox = cheerioPage("table.infobox");
        const imgCell = infobox.find("a.image img").first();
        if (imgCell.length > 0) {
          let imgSrc = imgCell.attr("src");
          if (imgSrc && !imgSrc.includes("Red_Pog")) {
            if (!imgSrc.startsWith("http")) imgSrc = "https:" + imgSrc;
            photo = imgSrc;
          }
        }
        
        const typeRow = infobox.find("tr").filter((_, row) => {
          const th = cheerioPage(row).find("th").text().trim();
          return th === "Rider type";
        });
        
        if (typeRow.length > 0) {
          const typeValue = typeRow.find("td").text().trim();
          if (typeValue) riderType = typeValue.replace(/\[\d+\]/g, "").trim() || "Other";
        }
        
        return { photo, riderType };
      } catch (err) {
        return { photo: null, riderType: "Other" };
      }
    };
    
    targetTable.find("tr").each((index, row) => {
      if (index === 0) return;
      
      const nameCell = $(row).find("th[scope='row']");
      const cells = $(row).find("td");
      
      if (nameCell.length === 0 || cells.length < 4) return;
      
      try {
        const nameClone = nameCell.clone();
        nameClone.find("span.flagicon").remove();
        nameClone.find("a[href*='File:']").remove();
        
        const riderLink = nameClone.find("a[href*='/wiki/']").first();
        let nombre = riderLink.length > 0 ? riderLink.text().trim() : nameClone.text().trim();
        nombre = nombre.replace(/‡/g, "").replace(/\*/g, "").trim();
        
        const dorsalText = $(cells[0]).text().trim();
        const dorsal = parseInt(dorsalText);
        
        if (isNaN(dorsal) || !nombre || nombre.length < 2) return;
        
        let nacionalidad = $(cells[1]).text().trim().replace(/‡/g, "").replace(/\[\d+\]/g, "").trim();
        let equipo = $(cells[2]).text().trim().replace(/‡/g, "").replace(/\[\d+\]/g, "").trim();
        const edadText = $(cells[3]).text().trim();
        let edad = parseInt(edadText) || 0;
        
        parsedRiders.push({
          name: nombre,
          team: equipo,
          nationality: nacionalidad,
          price: dorsal,
          rating: 85,
          age: edad,
          riderType: "Other",
          photo: null
        });
      } catch (err) {
        console.log(`⚠️ Error en fila ${index}:`, err.message);
      }
    });
    
    for (let i = 0; i < parsedRiders.length; i++) {
      const rider = parsedRiders[i];
      const { photo, riderType } = await getWikipediaData(rider.name);
      rider.photo = photo;
      rider.riderType = riderType;
      
      if ((i + 1) % 10 === 0) {
        console.log(`   📊 Procesados ${i + 1}/${parsedRiders.length} ciclistas`);
      }
    }
    
    await Rider.deleteMany({});
    const imported = await Rider.insertMany(parsedRiders);
    
    res.json({ 
      success: true, 
      count: imported.length,
      message: `${imported.length} corredores importados correctamente`
    });
    
  } catch (err) {
    console.error("❌ Error en importación:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// IMPORTAR DESDE PRO CYCLING STATS - SOLO DATOS REALES
router.post("/import-pcs", verifyAdmin, async (req, res) => {
  try {
    console.log("📥 Importando desde ProCyclingStats (solo datos reales)...");
    
    if (!cheerio) {
      return res.status(500).json({ success: false, error: "Cheerio no cargado" });
    }
    
    const pcsUrl = "https://www.procyclingstats.com/race/giro-d-italia/2026/startlist";
    console.log(`🌐 Obteniendo startlist desde: ${pcsUrl}`);
    
    const cmd = `curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" -H "Accept-Language: es-ES,es;q=0.9" "${pcsUrl}"`;
    
    exec(cmd, { maxBuffer: 1024 * 1024 * 5, timeout: 60000 }, async (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error en el túnel: ${error.message}`);
        return res.status(500).json({ success: false, error: `Error: ${error.message}` });
      }
      
      if (!stdout || stdout.trim().length === 0) {
        return res.status(503).json({ success: false, error: "HTML vacío" });
      }
      
      if (stdout.includes("cloudflare") || stdout.includes("Just a moment...")) {
        return res.status(403).json({ success: false, error: "Cloudflare bloqueó el acceso" });
      }

      console.log("✅ HTML obtenido, extrayendo datos reales...");
      const $ = cheerio.load(stdout);
      
      function normalizeRiderName(rawName) {
        if (!rawName) return null;
        let clean = rawName.replace(/[*‡†]/g, '').trim();
        
        const upperCaseLastMatch = clean.match(/^([A-Z\s]+)\s+([A-Z][a-z]+)/);
        if (upperCaseLastMatch) {
          const lastName = upperCaseLastMatch[1].trim();
          const firstName = upperCaseLastMatch[2].trim();
          return `${lastName} ${firstName}`;
        }
        
        const normalMatch = clean.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
        if (normalMatch) {
          const firstName = normalMatch[1].trim();
          const lastName = normalMatch[2].trim();
          return `${lastName.toUpperCase()} ${firstName}`;
        }
        
        return clean;
      }
      
      function getUniqueKey(normalizedName) {
        return normalizedName.toLowerCase().replace(/\s+/g, '');
      }
      
      const parsedRiders = [];
      
      $(".startlist_v4 li li").each((_, riderItem) => {
        const bibText = $(riderItem).find("span.bib").first().text().trim();
        const bib = parseInt(bibText, 10);
        if (isNaN(bib)) return;

        const link = $(riderItem).find("a[href*='rider/']").first();
        if (!link.length) return;

        const rawName = link.text().trim();
        if (!rawName) return;

        const normalizedName = normalizeRiderName(rawName);
        if (!normalizedName || normalizedName.length < 3 || normalizedName.length > 100) return;

        const href = link.attr("href") || "";
        const match = href.match(/(?:^|\/)rider\/([^\/?#]+)/);
        if (!match || !match[1]) return;

        const pcsSlug = match[1];
        const nameWithBib = `${bib} ${normalizedName}`;

        parsedRiders.push({
          name: nameWithBib,
          pcsSlug,
          price: 4,
          status: 'unknown',
          points: 0,
          team: 'Sin equipo',
          teamCode: null,
          nationality: null,
          dateOfBirth: null,
          weight: null,
          height: null,
          placeOfBirth: null,
          age: null,
          specialty: null,
          riderType: null,
          uciPoints: null,
          uciRank: null,
          wins: 0,
          grandTours: 0,
          popularity: null,
          specialties: {},
          photo: null,
          pcsData: null
        });
      });
      
      console.log(`\n📊 Extraídos ${parsedRiders.length} corredores desde la startlist de PCS`);
      
      if (parsedRiders.length === 0) {
        return res.status(404).json({ success: false, error: "No se encontraron corredores con dorsal" });
      }
      
      await Rider.deleteMany({});
      const imported = await Rider.insertMany(parsedRiders);
      
      console.log(`\n✅ Importación completada: ${imported.length} corredores importados`);
      
      return res.json({ 
        success: true, 
        count: imported.length,
        message: `${imported.length} corredores importados desde ProCyclingStats` 
      });
    });
    
  } catch (err) {
    console.error("❌ Error crítico:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Borrar todos los corredores
router.post("/delete-all-riders", verifyAdmin, async (req, res) => {
  try {
    const result = await Rider.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar puntos de un corredor
router.put("/update-rider-points/:riderId", verifyAdmin, async (req, res) => {
  try {
    const { riderId } = req.params;
    const { points } = req.body;
    
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ error: "Corredor no encontrado" });
    }
    
    rider.rating = points;
    await rider.save();
    
    res.json({ success: true, rider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar precio de un corredor
router.put("/update-rider-price/:riderId", verifyAdmin, async (req, res) => {
  try {
    const { riderId } = req.params;
    const { price } = req.body;
    
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ error: "Corredor no encontrado" });
    }
    
    rider.price = price;
    await rider.save();
    
    res.json({ success: true, rider });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post("/update-stage-results", verifyAdmin, async (req, res) => {
  try {
    const { stageNumber } = req.body;
    
    if (!stageNumber || stageNumber < 1 || stageNumber > 21) {
      return res.status(400).json({ error: "Número de etapa inválido (1-21)" });
    }
    
    console.log(`📊 Actualizando resultados de la etapa ${stageNumber}...`);
    
    const pcsScraper = require('../services/pcsScraper');
    const Stage = require('../models/Stage');
    const Rider = require('../models/Rider');
    const Team = require('../models/Team');
    const League = require('../models/League');
    
    // Obtener datos de la etapa desde PCS
    const stageData = await pcsScraper.getFullStageResults(parseInt(stageNumber));
    
    if (!stageData.success) {
      console.error(`❌ Error: ${stageData.message}`);
      return res.status(404).json({ success: false, error: stageData.message });
    }
    
    if (!stageData.results || stageData.results.length === 0) {
      return res.status(404).json({ success: false, error: `No hay resultados para la etapa ${stageNumber}` });
    }
    
    console.log(`✅ Etapa ${stageNumber}: ${stageData.results.length} resultados encontrados`);
    
    // Guardar en BD
    await Stage.findOneAndUpdate(
      { stageNumber },
      { 
        $set: {
          stageNumber,
          results: stageData.results,
          name: stageData.name,
          distanceKm: stageData.distanceKm,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log(`   ✓ Datos de etapa ${stageNumber} guardados`);
    
    // ========== MARCAR CORREDORES RETIRADOS ==========
    const retiredRiders = stageData.results.filter(r => 
      r.positionType === 'DNF' || r.positionType === 'DNS' || r.positionType === 'DSQ' || r.positionType === 'OTL'
    );
    
    console.log(`\n   🔍 Marcando corredores retirados en etapa ${stageNumber}...`);
    
    for (const retired of retiredRiders) {
      const riderName = retired.riderName;
      // Buscar el corredor en la BD por nombre (ignorando el dorsal)
      const rider = await Rider.findOne({
        name: { $regex: new RegExp(riderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
      });
      
      if (rider && !rider.isRetired) {
        rider.isRetired = true;
        rider.retiredInStage = stageNumber;
        rider.retiredReason = retired.positionType;
        rider.status = 'retired';
        await rider.save();
        console.log(`      ✅ ${rider.name} marcado como RETIRADO (${retired.positionType} en etapa ${stageNumber})`);
      }
    }
    
    // ========== RECALCULAR TODOS LOS PUNTOS ==========
    console.log(`\n   🔄 Recalculando todos los puntos después de actualizar la etapa...`);
    
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
          // Verificar que el nombre sea similar (no es otro corredor con mismo apellido)
          if (riderCleanName.includes(pcsCleanName) || pcsCleanName.includes(riderCleanName)) {
            return rider;
          }
        }
      }
      
      return null;
    }
    
    function getStagePointsForPosition(position, isRetired) {
      if (isRetired) return 0;
      return stagePoints[position] || 0;
    }
    
    function getGcDailyPointsForPosition(position, isRetired) {
      if (isRetired || !position) return 0;
      return gcDailyPoints[position] || 0;
    }
    
    // Resetear puntos
    await Rider.updateMany({}, { $set: { points: 0 } });
    await Team.updateMany({}, { $set: { totalPoints: 0, 'riders.$[].points': 0 } });
    
    // Obtener todas las etapas
    const allStages = await Stage.find({ stageNumber: { $gt: 0 } }).sort({ stageNumber: 1 });
    console.log(`   📋 Etapas encontradas: ${allStages.length}`);
    
    let totalPointsAssigned = 0;
    let stagesProcessed = 0;
    
    // Procesar cada etapa
    for (const stage of allStages) {
      if (!stage.results || stage.results.length === 0) continue;
      
      console.log(`   Procesando etapa ${stage.stageNumber}...`);
      
      for (const result of stage.results) {
        const position = result.position;
        let riderName = result.riderName || '';
        riderName = riderName.replace(/^\d+\s+/, '').trim();
        
        if (!riderName || riderName.length < 2) continue;
        
        // Verificar si el corredor está retirado
        const rider = await findRiderByName(riderName);
        const isRetired = rider && rider.isRetired === true;
        
        let stagePointsEarned = 0;
        let gcPointsEarned = 0;
        
        // Solo dar puntos si no está retirado y tiene posición numérica
        if (!isRetired && typeof position === 'number') {
          stagePointsEarned = getStagePointsForPosition(position, false);
        }
        
        // Puntos de GC diaria solo si no está retirado
        if (!isRetired && result.gcPosition && typeof result.gcPosition === 'number') {
          gcPointsEarned = getGcDailyPointsForPosition(result.gcPosition, false);
        }
        
        const totalPointsEarned = stagePointsEarned + gcPointsEarned;
        
        if (totalPointsEarned === 0) continue;
        
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
          console.log(`      ✅ ${rider.name}: +${totalPointsEarned} pts (Etapa: ${stagePointsEarned}, GC: ${gcPointsEarned})`);
        } else {
          console.log(`      ⚠️ No encontrado: ${riderName}`);
        }
      }
      stagesProcessed++;
    }
    
    // Procesar GC Final
    const gcStage = await Stage.findOne({ stageNumber: 0 });
    if (gcStage && gcStage.generalClassification && gcStage.generalClassification.length > 0) {
      console.log(`   Procesando GC Final...`);
      
      for (const result of gcStage.generalClassification) {
        let riderName = result.riderName || '';
        riderName = riderName.replace(/^\d+\s+/, '').trim();
        const position = result.position;
        
        const rider = await findRiderByName(riderName);
        const isRetired = rider && rider.isRetired === true;
        
        if (isRetired) continue;
        
        const gcFinalPointsEarned = gcFinalPoints[position] || 0;
        if (gcFinalPointsEarned === 0) continue;
        
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
          console.log(`      ✅ ${rider.name}: GC Final +${gcFinalPointsEarned} pts`);
        }
      }
    }
    
    // Sincronizar ligas
    const leagues = await League.find({});
    let leaguesUpdated = 0;
    
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
        leaguesUpdated++;
      }
    }
    
    const retiredCount = await Rider.countDocuments({ isRetired: true });
    console.log(`\n✅ Proceso completado:`);
    console.log(`   📊 ${retiredCount} corredores marcados como retirados en total`);
    console.log(`   💰 ${totalPointsAssigned} pts asignados`);
    
    res.json({ 
      success: true, 
      stage: stageData,
      pointsRecalculated: totalPointsAssigned,
      stagesProcessed: stagesProcessed,
      leaguesUpdated: leaguesUpdated,
      retiredCount: retiredCount,
      message: `Etapa ${stageNumber} actualizada. ${retiredCount} corredores retirados. Puntos recalculados: ${totalPointsAssigned} pts.`
    });
    
  } catch (err) {
    console.error("Error actualizando resultados:", err);
    res.status(500).json({ error: err.message });
  }
});

// backend/routes/admin.js - Reemplazar la función update-all-stages-results

router.post("/update-all-stages-results", verifyAdmin, async (req, res) => {
  try {
    console.log("📊 Actualizando todas las etapas...");
    
    const pcsScraper = require('../services/pcsScraper');
    const Stage = require('../models/Stage');
    
    let stagesUpdated = 0;
    
    // Actualizar todas las etapas una por una
    for (let i = 1; i <= 21; i++) {
      console.log(`   Procesando etapa ${i}/21...`);
      
      const stageData = await pcsScraper.getFullStageResults(i);
      
      if (stageData.success && stageData.results && stageData.results.length > 0) {
        await Stage.findOneAndUpdate(
          { stageNumber: i },
          { 
            $set: {
              stageNumber: i,
              results: stageData.results,
              name: stageData.name,
              distanceKm: stageData.distanceKm,
              lastUpdated: new Date()
            }
          },
          { upsert: true }
        );
        stagesUpdated++;
        console.log(`      ✅ Etapa ${i} actualizada (${stageData.results.length} resultados)`);
      } else {
        console.log(`      ⚠️ Etapa ${i}: sin resultados`);
      }
      
      // Pequeña pausa para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n✅ ${stagesUpdated} etapas actualizadas`);
    
    // ==== RECALCULAR TODOS LOS PUNTOS ====
    console.log(`\n   🔄 Recalculando todos los puntos después de actualizar las etapas...`);
    
    const Rider = require("../models/Rider");
    const Team = require("../models/Team");
    const League = require("../models/League");
    
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
    
    async function findRiderByName(pcsRiderName) {
      if (!pcsRiderName) return null;
      const pcsCleanName = cleanNameForComparison(pcsRiderName);
      
      const rider = await Rider.findOne({
        $expr: {
          $regexMatch: {
            input: { $toLower: "$name" },
            regex: pcsCleanName,
            options: "i"
          }
        }
      });
      
      if (rider) return rider;
      
      const nameParts = pcsCleanName.split(' ');
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        const riderByLastName = await Rider.findOne({
          name: { $regex: lastName, $options: 'i' }
        });
        
        if (riderByLastName) {
          const riderCleanName = cleanNameForComparison(riderByLastName.name);
          const riderLastName = riderCleanName.split(' ').pop();
          if (riderLastName === lastName || riderLastName.includes(lastName) || lastName.includes(riderLastName)) {
            return riderByLastName;
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
    let leaguesUpdated = 0;
    
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
        leaguesUpdated++;
      }
    }
    
    console.log(`\n✅ Puntos recalculados: ${totalPointsAssigned} pts asignados`);
    
    res.json({ 
      success: true, 
      stagesUpdated,
      pointsRecalculated: totalPointsAssigned,
      leaguesUpdated: leaguesUpdated,
      message: `Se actualizaron ${stagesUpdated} etapas. Puntos recalculados: ${totalPointsAssigned} pts.`
    });
    
  } catch (err) {
    console.error("Error actualizando todas las etapas:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/backup", verifyAdmin, async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const Config = require("../models/Config");
    const Rider = require("../models/Rider");
    const Team = require("../models/Team");
    const Stage = require("../models/Stage");
    const User = require("../models/User");
    const League = require("../models/League");

    console.log("💾 Creando copia de seguridad...");

    // Recopilar todos los datos
    const backupData = {
      timestamp: new Date().toISOString(),
      config: await Config.findOne({}),
      riders: await Rider.find({}),
      teams: await Team.find({}),
      stages: await Stage.find({}),
      users: await User.find({}, { password: 0 }), // No incluir contraseñas
      leagues: await League.find({})
    };

    // Convertir a JSON
    const backupJson = JSON.stringify(backupData, null, 2);

    res.json({
      success: true,
      data: backupJson,
      filename: `backup-fantasy-cycling-${new Date().toISOString().split('T')[0]}.json`
    });

  } catch (err) {
    console.error("Error en backup:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/restore", verifyAdmin, async (req, res) => {
  try {
    const { backupData } = req.body;

    if (!backupData) {
      return res.status(400).json({ success: false, error: "No se proporcionó datos de backup" });
    }

    let data;
    try {
      // Si backupData es string, parsearlo
      data = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;
    } catch (err) {
      console.error("Error parseando backup:", err);
      return res.status(400).json({ success: false, error: "Formato de backup inválido: " + err.message });
    }

    console.log("📥 Restaurando copia de seguridad...");
    console.log(`   Tamaño del backup: ${JSON.stringify(backupData).length} caracteres`);

    const Config = require("../models/Config");
    const Rider = require("../models/Rider");
    const Team = require("../models/Team");
    const Stage = require("../models/Stage");
    const League = require("../models/League");

    // Limpiar collections (excepto users)
    console.log("   Limpiando datos existentes...");
    await Rider.deleteMany({});
    await Team.deleteMany({});
    await Stage.deleteMany({});
    await League.deleteMany({});
    await Config.deleteMany({});

    // Restaurar datos
    let restoredCount = 0;
    
    if (data.config) {
      await Config.create(data.config);
      restoredCount++;
      console.log("   ✓ Configuración restaurada");
    }
    if (data.riders && data.riders.length > 0) {
      await Rider.insertMany(data.riders);
      restoredCount++;
      console.log(`   ✓ ${data.riders.length} corredores restaurados`);
    }
    if (data.teams && data.teams.length > 0) {
      await Team.insertMany(data.teams);
      restoredCount++;
      console.log(`   ✓ ${data.teams.length} equipos restaurados`);
    }
    if (data.stages && data.stages.length > 0) {
      await Stage.insertMany(data.stages);
      restoredCount++;
      console.log(`   ✓ ${data.stages.length} etapas restauradas`);
    }
    if (data.leagues && data.leagues.length > 0) {
      await League.insertMany(data.leagues);
      restoredCount++;
      console.log(`   ✓ ${data.leagues.length} ligas restauradas`);
    }

    console.log(`✅ Copia de seguridad restaurada correctamente (${restoredCount} colecciones)`);

    res.json({
      success: true,
      message: `✅ Copia de seguridad restaurada correctamente. ${restoredCount} colecciones restauradas.`
    });

  } catch (err) {
    console.error("❌ Error en restauración:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// backend/routes/admin.js - Añadir este endpoint

const pricingConfig = require('../config/pricing');



// backend/routes/admin.js - Verifica que este endpoint exista
router.post("/recalculate-prices", verifyAdmin, async (req, res) => {
  try {
    console.log("💰 Recalculando precios de todos los corredores...");
    console.log("📡 Petición recibida en /api/admin/recalculate-prices");
    
    const Rider = require("../models/Rider");
    const pricingConfig = require('../config/pricing');
    
    const riders = await Rider.find({});
    console.log(`📊 Encontrados ${riders.length} corredores`);
    
    let updated = 0;
    let errors = 0;
    
    for (const rider of riders) {
      try {
        let pcsRank = rider.pcsRank;
        if (!pcsRank && rider.pcsData) {
          pcsRank = rider.pcsData.pcsRank || rider.pcsData.ranking;
        }
        
        const priceData = pricingConfig.calculatePrice({ pcsRank });
        const newPrice = Math.max(4, priceData.price);
        
        rider.price = newPrice;
        rider.priceScore = priceData.score;
        rider.priceFactors = priceData.factors;
        
        await rider.save();
        updated++;
        
        if (updated % 50 === 0) {
          console.log(`   Procesados ${updated}/${riders.length}...`);
        }
      } catch (err) {
        console.error(`   Error con ${rider.name}:`, err.message);
        errors++;
      }
    }
    
    const stats = await Rider.aggregate([
      { $group: {
        _id: null,
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }}
    ]);
    
    console.log(`✅ Proceso completado: ${updated} actualizados, ${errors} errores`);
    
    res.json({
      success: true,
      updated,
      errors,
      stats: {
        averagePrice: stats[0]?.avgPrice.toFixed(1) || 0,
        minPrice: stats[0]?.minPrice || 0,
        maxPrice: stats[0]?.maxPrice || 0
      }
    });
    
  } catch (err) {
    console.error("Error recalculando precios:", err);
    res.status(500).json({ error: err.message });
  }
});



// En backend/routes/admin.js, reemplaza la función recalculate-points con esta:

router.post("/recalculate-points", verifyAdmin, async (req, res) => {
  try {
    console.log("📊 Recalculando puntos de todos los corredores y equipos...");
    
    const Stage = require("../models/Stage");
    const Rider = require("../models/Rider");
    const Team = require("../models/Team");
    const League = require("../models/League");
    
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
    
    async function findRiderByName(pcsRiderName) {
      if (!pcsRiderName) return null;
      const pcsCleanName = cleanNameForComparison(pcsRiderName);
      
      const riders = await Rider.find({});
      for (const rider of riders) {
        const riderCleanName = cleanNameForComparison(rider.name);
        if (riderCleanName === pcsCleanName) {
          return rider;
        }
        const pcsLastName = pcsCleanName.split(' ').pop();
        const riderLastName = riderCleanName.split(' ').pop();
        if (pcsLastName && riderLastName && pcsLastName === riderLastName) {
          return rider;
        }
      }
      return null;
    }
    
    // 1. Resetear TODOS los puntos
    await Rider.updateMany({}, { $set: { points: 0 } });
    await Team.updateMany({}, { $set: { totalPoints: 0 } });
    
    // Resetear puntos individuales en cada equipo
    const allTeams = await Team.find({});
    for (const team of allTeams) {
      for (let i = 0; i < team.riders.length; i++) {
        team.riders[i].points = 0;
      }
      await team.save();
    }
    console.log("   ✓ Puntos reiniciados");
    
    // 2. Obtener etapas y acumular puntos
    const stages = await Stage.find({ stageNumber: { $gt: 0 } }).sort({ stageNumber: 1 });
    console.log(`   📋 Procesando ${stages.length} etapas...`);
    
    // Acumular puntos por riderId
    const puntosPorRider = new Map();
    
    for (const stage of stages) {
      if (!stage.results) continue;
      console.log(`   📍 Etapa ${stage.stageNumber}: ${stage.results.length} resultados`);
      
      for (const result of stage.results) {
        let riderName = result.riderName || '';
        riderName = riderName.replace(/^\d+\s+/, '').trim();
        if (!riderName) continue;
        
        // Si el corredor está retirado (DNF/DNS), no recibe puntos
        if (result.isRetired || result.positionType === 'DNF' || result.positionType === 'DNS' || result.positionType === 'DSQ') {
          continue;
        }
        
        const rider = await findRiderByName(riderName);
        if (!rider) {
          console.log(`      ⚠️ No encontrado: ${riderName}`);
          continue;
        }
        
        const stagePts = stagePoints[result.position] || 0;
        const gcPts = gcDailyPoints[result.gcPosition] || 0;
        const total = stagePts + gcPts;
        
        if (total > 0) {
          const actual = puntosPorRider.get(rider._id.toString()) || 0;
          puntosPorRider.set(rider._id.toString(), actual + total);
          console.log(`      ✅ ${rider.name}: +${total} pts (Etapa ${result.position}º, GC ${result.gcPosition || '?'}º)`);
        }
      }
    }
    
    // 3. GC Final
    const gcStage = await Stage.findOne({ stageNumber: 0 });
    if (gcStage && gcStage.generalClassification) {
      console.log(`   🏆 Procesando GC Final...`);
      for (const result of gcStage.generalClassification) {
        let riderName = result.riderName || '';
        riderName = riderName.replace(/^\d+\s+/, '').trim();
        if (!riderName) continue;
        
        // Si el corredor está retirado, no recibe puntos GC Final
        if (result.isRetired) continue;
        
        const rider = await findRiderByName(riderName);
        if (!rider) continue;
        
        const puntos = gcFinalPoints[result.position] || 0;
        if (puntos > 0) {
          const actual = puntosPorRider.get(rider._id.toString()) || 0;
          puntosPorRider.set(rider._id.toString(), actual + puntos);
          console.log(`      ✅ ${rider.name}: GC Final +${puntos} pts (${result.position}º)`);
        }
      }
    }
    
    // 4. Guardar puntos en corredores
    let totalAsignados = 0;
    for (const [riderId, puntos] of puntosPorRider) {
      await Rider.findByIdAndUpdate(riderId, { points: puntos });
      totalAsignados += puntos;
    }
    console.log(`\n   💰 Puntos asignados a corredores: ${totalAsignados} pts`);
    
    // 5. ACTUALIZAR EQUIPOS
    console.log(`\n   🔄 Actualizando equipos...`);
    const equipos = await Team.find({});
    let equiposActualizados = 0;
    
    for (const equipo of equipos) {
      let totalEquipo = 0;
      let equipoModificado = false;
      
      for (let i = 0; i < equipo.riders.length; i++) {
        const riderEquipo = equipo.riders[i];
        
        let riderActual = await Rider.findById(riderEquipo.riderId);
        
        if (!riderActual && riderEquipo.riderName) {
          riderActual = await findRiderByName(riderEquipo.riderName);
          if (riderActual) {
            equipo.riders[i].riderId = riderActual._id;
            equipoModificado = true;
          }
        }
        
        if (riderActual) {
          const puntosRider = riderActual.points || 0;
          if (equipo.riders[i].points !== puntosRider) {
            equipo.riders[i].points = puntosRider;
            equipoModificado = true;
          }
          totalEquipo += puntosRider;
        }
      }
      
      if (equipo.totalPoints !== totalEquipo) {
        equipo.totalPoints = totalEquipo;
        equipoModificado = true;
      }
      
      if (equipoModificado) {
        equipo.updatedAt = new Date();
        await equipo.save();
        equiposActualizados++;
        console.log(`      ✅ ${equipo.teamName}: ${totalEquipo} pts`);
      }
    }
    console.log(`   📊 ${equiposActualizados} equipos actualizados`);
    
    // 6. Sincronizar ligas
    console.log(`\n   🔄 Sincronizando ligas...`);
    const ligas = await League.find({});
    let ligasActualizadas = 0;
    
    for (const liga of ligas) {
      let ligaModificada = false;
      for (const entry of liga.teams) {
        const equipo = await Team.findOne({ userId: entry.userId });
        if (equipo && entry.totalPoints !== equipo.totalPoints) {
          entry.totalPoints = equipo.totalPoints || 0;
          ligaModificada = true;
        }
      }
      if (ligaModificada) {
        liga.teams.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        liga.updatedAt = new Date();
        await liga.save();
        ligasActualizadas++;
        console.log(`      ✅ ${liga.name}`);
      }
    }
    
    console.log(`\n✅ RECALCULO COMPLETADO!`);
    console.log(`   💰 ${totalAsignados} pts asignados`);
    console.log(`   📊 ${equiposActualizados} equipos actualizados`);
    console.log(`   🏆 ${ligasActualizadas} ligas sincronizadas`);
    
    res.json({
      success: true,
      totalPointsAssigned: totalAsignados,
      teamsUpdated: equiposActualizados,
      leaguesUpdated: ligasActualizadas
    });
    
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Eliminar datos de una etapa específica y recalcular puntos

router.post("/delete-stage-data", verifyAdmin, async (req, res) => {
  try {
    const { stageNumber } = req.body;
    
    if (!stageNumber || stageNumber < 1 || stageNumber > 21) {
      return res.status(400).json({ error: "Número de etapa inválido (1-21)" });
    }
    
    console.log(`🗑️ Eliminando datos de la etapa ${stageNumber}...`);
    
    const Stage = require("../models/Stage");
    
    // 1. Verificar si existe la etapa
    const stage = await Stage.findOne({ stageNumber });
    if (!stage || !stage.results || stage.results.length === 0) {
      return res.status(404).json({ error: `No hay datos de la etapa ${stageNumber} para eliminar` });
    }
    
    // 2. Eliminar los datos de la etapa
    await Stage.deleteOne({ stageNumber });
    console.log(`   ✓ Datos de etapa ${stageNumber} eliminados`);
    
    // 3. LLAMAR A LA FUNCIÓN DE RECÁLCULO DE PUNTOS
    console.log(`\n   🔄 Recalculando todos los puntos después de eliminar la etapa...`);
    
    const Rider = require("../models/Rider");
    const Team = require("../models/Team");
    const League = require("../models/League");
    
    // ==================== SISTEMA DE PUNTUACIÓN ====================
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
    // ===============================================================
    
    function cleanNameForComparison(name) {
      if (!name) return '';
      return name.replace(/^\d+\s+/, '').trim().toLowerCase();
    }
    
    async function findRiderByName(pcsRiderName) {
      if (!pcsRiderName) return null;
      const pcsCleanName = cleanNameForComparison(pcsRiderName);
      
      const rider = await Rider.findOne({
        $expr: {
          $regexMatch: {
            input: { $toLower: "$name" },
            regex: pcsCleanName,
            options: "i"
          }
        }
      });
      
      if (rider) return rider;
      
      const nameParts = pcsCleanName.split(' ');
      if (nameParts.length >= 2) {
        const lastName = nameParts[nameParts.length - 1];
        const riderByLastName = await Rider.findOne({
          name: { $regex: lastName, $options: 'i' }
        });
        
        if (riderByLastName) {
          const riderCleanName = cleanNameForComparison(riderByLastName.name);
          const riderLastName = riderCleanName.split(' ').pop();
          if (riderLastName === lastName || riderLastName.includes(lastName) || lastName.includes(riderLastName)) {
            return riderByLastName;
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
    
    // Resetear todos los puntos
    await Rider.updateMany({}, { $set: { points: 0 } });
    await Team.updateMany({}, { $set: { totalPoints: 0, 'riders.$[].points': 0 } });
    console.log(`   ✓ Puntos reiniciados`);
    
    // Obtener todas las etapas RESTANTES (después de eliminar)
    const remainingStages = await Stage.find({ stageNumber: { $gt: 0 } }).sort({ stageNumber: 1 });
    console.log(`   📋 Etapas restantes: ${remainingStages.length}`);
    
    let totalPointsAssigned = 0;
    let stagesProcessed = 0;
    
    // Procesar CADA ETAPA restante (incluyendo GC diaria)
    for (const stage of remainingStages) {
      if (!stage.results || stage.results.length === 0) {
        console.log(`   Etapa ${stage.stageNumber}: sin resultados, saltando...`);
        continue;
      }
      
      console.log(`   Procesando etapa ${stage.stageNumber} (${stage.results.length} resultados)...`);
      let stagePointsTotal = 0;
      
      for (const result of stage.results) {
        const position = result.position;
        let riderName = result.riderName || '';
        riderName = riderName.replace(/^\d+\s+/, '').trim();
        
        if (!riderName || riderName.length < 2) continue;
        
        // Puntos de etapa
        const stagePointsEarned = getStagePoints(position);
        
        // Puntos de GC diaria (importante!)
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
          
          stagePointsTotal += totalPointsEarned;
          totalPointsAssigned += totalPointsEarned;
        }
      }
      
      stagesProcessed++;
      console.log(`      Etapa ${stage.stageNumber}: ${stagePointsTotal} pts asignados`);
    }
    
    // Procesar GC Final (Clasificación General)
    const gcStage = await Stage.findOne({ stageNumber: 0 });
    if (gcStage && gcStage.generalClassification && gcStage.generalClassification.length > 0) {
      console.log(`   Procesando GC Final...`);
      let gcTotal = 0;
      
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
          
          gcTotal += gcFinalPointsEarned;
          totalPointsAssigned += gcFinalPointsEarned;
        }
      }
      
      console.log(`      GC Final: ${gcTotal} pts asignados`);
    }
    
    // Sincronizar ligas
    console.log(`   🔄 Sincronizando ligas...`);
    const leagues = await League.find({});
    let leaguesUpdated = 0;
    
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
        leaguesUpdated++;
      }
    }
    
    console.log(`\n✅ Etapa ${stageNumber} eliminada. Puntos recalculados: ${totalPointsAssigned} pts en ${stagesProcessed} etapas`);
    
    res.json({
      success: true,
      stageNumber,
      pointsRecalculated: totalPointsAssigned,
      stagesProcessed: stagesProcessed,
      leaguesUpdated: leaguesUpdated,
      message: `Etapa ${stageNumber} eliminada. Puntos recalculados: ${totalPointsAssigned} puntos asignados desde ${stagesProcessed} etapas restantes.`
    });
    
  } catch (err) {
    console.error("Error eliminando etapa:", err);
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;