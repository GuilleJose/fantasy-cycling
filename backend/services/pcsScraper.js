// backend/services/pcsScraper.js
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const cheerio = require('cheerio');
const { getStagePoints, getGCDailyPoints, calculateTotalPoints } = require('../config/scoring');

class PCSScraper {
  constructor() {
    this.baseUrl = 'https://www.procyclingstats.com';
  }

  async fetchHTMLWithCurl(url) {
    try {
      const cmd = `curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" -H "Accept-Language: es-ES,es;q=0.9,en;q=0.8" --max-time 60 "${url}"`;
      
      const { stdout, stderr } = await execPromise(cmd, { maxBuffer: 1024 * 1024 * 10, timeout: 60000 });
      
      if (stderr && !stderr.includes('Warning')) {
        console.error(`Curl stderr:`, stderr);
      }
      
      if (!stdout || stdout.trim().length === 0) {
        return null;
      }
      
      if (stdout.includes('cloudflare') || stdout.includes('Just a moment...')) {
        return null;
      }
      
      return stdout;
    } catch (error) {
      console.error(`Error fetching with curl:`, error.message);
      return null;
    }
  }

  // =========================================================================
  // FUNCIÓN AUXILIAR PARA NORMALIZAR POSICIÓN (DNF, DNS, DSQ, OTL)
  // =========================================================================
  normalizePosition(positionText) {
    if (!positionText) return { type: 'unknown', display: '-', numeric: null, isRetired: false };
    const pos = positionText.trim().toUpperCase();
    
    if (pos === 'DNF') return { type: 'DNF', display: 'No terminó', numeric: null, isRetired: true };
    if (pos === 'DNS') return { type: 'DNS', display: 'No salió', numeric: null, isRetired: true };
    if (pos === 'DSQ') return { type: 'DSQ', display: 'Descalificado', numeric: null, isRetired: true };
    if (pos === 'OTL') return { type: 'OTL', display: 'Fuera de control', numeric: null, isRetired: true };
    
    // Limpiar caracteres especiales para números
    const cleanPos = pos.replace(/[^0-9]/g, '');
    const numeric = parseInt(cleanPos);
    if (!isNaN(numeric) && numeric > 0) {
      return { type: 'numeric', display: numeric, numeric: numeric, isRetired: false };
    }
    
    return { type: 'unknown', display: pos, numeric: null, isRetired: false };
  }

