const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const Team = require("../models/Team");
const Rider = require("../models/Rider");
const Config = require("../models/Config");

// =========================================================================
// FUNCIÓN AUXILIAR: Verificar si se puede modificar el equipo
// =========================================================================
async function canModifyTeam(userId, isAdmin = false) {
  if (isAdmin) return true; // Admin siempre puede modificar cualquier equipo
  
  const config = await Config.findOne({});
  if (!config || !config.maxTeamCreationDate) return true; // Sin fecha límite
  
  const today = new Date();
  const deadline = new Date(config.maxTeamCreationDate);
  
  // Si la fecha límite ya pasó, no se puede modificar
  return today <= deadline;
}

// =========================================================================
// RUTAS ESPECÍFICAS (deben ir ANTES de las rutas con parámetros)
// =========================================================================

// GET /api/team/maillots - Listar todas las imágenes de la carpeta assets/maillots
router.get("/maillots", async (req, res) => {
  try {
    console.log("🔍 Buscando maillots...");
    
    // Buscar en múltiples ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, "..", "..", "assets", "maillots"),
      path.join(__dirname, "..", "assets", "maillots"),
      path.join(process.cwd(), "assets", "maillots"),
      path.join(process.cwd(), "public", "assets", "maillots")
    ];
    
    let maillotsDir = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        maillotsDir = testPath;
        console.log("✅ Maillots encontrados en:", maillotsDir);
        break;
      }
    }
    
    if (!maillotsDir) {
      console.error("❌ No se encontró la carpeta de maillots");
      // Devolver al menos un maillot por defecto
      return res.json({ maillots: ["rabobank.png"] });
    }
    
    const files = await fs.promises.readdir(maillotsDir);
    const maillots = files.filter(file => /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(file));
    
    console.log(`📸 Encontrados ${maillots.length} maillots:`, maillots);
    
    // Si no hay maillots, devolver el por defecto
    if (maillots.length === 0) {
      maillots.push("rabobank.png");
    }
    
    res.json({ maillots });
  } catch (err) {
    console.error("❌ Error en maillots:", err);
    res.json({ maillots: ["rabobank.png"] });
  }
});

// =========================================================================
// RUTAS PRINCIPALES (con parámetros)
// =========================================================================

