// backend/routes/riders.js
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const Rider = require('../models/Rider');
const pricingConfig = require('../config/pricing');

// =========================================================================
// FUNCIÓN: OBTENER DATOS COMPLETOS DE UN CICLISTA USANDO PUPPETEER
// =========================================================================


async function scrapeCompleteRiderData(pcsSlug) {
  let browser = null;
  
  try {
    const cleanSlug = pcsSlug.trim().toLowerCase();
    const url = `https://www.procyclingstats.com/rider/${cleanSlug}`;
    
    console.log(`[Scraper] Lanzando navegador para: ${url}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080'
      ]
    });
    
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    });
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    const riderData = await page.evaluate(() => {
      const data = {
        photo: null,
        team: null,
        teamCode: null,
        fullName: null,
        nationality: null,
        dateOfBirth: null,  // ← Cambiado de birthDate a dateOfBirth
        age: null,
        height: null,
        weight: null,
        placeOfBirth: null,
        specialties: {
          onedayraces: 0,
          gc: 0,
          tt: 0,
          sprint: 0,
          climber: 0,
          hills: 0
        },
        specialty: null,
        riderType: null,
        uciRank: null,
        uciPoints: null,
        pcsRank: null,
        allTimeRank: null,
        wins: 0,
        gcWins: 0,
        stageWins: 0,
        grandTourWins: 0,
        monumentWins: 0,
        grandTours: 0,
        tourStarts: 0,
        giroStarts: 0,
        vueltaStarts: 0,
        popularity: null,
        biography: null,
        complete: true,
        lastUpdated: new Date().toISOString()
      };
      
      const cleanText = (text) => {
        if (!text) return null;
        return text.trim().replace(/[*‡†]/g, '').replace(/\s+/g, ' ').trim();
      };
      
      const bodyText = document.body.innerText;
      
      // NOMBRE COMPLETO
      const titleEl = document.querySelector('title');
      if (titleEl) {
        data.fullName = titleEl.innerText.replace(' | ProCyclingStats', '').trim();
      }
      
      // EQUIPO ACTUAL
      const teamSelectors = [
        '.titleCont .subtitle h2',
        '.titleCont .subtitle',
        '.rdr-info-cont span strong a',
        '.rdr-info-cont a[href*="/team/"]',
        '.info-cont a[href*="/team/"]'
      ];
      
      for (const selector of teamSelectors) {
        const teamEl = document.querySelector(selector);
        if (teamEl && teamEl.innerText) {
          let teamText = cleanText(teamEl.innerText);
          if (teamText && teamText.length > 0 && teamText.length < 50 && !teamText.includes('menu')) {
            data.team = teamText;
            const teamLink = teamEl.closest('a');
            if (teamLink && teamLink.href) {
              const teamMatch = teamLink.href.match(/\/team\/([^/]+)/);
              if (teamMatch) data.teamCode = teamMatch[1].toUpperCase();
            }
            break;
          }
        }
      }
      
      if (!data.team) {
        const teamMatch = bodyText.match(/Team:\s*([A-Z][a-zA-Z\s\-&]+?)(?:\n|$)/i);
        if (teamMatch) data.team = cleanText(teamMatch[1]);
      }
      
      // FOTO
      const imgSelectors = ['.rdr-img-cont img', '.rdr-img img', '.file img', 'img[src*="riders"]'];
      for (const selector of imgSelectors) {
        const img = document.querySelector(selector);
        if (img && img.src && !img.src.includes('placeholder') && !img.src.includes('blank')) {
          data.photo = img.src.startsWith('http') ? img.src : 'https://www.procyclingstats.com' + img.src;
          break;
        }
      }
      
      // ESPECIALIDADES
      const specialtyItems = document.querySelectorAll('.pps.list li, .rdr-specialties li');
      
      specialtyItems.forEach((item) => {
        const text = item.innerText || '';
        const valueMatch = text.match(/(\d+)/);
        let value = 0;
        if (valueMatch) value = parseInt(valueMatch[1]);
        
        const labelEl = item.querySelector('.xtitle, .title');
        let label = '';
        if (labelEl) {
          label = labelEl.innerText.toLowerCase();
        } else {
          if (text.toLowerCase().includes('onedayraces')) label = 'onedayraces';
          else if (text.toLowerCase().match(/\bgc\b/)) label = 'gc';
          else if (text.toLowerCase().includes('tt')) label = 'tt';
          else if (text.toLowerCase().includes('sprint')) label = 'sprint';
          else if (text.toLowerCase().includes('climber')) label = 'climber';
          else if (text.toLowerCase().includes('hills')) label = 'hills';
        }
        
        if (label && value > 0) {
          if (label.includes('oneday')) data.specialties.onedayraces = value;
          else if (label === 'gc') data.specialties.gc = value;
          else if (label === 'tt') data.specialties.tt = value;
          else if (label === 'sprint') data.specialties.sprint = value;
          else if (label === 'climber') data.specialties.climber = value;
          else if (label === 'hills') data.specialties.hills = value;
        }
      });
      


      // ========== CORREGIDO: FECHA DE NACIMIENTO ==========
      let dateOfBirth = null;
      let age = null;
      
      // Buscar el li que contiene "Date of birth:"
      const allListItems = document.querySelectorAll('.list li');
      for (const item of allListItems) {
        const itemHtml = item.innerHTML;
        if (itemHtml.includes('Date of birth:')) {
          // Extraer día, mes, año y edad usando regex flexible
          // El patrón puede tener diferentes clases: mr3, mr5, mr10, etc.
          const dayMatch = itemHtml.match(/<\/div><div[^>]*>(\d+)(?:st|nd|rd|th)?<\/div>/i);
          const monthMatch = itemHtml.match(/<\/div><div[^>]*>(\w+)<\/div><div[^>]*>(\d+)/i);
          const ageMatch = itemHtml.match(/<\/div><div[^>]*>\(<\/div><div[^>]*>(\d+)<\/div><div[^>]*>\)/i);
          
          if (dayMatch && monthMatch) {
            const day = dayMatch[1];
            const month = monthMatch[1];
            const year = monthMatch[2];
            
            const monthMap = {
              'January': '01', 'February': '02', 'March': '03', 'April': '04',
              'May': '05', 'June': '06', 'July': '07', 'August': '08',
              'September': '09', 'October': '10', 'November': '11', 'December': '12'
            };
            const monthNum = monthMap[month] || '01';
            dateOfBirth = `${year}-${monthNum}-${day.padStart(2, '0')}`;
            
            if (ageMatch) {
              age = parseInt(ageMatch[1]);
            }
            break;
          }
        }
      }
      
      // Fallback: buscar en el texto plano
      if (!dateOfBirth) {
        const textMatch = document.body.innerText.match(/Date of birth:\s*(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d+)\s+\((\d+)\)/i);
        if (textMatch) {
          const day = textMatch[1];
          const month = textMatch[2];
          const year = textMatch[3];
          const ageVal = textMatch[4];
          
          const monthMap = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
          };
          const monthNum = monthMap[month] || '01';
          dateOfBirth = `${year}-${monthNum}-${day.padStart(2, '0')}`;
          age = parseInt(ageVal);
        }
      }
      
      data.dateOfBirth = dateOfBirth;
      data.age = age;
      
      if (data.dateOfBirth) {
        console.log(`[Scraper] Fecha nacimiento: ${data.dateOfBirth} (${data.age} años)`);
      } else {
        console.log(`[Scraper] No se encontró fecha de nacimiento`);
      }
      
      // NACIONALIDAD
      const nationalityMatch = bodyText.match(/Nationality:\s*([^\n]+)/i);
      if (nationalityMatch) data.nationality = cleanText(nationalityMatch[1]);
      
      // ALTURA
      const heightMatch = bodyText.match(/Height:\s*([0-9.]+)\s*(?:cm|m)/i);
      if (heightMatch) {
        let heightVal = parseFloat(heightMatch[1]);
        if (!isNaN(heightVal)) {
          data.height = heightVal > 3 ? heightVal / 100 : heightVal;
        }
      }
      
      // PESO
      const weightMatch = bodyText.match(/Weight:\s*([0-9.]+)\s*kg/i);
      if (weightMatch) {
        let weightVal = parseFloat(weightMatch[1]);
        if (!isNaN(weightVal)) data.weight = weightVal;
      }
      
      // LUGAR DE NACIMIENTO
      const pobMatch = bodyText.match(/Place of birth:\s*([^\n]+)/i);
      if (pobMatch) data.placeOfBirth = cleanText(pobMatch[1]);
      
      // TIPO DE CORREDOR
      const typeMatch = bodyText.match(/Rider type:\s*([^\n]+)/i);
      if (typeMatch) {
        data.riderType = cleanText(typeMatch[1]);
        data.specialty = cleanText(typeMatch[1]);
      }
      
      // RANKINGS
      const uciRankMatch = bodyText.match(/World rank[\s\S]*?(\d+)/i);
      if (uciRankMatch) data.uciRank = parseInt(uciRankMatch[1]);
      
      const uciPointsMatch = bodyText.match(/UCI points[\s\S]*?(\d+(?:,\d+)?)/i);
      if (uciPointsMatch) data.uciPoints = parseInt(uciPointsMatch[1].replace(/,/g, ''));
      
      const pcsRankMatch = bodyText.match(/PCS Ranking[\s\S]*?(\d+)/i);
      if (pcsRankMatch) data.pcsRank = parseInt(pcsRankMatch[1]);
      
      // VICTORIAS
      const winsKpi = document.querySelector('.rider-kpi .kpi');
      if (winsKpi) {
        const winsVal = parseInt(winsKpi.innerText);
        if (!isNaN(winsVal)) data.wins = winsVal;
      }
      
      // GRANDES VUELTAS
      const grandToursMatch = bodyText.match(/Grand tours?\s*(\d+)/i);
      if (grandToursMatch) data.grandTours = parseInt(grandToursMatch[1]);
      
      const tourMatch = bodyText.match(/tour\s*\((\d+)\)/i);
      if (tourMatch) data.tourStarts = parseInt(tourMatch[1]);
      
      const giroMatch = bodyText.match(/giro\s*\((\d+)\)/i);
      if (giroMatch) data.giroStarts = parseInt(giroMatch[1]);
      
      const vueltaMatch = bodyText.match(/vuelta\s*\((\d+)\)/i);
      if (vueltaMatch) data.vueltaStarts = parseInt(vueltaMatch[1]);
      
      // POPULARIDAD
      const visitsMatch = bodyText.match(/Visits?:[\s\S]*?(\d+)/i);
      if (visitsMatch) data.popularity = parseInt(visitsMatch[1]);
      
      // BIOGRAFÍA
      const bioEl = document.querySelector('.rdr-biography, .biography, .description');
      if (bioEl && bioEl.innerText) {
        data.biography = bioEl.innerText.trim().substring(0, 1000);
      }
      
      return data;
    });
    
    await browser.close();
    
    console.log(`[Scraper] ✅ Datos obtenidos para ${cleanSlug}:`, {
      team: riderData.team,
      dateOfBirth: riderData.dateOfBirth,
      age: riderData.age,
      nationality: riderData.nationality,
      wins: riderData.wins,
      pcsRank: riderData.pcsRank
    });
    
    return riderData;
    
  } catch (err) {
    console.error(`[Scraper] Error al obtener datos de ${pcsSlug}:`, err.message);
    if (browser) await browser.close();
    
    return {
      complete: false,
      error: err.message,
      lastUpdated: new Date().toISOString(),
      specialties: { onedayraces: 0, gc: 0, tt: 0, sprint: 0, climber: 0, hills: 0 }
    };
  }
}

// =========================================================================
// RUTAS DE LA API
// =========================================================================

// GET /api/riders - Obtener todos los corredores básicos
router.get('/', async (req, res) => {
  try {
    const riders = await Rider.find({});
    res.json(riders);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/riders/rider-data/:riderId - Obtener datos completos del ciclista
router.get('/rider-data/:riderId', async (req, res) => {
  try {
    const { riderId } = req.params;
    
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ success: false, error: 'Ciclista no encontrado' });
    }
    
    console.log(`📝 Cargando datos detallados para: ${rider.name}`);
    
    let pcsData = rider.pcsData;
    let needsUpdate = !pcsData || !pcsData.lastUpdated || 
      (Date.now() - new Date(pcsData.lastUpdated).getTime() > 7 * 24 * 60 * 60 * 1000);
    
    if (!needsUpdate && pcsData && pcsData.complete) {
      console.log(`✅ Usando datos en caché para ${rider.name}`);
      return res.json({
        success: true,
        data: {
          _id: rider._id,
          name: rider.name,
          pcsSlug: rider.pcsSlug,
          price: rider.price,
          status: rider.status,
          points: rider.points,
          photo: rider.photo || pcsData.photo,
          team: rider.team || pcsData.team,
          teamCode: rider.teamCode || pcsData.teamCode,
          nationality: rider.nationality || pcsData.nationality,
          age: rider.age || pcsData.age,
          height: rider.height || pcsData.height,
          weight: rider.weight || pcsData.weight,
          specialty: rider.specialty || pcsData.specialty,
          riderType: rider.riderType || pcsData.riderType,
          uciPoints: rider.uciPoints || pcsData.uciPoints,
          uciRank: rider.uciRank || pcsData.uciRank,
          wins: rider.wins || pcsData.wins,
          specialties: rider.specialties || {},
          pcsData: pcsData
        }
      });
    }
    
    console.log(`🌐 Obteniendo datos actualizados de PCS para: ${rider.name} (${rider.pcsSlug})`);
    
    const freshData = await scrapeCompleteRiderData(rider.pcsSlug);
    
    if (freshData.complete) {
      try {
        if (freshData.photo) rider.photo = freshData.photo;
        if (freshData.team && freshData.team !== 'Sin equipo') rider.team = freshData.team;
        if (freshData.teamCode) rider.teamCode = freshData.teamCode;
        if (freshData.nationality) rider.nationality = freshData.nationality;
        if (freshData.age) rider.age = freshData.age;
        if (freshData.height) rider.height = freshData.height;
        if (freshData.weight) rider.weight = freshData.weight;
        if (freshData.placeOfBirth) rider.placeOfBirth = freshData.placeOfBirth;
        if (freshData.specialty) rider.specialty = freshData.specialty;
        if (freshData.riderType) rider.riderType = freshData.riderType;
        if (freshData.uciPoints) rider.uciPoints = freshData.uciPoints;
        if (freshData.uciRank) rider.uciRank = freshData.uciRank;
        if (freshData.pcsRank) rider.pcsRank = freshData.pcsRank;
        if (freshData.wins !== undefined && freshData.wins > 0) rider.wins = freshData.wins;
        if (freshData.grandTours) rider.grandTours = freshData.grandTours;
        if (freshData.popularity) rider.popularity = freshData.popularity;
        
        if (freshData.specialties && Object.keys(freshData.specialties).length > 0) {
          rider.specialties = freshData.specialties;
          console.log(`📊 Especialidades guardadas para ${rider.name}:`, freshData.specialties);
        }
        
        // Calcular y guardar el precio basado en los datos obtenidos
        await pricingConfig.calculateAndSavePrice(rider);
        rider.pcsData = freshData;
        await rider.save();
        console.log(`✅ Datos guardados en BD para ${rider.name}`);
      } catch (saveErr) {
        console.error(`⚠️ Error guardando datos para ${rider.name}:`, saveErr.message);
      }
    }
    
    return res.json({
      success: true,
      data: {
        _id: rider._id,
        name: rider.name,
        pcsSlug: rider.pcsSlug,
        price: rider.price,
        status: rider.status,
        points: rider.points,
        photo: rider.photo,
        team: rider.team,
        teamCode: rider.teamCode,
        nationality: rider.nationality,
        age: rider.age,
        height: rider.height,
        weight: rider.weight,
        specialty: rider.specialty,
        riderType: rider.riderType,
        uciPoints: rider.uciPoints,
        uciRank: rider.uciRank,
        wins: rider.wins,
        pcsData: rider.pcsData
      }
    });
    
  } catch (err) {
    console.error("Error en rider-data:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/riders/update-single/:riderId - Actualizar un ciclista individualmente
router.post("/update-single/:riderId", async (req, res) => {
  try {
    const { riderId } = req.params;
    const { userId } = req.body;
    
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador" });
    }
    
    const rider = await Rider.findById(riderId);
    if (!rider) {
      return res.status(404).json({ error: "Ciclista no encontrado" });
    }
    
    if (!rider.pcsSlug) {
      return res.status(400).json({ error: "Este ciclista no tiene slug de PCS para actualizar" });
    }
    
    console.log(`🔄 Actualizando ciclista individual: ${rider.name} (${rider.pcsSlug})`);
    
    const freshData = await scrapeCompleteRiderData(rider.pcsSlug);
    
    if (!freshData || freshData.complete === false) {
      return res.status(500).json({ error: "No se pudieron obtener datos actualizados" });
    }
    
    const updatedFields = [];
    
    // Actualizar campos básicos
    if (freshData.photo) {
      rider.photo = freshData.photo;
      updatedFields.push('foto');
    }
    if (freshData.team && freshData.team !== 'Sin equipo') {
      rider.team = freshData.team;
      updatedFields.push('equipo');
    }
    if (freshData.teamCode) {
      rider.teamCode = freshData.teamCode;
      updatedFields.push('código equipo');
    }
    if (freshData.nationality) {
      rider.nationality = freshData.nationality;
      updatedFields.push('nacionalidad');
    }
    if (freshData.dateOfBirth) {
  rider.dateOfBirth = freshData.dateOfBirth;
  updatedFields.push('fecha nacimiento');
}
if (freshData.age) {
  rider.age = freshData.age;
  updatedFields.push('edad');
}
    if (freshData.height) {
      rider.height = freshData.height;
      updatedFields.push('altura');
    }
    if (freshData.weight) {
      rider.weight = freshData.weight;
      updatedFields.push('peso');
    }
    if (freshData.placeOfBirth) {
      rider.placeOfBirth = freshData.placeOfBirth;
      updatedFields.push('lugar nacimiento');
    }
    if (freshData.specialty) {
      rider.specialty = freshData.specialty;
      updatedFields.push('especialidad');
    }
    if (freshData.riderType) {
      rider.riderType = freshData.riderType;
      updatedFields.push('tipo corredor');
    }
    if (freshData.uciPoints) {
      rider.uciPoints = freshData.uciPoints;
      updatedFields.push('puntos UCI');
    }
    if (freshData.uciRank) {
      rider.uciRank = freshData.uciRank;
      updatedFields.push('ranking UCI');
    }
    if (freshData.pcsRank) {
      rider.pcsRank = freshData.pcsRank;
      updatedFields.push('PCS Rank');
    }
    if (freshData.wins !== undefined && freshData.wins > 0) {
      rider.wins = freshData.wins;
      updatedFields.push('victorias');
    }
    if (freshData.grandTours) {
      rider.grandTours = freshData.grandTours;
      updatedFields.push('grandes vueltas');
    }
    if (freshData.popularity) {
      rider.popularity = freshData.popularity;
      updatedFields.push('popularidad');
    }
    
    if (freshData.specialties && Object.keys(freshData.specialties).length > 0) {
      rider.specialties = freshData.specialties;
      updatedFields.push('especialidades');
    }
    
    rider.pcsData = freshData;
    
    // ⭐ IMPORTANTE: Calcular y asignar el precio usando pricingConfig
    let pcsRank = rider.pcsRank || freshData.pcsRank;
    const priceData = pricingConfig.calculatePrice({ pcsRank });
    
    rider.price = Math.max(4, priceData.price);
    rider.priceScore = priceData.score;
    rider.priceFactors = priceData.factors;
    
    // Asegurar que el precio nunca sea 0
    if (rider.price < 4) {
      console.log(`   ⚠️ Precio ${rider.price} es menor que 4, forzando a 4`);
      rider.price = 4;
    }
    
    await rider.save();
    
    console.log(`✅ ${rider.name} actualizado: ${updatedFields.join(', ')}`);
    console.log(`💰 Precio calculado: ${rider.price}M€ (score: ${priceData.score.toFixed(3)}, PCS Rank: ${pcsRank || 'N/A'})`);
    
    res.json({
      success: true,
      updatedFields: updatedFields.join(', '),
      price: rider.price,
      priceScore: priceData.score,
      pcsRank: rider.pcsRank,
      message: `${rider.name} actualizado correctamente con precio ${rider.price}M€`,
      rider: {
        _id: rider._id,
        name: rider.name,
        team: rider.team,
        pcsRank: rider.pcsRank,
        wins: rider.wins,
        price: rider.price
      }
    });
    
  } catch (err) {
    console.error("Error actualizando ciclista:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/riders/update-all-data - Actualizar TODOS los ciclistas (Admin)
router.post("/update-all-data", async (req, res) => {
  try {
    const { userId } = req.body;
    
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador" });
    }
    
    console.log("🔄 Iniciando actualización masiva de TODOS los ciclistas...");
    
    const riders = await Rider.find({ pcsSlug: { $ne: null, $exists: true } });
    console.log(`📊 Total de ciclistas a actualizar: ${riders.length}`);
    
    let updated = 0;
    let errors = 0;
    const failedRiders = [];
    
    for (let i = 0; i < riders.length; i++) {
      const rider = riders[i];
      console.log(`\n📝 (${i + 1}/${riders.length}) Actualizando: ${rider.name} (${rider.pcsSlug})`);
      
      try {
        const freshData = await scrapeCompleteRiderData(rider.pcsSlug);
        
        if (freshData && freshData.complete !== false) {
          let updatedFields = [];
          
          if (freshData.photo) {
            rider.photo = freshData.photo;
            updatedFields.push('foto');
          }
          if (freshData.dateOfBirth) {
  rider.dateOfBirth = freshData.dateOfBirth;
  updatedFields.push('fecha nacimiento');
}
          if (freshData.team && freshData.team !== 'Sin equipo') {
            rider.team = freshData.team;
            updatedFields.push('equipo');
          }
          if (freshData.teamCode) {
            rider.teamCode = freshData.teamCode;
            updatedFields.push('código equipo');
          }
          if (freshData.nationality) {
            rider.nationality = freshData.nationality;
            updatedFields.push('nacionalidad');
          }
          if (freshData.age) {
            rider.age = freshData.age;
            updatedFields.push('edad');
          }
          if (freshData.height) {
            rider.height = freshData.height;
            updatedFields.push('altura');
          }
          if (freshData.weight) {
            rider.weight = freshData.weight;
            updatedFields.push('peso');
          }
          if (freshData.placeOfBirth) {
            rider.placeOfBirth = freshData.placeOfBirth;
            updatedFields.push('lugar nacimiento');
          }
          if (freshData.specialty) {
            rider.specialty = freshData.specialty;
            updatedFields.push('especialidad');
          }
          if (freshData.riderType) {
            rider.riderType = freshData.riderType;
            updatedFields.push('tipo corredor');
          }
          if (freshData.uciPoints) {
            rider.uciPoints = freshData.uciPoints;
            updatedFields.push('puntos UCI');
          }
          if (freshData.uciRank) {
            rider.uciRank = freshData.uciRank;
            updatedFields.push('ranking UCI');
          }
          if (freshData.pcsRank) {
            rider.pcsRank = freshData.pcsRank;
            updatedFields.push('PCS Rank');
          }
          if (freshData.wins !== undefined && freshData.wins > 0) {
            rider.wins = freshData.wins;
            updatedFields.push('victorias');
          }
          if (freshData.grandTours) {
            rider.grandTours = freshData.grandTours;
            updatedFields.push('grandes vueltas');
          }
          if (freshData.popularity) {
            rider.popularity = freshData.popularity;
            updatedFields.push('popularidad');
          }
          
          if (freshData.specialties && Object.keys(freshData.specialties).length > 0) {
            rider.specialties = freshData.specialties;
            updatedFields.push('especialidades');
          }
          
          rider.pcsData = freshData;
          
          // Calcular precio basado en PCS Rank
          let pcsRank = rider.pcsRank || freshData.pcsRank;
          const priceData = pricingConfig.calculatePrice({ pcsRank });
          rider.price = Math.max(4, priceData.price);
          rider.priceScore = priceData.score;
          rider.priceFactors = priceData.factors;
          
          await rider.save();
          
          updated++;
          console.log(`   ✅ Actualizado: ${updatedFields.join(', ')} | Precio: ${rider.price}M€`);
        } else {
          console.log(`   ⚠️ No se pudieron obtener datos completos`);
          errors++;
          failedRiders.push(rider.name);
        }
        
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        errors++;
        failedRiders.push(rider.name);
      }
      
      // Pequeña pausa entre solicitudes para no sobrecargar el servidor
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    res.json({ 
      success: true, 
      updated,
      errors,
      failedRiders,
      total: riders.length,
      message: `Actualización completada: ${updated} ciclistas actualizados, ${errors} errores`
    });
    
  } catch (err) {
    console.error("❌ Error en actualización masiva:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/riders/:id/price - Actualizar precio
router.put('/:id/price', async (req, res) => {
  try {
    const { price } = req.body;
    const rider = await Rider.findByIdAndUpdate(req.params.id, { price: parseInt(price) }, { new: true });
    res.json({ success: true, rider });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// GET /api/riders/retired - Obtener lista de corredores retirados
router.get('/retired', async (req, res) => {
  try {
    const retiredRiders = await Rider.find({ isRetired: true })
      .select('name isRetired retiredInStage retiredReason');
    
    res.json({ 
      success: true, 
      retired: retiredRiders,
      count: retiredRiders.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;