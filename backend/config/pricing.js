// backend/config/pricing.js
const pricingConfig = {
  // Precio mínimo
  MIN_PRICE: 4,
  // Precio máximo
  MAX_PRICE: 35,
  // Precio base (media ~12.5M€)
  BASE_PRICE: 12,
  
  /**
   * Calcula precio basado SOLAMENTE en PCS Rank
   * @param {Object} params - { pcsRank: number }
   * @returns {Object} { price: number, score: number }
   */
  calculatePrice(params) {
    const { pcsRank } = params;
    
    // Si no hay ranking, precio mínimo
    if (!pcsRank || isNaN(pcsRank) || pcsRank <= 0) {
      return {
        price: this.MIN_PRICE,
        score: 0,
        factors: { pcsRank: null, message: 'Sin ranking PCS' }
      };
    }
    
    // PCS Rank: 1 es el mejor, números más altos son peores
    // Mapeamos para que el mejor ranking tenga el precio más alto
    // Usamos una escala exponencial inversa
    
    // Definimos que el Top 10 (rank 1-10) tenga precios 30-35
    // Rank 11-50: precios 20-29
    // Rank 51-100: precios 12-19
    // Rank 101-200: precios 7-11
    // Resto: precios 4-6
    
    let price;
    let score;
    
    if (pcsRank <= 5) {
      // Los 5 mejores: 33-35M€
      price = 33 + Math.floor((5 - pcsRank) / 2);
      score = 0.95;
    } else if (pcsRank <= 10) {
      // Puestos 6-10: 28-32M€
      price = 32 - (pcsRank - 6);
      score = 0.85;
    } else if (pcsRank <= 20) {
      // Puestos 11-20: 24-27M€
      price = 27 - (pcsRank - 11);
      score = 0.75;
    } else if (pcsRank <= 50) {
      // Puestos 21-50: 16-23M€
      price = 23 - Math.floor((pcsRank - 21) / 4);
      score = 0.65;
    } else if (pcsRank <= 100) {
      // Puestos 51-100: 10-15M€
      price = 15 - Math.floor((pcsRank - 51) / 10);
      score = 0.50;
    } else if (pcsRank <= 200) {
      // Puestos 101-200: 6-9M€
      price = 9 - Math.floor((pcsRank - 101) / 25);
      score = 0.35;
    } else {
      // Resto: 4-5M€
      price = 4 + Math.min(1, Math.floor((pcsRank - 201) / 300));
      score = 0.20;
    }
    
    // Asegurar límites
    price = Math.max(this.MIN_PRICE, Math.min(this.MAX_PRICE, price));
    score = Math.max(0, Math.min(1, score));
    
    return {
      price: Math.round(price), // Redondear a entero
      score: Math.round(score * 100) / 100,
      factors: { pcsRank, formula: 'PCS Rank' }
    };
  },
  
  /**
   * Calcula y guarda el precio en el corredor
   */
  async calculateAndSavePrice(rider) {
    // Obtener pcsRank de donde esté disponible
    let pcsRank = rider.pcsRank;
    
    if (!pcsRank && rider.pcsData) {
      pcsRank = rider.pcsData.pcsRank || rider.pcsData.ranking;
    }
    
    const priceData = this.calculatePrice({ pcsRank });
    
    rider.price = priceData.price;
    rider.priceScore = priceData.score;
    rider.priceFactors = priceData.factors;
    
    await rider.save();
    
    return priceData;
  }
};

module.exports = pricingConfig;