  // =========================================================================
  // RESULTADOS DE ETAPA - SOLO PESTAÑA STAGE (CON SOPORTE DNF/DNS)
  // =========================================================================
  async getStageResults(stageNumber) {
    const url = `${this.baseUrl}/race/giro-d-italia/2026/stage-${stageNumber}`;
    console.log(`📊 Obteniendo resultados STAGE de etapa ${stageNumber}...`);
    
    const html = await this.fetchHTMLWithCurl(url);
    if (!html) {
      return { error: true, message: `No se pudo obtener HTML para la etapa ${stageNumber}` };
    }
    
    const $ = cheerio.load(html);
    const results = [];
    
    // Buscar todas las tablas .results (la primera es STAGE, la segunda es GC si existe)
    const allResultTables = $('table.results');
    
    if (allResultTables.length === 0) {
      return { error: true, message: `No se encontraron tablas de resultados para la etapa ${stageNumber}` };
    }
    
    // Usar la PRIMERA tabla (resultados de etapa/STAGE)
    const resultTable = $(allResultTables[0]);
    
    if (resultTable.length === 0) {
      return { error: true, message: `No se encontró la tabla STAGE para la etapa ${stageNumber}` };
    }
    
    const rows = resultTable.find('tbody tr');
    
    console.log(`🔍 Encontradas ${rows.length} filas en la tabla STAGE`);
    
    rows.each((index, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      
      // Extraer posición - PUEDE SER DNF/DNS
      const positionText = $(cells[0]).text().trim();
      const positionInfo = this.normalizePosition(positionText);
      
      // Si es DNF/DNS/DSQ/OTL, no tiene posición numérica
      if (positionInfo.type === 'unknown') return;
      
      let riderName = null;
      const riderCell = $(row).find('.ridername');
      if (riderCell.length) {
        const riderLink = riderCell.find('a');
        riderName = riderLink.length ? riderLink.text().trim() : riderCell.text().trim();
      }
      
      if (!riderName) return;
      riderName = riderName.replace(/[*‡†]/g, '').replace(/\s+/g, ' ').trim();
      if (riderName.length === 0 || riderName.length > 100) return;
      
      let team = null;
      const teamCell = $(row).find('.cu600');
      if (teamCell.length) {
        team = teamCell.text().trim();
      }
      
      let time = null;
      const timeCell = $(row).find('.time');
      if (timeCell.length) {
        time = timeCell.text().trim();
        time = time.replace(/<span[^>]*>.*<\/span>/, '').trim();
      }
      
      // Para DNF/DNS, el tiempo es especial
      if (positionInfo.isRetired) {
        time = positionInfo.display;
      }
      
      // CALCULAR PUNTOS - DNF/DNS reciben 0 puntos
      let stagePoints = 0;
      if (!positionInfo.isRetired && positionInfo.numeric !== null) {
        stagePoints = getStagePoints(positionInfo.numeric);
      }
      
      results.push({
        position: positionInfo.numeric !== null ? positionInfo.numeric : positionInfo.type,
        positionDisplay: positionInfo.display,
        positionType: positionInfo.type,
        isRetired: positionInfo.isRetired,
        riderName,
        team: team || '-',
        time: time || '-',
        points: stagePoints,
        stagePoints: stagePoints
      });
    });
    
    if (results.length === 0) {
      return { error: true, message: `No se encontraron resultados en la pestaña STAGE para la etapa ${stageNumber}` };
    }
    
    let stageName = null;
    let distance = null;
    
    $('.title-line2, .titleCont .red').each((_, el) => {
      const text = $(el).text().trim();
      const kmMatch = text.match(/(\d+(?:\.\d+)?)\s*km/i);
      if (kmMatch && !distance) distance = parseFloat(kmMatch[1]);
      if (text.includes('›') || text.includes('&rsaquo;')) {
        if (!stageName) stageName = text.replace(/[()]/g, '').trim();
      }
    });
    
    const retiredCount = results.filter(r => r.isRetired).length;
    console.log(`✅ Etapa ${stageNumber} STAGE: ${results.length} resultados (${retiredCount} retirados/DNF/DNS)`);
    console.log(`   📊 Sistema de puntos etapa: 1º=${getStagePoints(1)} pts, 2º=${getStagePoints(2)} pts, 3º=${getStagePoints(3)} pts`);
    
    return {
      success: true,
      stageNumber,
      results,
      name: stageName || `Etapa ${stageNumber}`,
      distanceKm: distance || null
    };
  }

  // =========================================================================
  // CLASIFICACIÓN GENERAL (GC) - CON PUNTOS DIARIOS (SOPORTE DNF/DNS)
  // =========================================================================
  async getGeneralClassification() {
    console.log(`🏆 Buscando Clasificación General (GC) para puntos diarios...`);
    
    // Buscar en etapas desde la 21 hasta la 1
    for (let stageNum = 21; stageNum >= 1; stageNum--) {
      const gcUrl = `${this.baseUrl}/race/giro-d-italia/2026/stage-${stageNum}-gc`;
      console.log(`   Buscando GC en: ${gcUrl}`);
      
      const html = await this.fetchHTMLWithCurl(gcUrl);
      if (!html) {
        console.log(`   ⚠️ No se pudo obtener HTML para stage-${stageNum}-gc`);
        continue;
      }
      
      const gcData = this.parseGCFromHtml(html, stageNum);
      if (gcData.success && gcData.classification.length > 0) {
        // Añadir puntos GC diarios a cada corredor
        gcData.classification = gcData.classification.map(rider => {
          // Si el corredor está retirado, no recibe puntos GC
          let gcPoints = 0;
          if (!rider.isRetired && rider.position && typeof rider.position === 'number') {
            gcPoints = getGCDailyPoints(rider.position);
          }
          return {
            ...rider,
            gcPoints: gcPoints
          };
        });
        
        console.log(`✅ GC encontrada en etapa ${stageNum}: ${gcData.classification.length} corredores`);
        console.log(`   📊 Puntos GC diarios: 1º=${getGCDailyPoints(1)} pts, 2º=${getGCDailyPoints(2)} pts, 3º=${getGCDailyPoints(3)} pts`);
        return gcData;
      }
    }
    
    // Fallback: intentar con la página principal
    const mainUrl = `${this.baseUrl}/race/giro-d-italia/2026`;
    console.log(`   Buscando GC en página principal...`);
    const mainHtml = await this.fetchHTMLWithCurl(mainUrl);
    if (mainHtml) {
      const gcData = this.parseGCFromHtml(mainHtml, 0);
      if (gcData.success && gcData.classification.length > 0) {
        gcData.classification = gcData.classification.map(rider => {
          let gcPoints = 0;
          if (!rider.isRetired && rider.position && typeof rider.position === 'number') {
            gcPoints = getGCDailyPoints(rider.position);
          }
          return {
            ...rider,
            gcPoints: gcPoints
          };
        });
        console.log(`✅ GC encontrada en página principal: ${gcData.classification.length} corredores`);
        return gcData;
      }
    }
    
    return { error: true, message: 'No se encontró la clasificación general en ninguna etapa' };
  }