// GET /api/team/:userId - Obtener equipo por userId (CON VERIFICACIÓN DE FECHA)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.query.requestingUserId || userId;
    const isAdmin = req.query.isAdmin === 'true';
    
    console.log(`🔍 Buscando equipo para userId: ${userId} (admin: ${isAdmin})`);
    
    let team = await Team.findOne({ userId });
    
    if (!team) {
      console.log("📝 No se encontró equipo, creando uno nuevo");
      team = new Team({ 
        userId,
        teamName: "Mi Equipo",
        directorName: "Director",
        riders: [],
        maillotImage: "rabobank.png",
        totalPrice: 0,
        totalPoints: 0
      });
      await team.save();
    }
    
    // Obtener configuración para verificar fechas
    const config = await Config.findOne({});
    const deadlineDate = config?.maxTeamCreationDate || null;
    let deadlinePassed = false;
    let canModify = true;
    
    if (deadlineDate) {
      const now = new Date();
      const deadline = new Date(deadlineDate);
      deadlinePassed = now > deadline;
      
      // Solo se puede modificar si NO ha pasado la fecha O es admin
      canModify = !deadlinePassed || isAdmin;
    }
    
    console.log(`📅 Fecha límite: ${deadlineDate || 'sin límite'}, Pasó: ${deadlinePassed}, Puede modificar: ${canModify}`);
    
    res.json({
      ...team.toObject(),
      canModify,
      deadlinePassed,
      deadlineDate: deadlineDate || null
    });
  } catch (err) {
    console.error("❌ Error en GET /team/:userId:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team/add-rider/:userId/:riderId - Añadir corredor al equipo
router.post("/add-rider/:userId/:riderId", async (req, res) => {
  try {
    const { userId, riderId } = req.params;
    const isAdmin = req.body.isAdmin === true;
    
    console.log(`➕ Añadiendo rider ${riderId} al equipo del usuario ${userId} (admin: ${isAdmin})`);
    
    // Verificar fecha límite
    const canModify = await canModifyTeam(userId, isAdmin);
    if (!canModify) {
      console.log(`⛔ Fecha límite superada para userId: ${userId}`);
      return res.status(403).json({ 
        error: "La fecha límite para modificar equipos ha pasado. Ya no se pueden añadir o quitar corredores." 
      });
    }
    
    // Obtener configuración
    const config = await Config.findOne({});
    const maxRiders = config ? config.maxRiders : 8;
    const budget = config ? config.budget : 100;
    
    // Buscar o crear equipo
    let team = await Team.findOne({ userId });
    if (!team) {
      console.log("📝 Equipo no encontrado, creando uno nuevo");
      team = new Team({ userId });
      await team.save();
    }
    
    // Buscar corredor
    const rider = await Rider.findById(riderId);
    if (!rider) {
      console.log(`❌ Corredor no encontrado: ${riderId}`);
      return res.status(404).json({ error: "Corredor no encontrado" });
    }
    
    console.log(`   Corredor: ${rider.name}, Precio: ${rider.price}M€`);
    
    // Verificar límites
    if (team.riders.length >= maxRiders) {
      return res.status(400).json({ error: `Solo puedes tener un máximo de ${maxRiders} corredores` });
    }
    
    const riderExists = team.riders.some(r => r.riderId.toString() === riderId);
    if (riderExists) {
      return res.status(400).json({ error: "Este corredor ya está en tu equipo" });
    }
    
    const newTotalPrice = team.totalPrice + rider.price;
    if (newTotalPrice > budget) {
      return res.status(400).json({ error: `Presupuesto insuficiente. Límite: €${budget}M` });
    }
    
    // Añadir corredor
    team.riders.push({
      riderId: rider._id,
      riderName: rider.name,
      riderTeam: rider.team || "Sin equipo",
      riderPrice: rider.price,
      riderRating: rider.rating || 80,
      points: rider.points || 0
    });
    
    team.totalPrice = newTotalPrice;
    // Recalcular puntos totales del equipo
    team.totalPoints = team.riders.reduce((sum, r) => sum + (r.points || 0), 0);
    team.updatedAt = new Date();
    await team.save();
    
    console.log(`✅ Corredor añadido exitosamente. Total corredores: ${team.riders.length}, Precio total: ${team.totalPrice}M€`);
    res.json(team);
  } catch (err) {
    console.error("❌ Error en add-rider:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/remove-rider/:userId/:riderId - Remover corredor del equipo
router.delete("/remove-rider/:userId/:riderId", async (req, res) => {
  try {
    const { userId, riderId } = req.params;
    const isAdmin = req.query.isAdmin === 'true';
    
    console.log(`➖ Removiendo rider ${riderId} del equipo del usuario ${userId} (admin: ${isAdmin})`);
    
    // Verificar fecha límite
    const canModify = await canModifyTeam(userId, isAdmin);
    if (!canModify) {
      console.log(`⛔ Fecha límite superada para userId: ${userId}`);
      return res.status(403).json({ 
        error: "La fecha límite para modificar equipos ha pasado. Ya no se pueden añadir o quitar corredores." 
      });
    }
    
    let team = await Team.findOne({ userId });
    if (!team) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }
    
    // Verificar si el corredor existe en el equipo
    const riderExists = team.riders.some(r => r.riderId.toString() === riderId);
    if (!riderExists) {
      return res.status(404).json({ error: "El corredor no está en tu equipo" });
    }
    
    // Remover corredor
    team.riders = team.riders.filter(r => r.riderId.toString() !== riderId);
    team.totalPrice = team.riders.reduce((sum, r) => sum + (r.riderPrice || 0), 0);
    team.totalPoints = team.riders.reduce((sum, r) => sum + (r.points || 0), 0);
    team.updatedAt = new Date();
    await team.save();
    
    console.log(`✅ Corredor removido exitosamente. Total corredores: ${team.riders.length}, Precio total: ${team.totalPrice}M€`);
    res.json(team);
  } catch (err) {
    console.error("❌ Error en remove-rider:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/team/update/:userId - Actualizar configuración del equipo (nombre, director, maillot)
router.put("/update/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamName, directorName, maillotImage, isAdmin } = req.body;
    
    console.log(`✏️ Actualizando equipo del usuario ${userId}: ${teamName || 'sin cambios'}`);
    
    // Verificar fecha límite
    const canModify = await canModifyTeam(userId, isAdmin === true);
    if (!canModify) {
      console.log(`⛔ Fecha límite superada para userId: ${userId}`);
      return res.status(403).json({ 
        error: "La fecha límite para modificar equipos ha pasado. Ya no se pueden cambiar los datos del equipo." 
      });
    }
    
    let team = await Team.findOne({ userId });
    if (!team) {
      console.log("📝 Equipo no encontrado, creando uno nuevo");
      team = new Team({ userId });
    }
    
    if (teamName !== undefined && teamName.trim()) team.teamName = teamName.trim();
    if (directorName !== undefined && directorName.trim()) team.directorName = directorName.trim();
    if (maillotImage !== undefined) team.maillotImage = maillotImage;
    
    team.updatedAt = new Date();
    await team.save();
    
    console.log(`✅ Configuración guardada: ${team.teamName}, Maillot: ${team.maillotImage}`);
    res.json(team);
  } catch (err) {
    console.error("❌ Error en update:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// RUTAS AUXILIARES
// =========================================================================

// GET /api/team/check-deadline/:userId - Verificar si se puede modificar el equipo
router.get("/check-deadline/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const isAdmin = req.query.isAdmin === 'true';
    
    const canModify = await canModifyTeam(userId, isAdmin);
    const config = await Config.findOne({});
    
    res.json({
      canModify,
      deadlinePassed: !canModify && !isAdmin,
      deadlineDate: config?.maxTeamCreationDate || null,
      isAdmin
    });
  } catch (err) {
    console.error("❌ Error en check-deadline:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/stats/:userId - Obtener estadísticas del equipo (resumen rápido)
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const team = await Team.findOne({ userId });
    if (!team) {
      return res.json({
        ridersCount: 0,
        totalPrice: 0,
        totalPoints: 0,
        teamName: "Mi Equipo",
        directorName: "Director"
      });
    }
    
    res.json({
      ridersCount: team.riders.length,
      totalPrice: team.totalPrice,
      totalPoints: team.totalPoints,
      teamName: team.teamName,
      directorName: team.directorName,
      maillotImage: team.maillotImage
    });
  } catch (err) {
    console.error("❌ Error en stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team/sync-points/:userId - Sincronizar puntos del equipo con los corredores actuales
router.post("/sync-points/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    let team = await Team.findOne({ userId });
    if (!team) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }
    
    let totalPoints = 0;
    let updatedRiders = 0;
    
    // Actualizar puntos de cada corredor y recalcular total
    for (const rider of team.riders) {
      const dbRider = await Rider.findById(rider.riderId);
      if (dbRider) {
        const oldPoints = rider.points || 0;
        const newPoints = dbRider.points || 0;
        
        if (oldPoints !== newPoints) {
          rider.points = newPoints;
          updatedRiders++;
        }
        totalPoints += newPoints;
      }
    }
    
    team.totalPoints = totalPoints;
    team.updatedAt = new Date();
    await team.save();
    
    console.log(`🔄 Sincronizados puntos del equipo ${userId}: ${updatedRiders} corredores actualizados, Total: ${totalPoints} pts`);
    
    res.json({
      success: true,
      totalPoints,
      updatedRiders,
      ridersCount: team.riders.length
    });
  } catch (err) {
    console.error("❌ Error en sync-points:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;