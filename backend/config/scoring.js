// backend/config/scoring.js
/**
 * Configuración del sistema de puntuación para Fantasy Cycling
 * MODIFICA ESTOS VALORES para cambiar la puntuación de las etapas y la clasificación general diaria
 */

const scoringConfig = {
  // Puntuación por posición en cada etapa (top 20)
  // Según el criterio solicitado
  stagePoints: {
    1: 220,
    2: 180,
    3: 160,
    4: 140,
    5: 120,
    6: 110,
    7: 95,
    8: 80,
    9: 70,
    10: 60,
    11: 50,
    12: 40,
    13: 35,
    14: 30,
    15: 25,
    16: 20,
    17: 16,
    18: 12,
    19: 8,
    20: 4
  },
  
  // Puntuación por posición en la clasificación general diaria (top 20)
  // Estos puntos se suman a los de etapa
  gcDailyPoints: {
    1: 30,
    2: 26,
    3: 22,
    4: 18,
    5: 16,
    6: 15,
    7: 14,
    8: 13,
    9: 12,
    10: 11,
    11: 10,
    12: 9,
    13: 8,
    14: 7,
    15: 6,
    16: 5,
    17: 4,
    18: 3,
    19: 2,
    20: 1
  },
  
  // Configuración adicional (bonos opcionales - desactivados por defecto)
  additionalBonuses: {
    // Bonus por ganar la etapa con más de X minutos de ventaja
    bigWinBonus: {
      enabled: false,
      minAdvantageMinutes: 2,
      bonusPoints: 20
    },
    // Bonus por vestir la maglia rosa (líder de la general)
    leaderBonus: {
      enabled: false,
      points: 10
    },
    // Bonus por mejor joven (maglia bianca)
    youthBonus: {
      enabled: false,
      points: 5
    }
  }
};

/**
 * Obtiene los puntos para una posición específica en etapa
 * @param {number} position - Posición del corredor (1-based)
 * @returns {number} - Puntos asignados
 */
function getStagePoints(position) {
  if (position <= 20) {
    return scoringConfig.stagePoints[position] || 0;
  }
  return 0;
}

/**
 * Obtiene los puntos para una posición específica en clasificación general diaria
 * @param {number} position - Posición del corredor (1-based)
 * @returns {number} - Puntos asignados
 */
function getGCDailyPoints(position) {
  if (position <= 20) {
    return scoringConfig.gcDailyPoints[position] || 0;
  }
  return 0;
}

/**
 * Calcula puntos totales para un corredor en una etapa
 * @param {number} stagePosition - Posición en la etapa
 * @param {number} gcPosition - Posición en la clasificación general (opcional)
 * @returns {number} - Puntos totales
 */
function calculateTotalPoints(stagePosition, gcPosition = null) {
  let total = getStagePoints(stagePosition);
  if (gcPosition !== null) {
    total += getGCDailyPoints(gcPosition);
  }
  return total;
}

module.exports = {
  scoringConfig,
  getStagePoints,
  getGCDailyPoints,
  calculateTotalPoints
};