  // =========================================================================
  // RESULTADOS COMPLETOS DE ETAPA (STAGE + GC DIARIA) - CON DNF/DNS
  // =========================================================================
  async getFullStageResults(stageNumber) {
    console.log(`\n🏁 Obteniendo resultados completos para etapa ${stageNumber}...`);
    
    // Obtener resultados de etapa y GC en paralelo
    const [stageResults, gcResults] = await Promise.all([
      this.getStageResults(stageNumber),
      this.getGeneralClassification()
    ]);
    
    if (!stageResults.success) {
      return stageResults;
    }
    
    // Crear un mapa de GC por nombre de corredor para búsqueda rápida
    const gcMap = new Map();
    if (gcResults.success && gcResults.classification) {
      gcResults.classification.forEach(gcRider => {
        // Normalizar nombre para comparación
        const normalizedName = gcRider.riderName.toLowerCase().replace(/[^a-z]/g, '');
        gcMap.set(normalizedName, gcRider);
      });
    }
    
    // Combinar resultados: puntos de etapa + puntos GC diarios
    const combinedResults = stageResults.results.map(rider => {
      // Normalizar nombre del corredor
      const normalizedRiderName = rider.riderName.toLowerCase().replace(/[^a-z]/g, '');
      const gcRider = gcMap.get(normalizedRiderName);
      
      const gcPosition = gcRider && !gcRider.isRetired ? gcRider.position : null;
      const gcPoints = gcRider ? (gcRider.gcPoints || 0) : 0;
      
      // Si el corredor está retirado (DNF/DNS), no recibe puntos de GC
      let finalGcPoints = gcPoints;
      let finalGcPosition = gcPosition;
      
      if (rider.isRetired) {
        finalGcPoints = 0;
        finalGcPosition = null;
      }
      
      // Calcular puntos totales usando la función del sistema de puntuación
      // Para DNF/DNS, los puntos son 0
      let totalPoints = 0;
      if (!rider.isRetired && rider.position && typeof rider.position === 'number') {
        totalPoints = calculateTotalPoints(rider.position, finalGcPosition);
      }
      
      const positionDisplay = rider.positionDisplay || (rider.position?.toString() || '-');
      
      console.log(`   📊 ${rider.riderName}: ${rider.isRetired ? rider.positionDisplay : `Etapa ${rider.position}º (${rider.stagePoints} pts)`} + GC ${finalGcPosition || '?'}º (${finalGcPoints} pts) = ${totalPoints} pts totales`);
      
      return {
        ...rider,
        gcPosition: finalGcPosition,
        gcPoints: finalGcPoints,
        totalPoints: totalPoints,
        positionDisplay: positionDisplay,
        positionType: rider.positionType || (rider.isRetired ? rider.positionType : 'numeric'),
        isRetired: rider.isRetired || false,
        stagePoints: rider.stagePoints
      };
    });
    
    // Ordenar: primero los que terminaron (por posición), luego los retirados
    combinedResults.sort((a, b) => {
      if (a.isRetired && !b.isRetired) return 1;
      if (!a.isRetired && b.isRetired) return -1;
      if (!a.isRetired && !b.isRetired) return a.position - b.position;
      return 0;
    });
    
    const retiredCount = combinedResults.filter(r => r.isRetired).length;
    console.log(`\n✅ Etapa ${stageNumber} - Resumen de puntuación:`);
    if (combinedResults[0] && !combinedResults[0].isRetired) {
      console.log(`   🏆 Ganador etapa: ${combinedResults[0]?.riderName} - ${combinedResults[0]?.totalPoints} pts totales`);
    }
    if (retiredCount > 0) {
      console.log(`   ⚠️ ${retiredCount} corredores retirados/DNF/DNS (0 puntos)`);
    }
    
    return {
      success: true,
      stageNumber: stageNumber,
      name: stageResults.name,
      distanceKm: stageResults.distanceKm,
      results: combinedResults,
      lastUpdated: new Date()
    };
  }

  // =========================================================================
  // PARSEAR EXCLUSIVAMENTE LA TABLA DE CLASIFICACIÓN GENERAL (CON DNF/DNS)
  // =========================================================================
  parseGCFromHtml(html, stageNum) {
    const $ = cheerio.load(html);
    const classification = [];
    
    let gcTable = null;
    
    // Buscar la tabla que tiene las columnas "Prev" y "▼▲" (indicadores de cambio de posición)
    $('table.results').each((index, table) => {
      const headers = $(table).find('thead th');
      let hasPrevColumn = false;
      let hasChangeColumn = false;
      
      headers.each((_, th) => {
        const headerText = $(th).text().trim();
        if (headerText === 'Prev') hasPrevColumn = true;
        if (headerText === '▼▲') hasChangeColumn = true;
      });
      
      // La tabla de GC tiene columnas "Prev" y "▼▲"
      if (hasPrevColumn && hasChangeColumn) {
        gcTable = $(table);
        return false;
      }
    });
    
    // Si no se encontró por columnas, buscar la segunda tabla de resultados
    if (!gcTable || gcTable.length === 0) {
      const allTables = $('table.results');
      if (allTables.length >= 2) {
        // La segunda tabla es la de GC (la primera es de resultados de etapa)
        gcTable = $(allTables[1]);
        console.log(`   📋 Usando segunda tabla (índice 1) como GC`);
      }
    }
    
    if (!gcTable || gcTable.length === 0) {
      if (stageNum > 0) {
        console.log(`   ⚠️ No se encontró tabla GC en etapa ${stageNum}`);
      }
      return { error: true, message: 'No se encontró la tabla de GC' };
    }
    
    const rows = gcTable.find('tbody tr');
    
    if (rows.length === 0) {
      if (stageNum > 0) {
        console.log(`   ⚠️ Tabla GC vacía en etapa ${stageNum}`);
      }
      return { error: true, message: 'Tabla GC vacía' };
    }
    
    console.log(`   🔍 Tabla GC: ${rows.length} filas encontradas`);
    
    rows.each((index, row) => {
      const cells = $(row).find('td');
      if (cells.length < 4) return;
      
      // Posición (primera columna - Rnk) - PUEDE SER DNF/DNS
      const positionText = $(cells[0]).text().trim();
      const positionInfo = this.normalizePosition(positionText);
      
      // Si es DNF/DNS/DSQ/OTL, guardar como retirado
      const isRetired = positionInfo.isRetired;
      
      // Nombre del corredor
      let riderName = null;
      const riderCell = $(row).find('.ridername');
      if (riderCell.length) {
        const riderLink = riderCell.find('a');
        riderName = riderLink.length ? riderLink.text().trim() : riderCell.text().trim();
      }
      
      if (!riderName) {
        for (let i = 0; i < cells.length; i++) {
          const cellText = $(cells[i]).text().trim();
          if (cellText.match(/[A-Za-z]+\s+[A-Za-z]/) && cellText.length > 5 && cellText.length < 50) {
            const possibleName = cellText.replace(/[*‡†]/g, '').trim();
            if (possibleName && !possibleName.match(/^\d/)) {
              riderName = possibleName;
              break;
            }
          }
        }
      }
      
      if (!riderName) return;
      riderName = riderName.replace(/\s+/g, ' ').trim();
      if (riderName.length === 0 || riderName.length > 100) return;
      
      // Equipo
      let team = null;
      const teamCell = $(row).find('.cu600');
      if (teamCell.length) {
        team = teamCell.text().trim();
      }
      
      // Tiempo total GC - formato "75:13:16" o mensaje especial para DNF
      let time = null;
      for (let i = 0; i < cells.length; i++) {
        const cellText = $(cells[i]).text().trim();
        if (cellText.match(/^\d{2,3}:\d{2}:\d{2}$/)) {
          time = cellText;
          break;
        }
      }
      
      // Diferencia - formato "+4:03" o "4:03"
      let diff = null;
      for (let i = 0; i < cells.length; i++) {
        const cellText = $(cells[i]).text().trim();
        if (cellText.match(/^[+-]?\d{1,2}:\d{2}$/) && cellText !== time) {
          diff = cellText;
          break;
        }
      }
      
      // Para corredores retirados, mostrar mensaje especial
      if (isRetired) {
        time = positionInfo.display;
        diff = '-';
      }
      
      classification.push({
        position: isRetired ? positionInfo.type : (positionInfo.numeric !== null ? positionInfo.numeric : null),
        positionDisplay: positionInfo.display,
        positionType: positionInfo.type,
        isRetired: isRetired,
        riderName,
        team: team || '-',
        time: time || '-',
        diff: diff || '-'
      });
    });
    
    if (classification.length === 0) {
      if (stageNum > 0) {
        console.log(`   ⚠️ No se pudieron extraer datos de GC en etapa ${stageNum}`);
      }
      return { error: true, message: 'No se extrajeron datos de GC' };
    }
    
    const activeRiders = classification.filter(r => !r.isRetired);
    const retiredRiders = classification.filter(r => r.isRetired);
    
    console.log(`   📊 Primera fila GC: ${activeRiders[0]?.position}. ${activeRiders[0]?.riderName} - ${activeRiders[0]?.time}`);
    if (retiredRiders.length > 0) {
      console.log(`   ⚠️ ${retiredRiders.length} corredores retirados en GC`);
    }
    
    return { success: true, classification, stageNumber: stageNum };
  }

  // =========================================================================
  // VERIFICAR DISPONIBILIDAD
  // =========================================================================
  async checkRaceAvailability() {
    const url = `${this.baseUrl}/race/giro-d-italia/2026`;
    const html = await this.fetchHTMLWithCurl(url);
    
    if (!html) {
      return { available: false, reason: 'No se pudo conectar con ProCyclingStats' };
    }
    
    const $ = cheerio.load(html);
    const pageTitle = $('title').text();
    
    if (pageTitle.includes('404') || pageTitle.includes('Not Found')) {
      return { available: false, reason: 'El Giro 2026 aún no tiene página oficial' };
    }
    
    const hasResults = $('.rdr-results-table').length > 0 || 
                       $('.results-table').length > 0 ||
                       $('table.results').length > 0;
    
    return { 
      available: true, 
      hasResults: hasResults,
      message: hasResults ? 'Resultados disponibles' : 'Página existe pero aún sin resultados'
    };
  }

  // =========================================================================
  // OBTENER DATOS COMPLETOS DE UN CICLISTA (para actualización individual)
  // =========================================================================


async scrapeCompleteRiderData(pcsSlug) {
  const url = `${this.baseUrl}/rider/${pcsSlug}`;
  console.log(`   🌐 Obteniendo datos completos de: ${url}`);
  
  const html = await this.fetchHTMLWithCurl(url);
  if (!html) {
    return { complete: false, error: 'No se pudo obtener HTML' };
  }
  
  const $ = cheerio.load(html);
  const riderData = {
    complete: true,
    photo: null,
    team: null,
    teamCode: null,
    nationality: null,
    dateOfBirth: null,  // ← Usar dateOfBirth
    age: null,
    height: null,
    weight: null,
    placeOfBirth: null,
    specialty: null,
    riderType: null,
    uciRank: null,
    uciPoints: null,
    pcsRank: null,
    wins: 0,
    gcWins: 0,
    stageWins: 0,
    grandTourWins: 0,
    grandTours: 0,
    tourStarts: 0,
    giroStarts: 0,
    vueltaStarts: 0,
    monumentWins: 0,
    popularity: null,
    specialties: {
      onedayraces: 0,
      gc: 0,
      tt: 0,
      sprint: 0,
      climber: 0,
      hills: 0
    },
    lastUpdated: new Date().toISOString()
  };
  
  // Obtener el HTML completo para búsquedas
  const fullHtml = $.html();
  
  // ========== 1. EXTRAER EQUIPO ==========
  const teamEl = $('.subtitle h2').first();
  if (teamEl.length) {
    riderData.team = teamEl.text().trim();
    console.log(`   📋 Equipo: ${riderData.team}`);
  }
  
  // ========== 2. EXTRAER FOTO ==========
  const imgEl = $('.borderbox.left .borderbox img').first();
  if (imgEl.length && imgEl.attr('src')) {
    let photoUrl = imgEl.attr('src');
    if (photoUrl && !photoUrl.includes('placeholder')) {
      if (!photoUrl.startsWith('http')) {
        photoUrl = 'https://www.procyclingstats.com' + photoUrl;
      }
      riderData.photo = photoUrl;
      console.log(`   📸 Foto encontrada`);
    }
  }
  
  // ========== 3. EXTRAER FECHA DE NACIMIENTO (dateOfBirth) ==========
  // Buscar el patrón exacto del HTML mostrado
  const birthMatch = fullHtml.match(/Date of birth:<\/div><div[^>]*>(\d+)(?:st|nd|rd|th)?<\/div><div[^>]*>(\w+)<\/div><div[^>]*>(\d+)<\/div><div[^>]*>\((\d+)\)/i);
  if (birthMatch) {
    const day = birthMatch[1];
    const month = birthMatch[2];
    const year = birthMatch[3];
    const age = birthMatch[4];
    // Formato ISO: YYYY-MM-DD
    riderData.dateOfBirth = `${year}-${month}-${day.padStart(2, '0')}`;
    riderData.age = parseInt(age);
    console.log(`   📅 dateOfBirth: ${riderData.dateOfBirth} (${riderData.age} años)`);
  } else {
    // Fallback: buscar con regex más simple
    const simpleMatch = fullHtml.match(/Date of birth:.*?(\d+)(?:st|nd|rd|th)?\s*(\w+)\s*(\d+)\s*\((\d+)\)/i);
    if (simpleMatch) {
      const day = simpleMatch[1];
      const month = simpleMatch[2];
      const year = simpleMatch[3];
      const age = simpleMatch[4];
      riderData.dateOfBirth = `${year}-${month}-${day.padStart(2, '0')}`;
      riderData.age = parseInt(age);
      console.log(`   📅 dateOfBirth (fallback): ${riderData.dateOfBirth}`);
    }
  }
  
  // ========== 4. EXTRAER NACIONALIDAD ==========
  const nationalityMatch = fullHtml.match(/Nationality:<\/div><div[^>]*><span[^>]*><\/span><\/div><div[^>]*><a[^>]*>([^<]+)<\/a>/i);
  if (nationalityMatch) {
    riderData.nationality = nationalityMatch[1].trim();
    console.log(`   🌍 Nacionalidad: ${riderData.nationality}`);
  } else {
    // Fallback
    const simpleNationality = fullHtml.match(/Nationality:.*?<a[^>]*>([^<]+)<\/a>/i);
    if (simpleNationality) {
      riderData.nationality = simpleNationality[1].trim();
    }
  }
  
  // ========== 5. EXTRAER PESO Y ALTURA ==========
  const weightMatch = fullHtml.match(/Weight:<\/div><div[^>]*>(\d+)<\/div><div[^>]*>kg/i);
  if (weightMatch) riderData.weight = parseInt(weightMatch[1]);
  
  const heightMatch = fullHtml.match(/Height:<\/div><div[^>]*>([\d.]+)<\/div><div[^>]*>m/i);
  if (heightMatch) riderData.height = parseFloat(heightMatch[1]);
  
  // ========== 6. EXTRAER LUGAR DE NACIMIENTO ==========
  const pobMatch = fullHtml.match(/Place of birth:<\/div><div[^>]*><a[^>]*>([^<]+)<\/a>/i);
  if (pobMatch) {
    riderData.placeOfBirth = pobMatch[1].trim();
  }
  
  // ========== 7. EXTRAER ESPECIALIDADES ==========
  $('.pps.list li').each((_, item) => {
    const text = $(item).text().trim();
    const valueMatch = text.match(/(\d+)/);
    let value = 0;
    if (valueMatch) value = parseInt(valueMatch[1]);
    
    const lowerText = text.toLowerCase();
    if (lowerText.includes('onedayraces')) {
      riderData.specialties.onedayraces = value;
    } else if (lowerText.match(/\bgc\b/)) {
      riderData.specialties.gc = value;
    } else if (lowerText.includes('tt')) {
      riderData.specialties.tt = value;
    } else if (lowerText.includes('sprint')) {
      riderData.specialties.sprint = value;
    } else if (lowerText.includes('climber')) {
      riderData.specialties.climber = value;
    } else if (lowerText.includes('hills')) {
      riderData.specialties.hills = value;
    }
  });
  
  // ========== 8. EXTRAER RANKINGS ==========
  const bodyText = $('body').text();
  
  const pcsRankMatch = bodyText.match(/PCS Ranking[\s\S]*?(\d+)/i);
  if (pcsRankMatch) {
    riderData.pcsRank = parseInt(pcsRankMatch[1]);
  }
  
  const allTimeMatch = bodyText.match(/All time[\s\S]*?(\d+)/i);
  if (allTimeMatch) {
    riderData.uciRank = parseInt(allTimeMatch[1]);
  }
  
  // ========== 9. EXTRAER VICTORIAS Y GRANDES VUELTAS ==========
  $('.rider-kpi li').each((_, item) => {
    const kpiValue = $(item).find('.kpi').first().text().trim();
    const title = $(item).find('.title').text().toLowerCase();
    const infoText = $(item).find('.info').text().toLowerCase();
    
    if (title.includes('wins') && !isNaN(parseInt(kpiValue))) {
      riderData.wins = parseInt(kpiValue);
      
      const gcMatch = infoText.match(/gc\s*\((\d+)\)/i);
      if (gcMatch) riderData.gcWins = parseInt(gcMatch[1]);
      
      const stageMatch = infoText.match(/stage\s*\((\d+)\)/i);
      if (stageMatch) riderData.stageWins = parseInt(stageMatch[1]);
    }
    
    if (title.includes('grand tours') && !isNaN(parseInt(kpiValue))) {
      riderData.grandTours = parseInt(kpiValue);
      
      const tourMatch = infoText.match(/tour\s*\((\d+)\)/i);
      if (tourMatch) riderData.tourStarts = parseInt(tourMatch[1]);
      
      const giroMatch = infoText.match(/giro\s*\((\d+)\)/i);
      if (giroMatch) riderData.giroStarts = parseInt(giroMatch[1]);
      
      const vueltaMatch = infoText.match(/vuelta\s*\((\d+)\)/i);
      if (vueltaMatch) riderData.vueltaStarts = parseInt(vueltaMatch[1]);
    }
  });
  
  // ========== 10. EXTRAER POPULARIDAD ==========
  const visitsMatch = bodyText.match(/Visits?:[\s\S]*?(\d+)/i);
  if (visitsMatch) {
    riderData.popularity = parseInt(visitsMatch[1]);
  }
  
  // ========== 11. EXTRAER TIPO DE CORREDOR ==========
  const typeMatch = bodyText.match(/Rider type:\s*([^\n]+)/i);
  if (typeMatch) {
    riderData.riderType = typeMatch[1].trim();
    riderData.specialty = riderData.riderType;
  }
  
  console.log(`   ✅ ${riderData.team || 'Sin equipo'} | ${riderData.dateOfBirth || 'Sin fecha'} | ${riderData.wins} victorias | ${riderData.grandTours} GT`);
  
  return riderData;
}

}

module.exports = new PCSScraper();