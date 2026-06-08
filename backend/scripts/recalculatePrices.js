// backend/scripts/recalculatePrices.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Rider = require('../models/Rider');
const pricingConfig = require('../config/pricing');

async function recalculateAllPrices() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fantasy-cycling';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');
    
    console.log('🔄 Recalculando precios de todos los corredores...\n');
    console.log('📊 FÓRMULA: SOLO PCS Rank (1-5: 33-35M€ | 6-10: 28-32M€ | 11-20: 24-27M€ | 21-50: 16-23M€ | 51-100: 10-15M€ | 101-200: 6-9M€ | >200: 4-5M€)\n');
    console.log('='.repeat(70));
    
    const riders = await Rider.find({});
    console.log(`📊 Total de corredores: ${riders.length}\n`);
    
    let updated = 0;
    let noRankCount = 0;
    
    for (let i = 0; i < riders.length; i++) {
      const rider = riders[i];
      
      // Obtener pcsRank
      let pcsRank = rider.pcsRank;
      if (!pcsRank && rider.pcsData) {
        pcsRank = rider.pcsData.pcsRank || rider.pcsData.ranking;
        if (pcsRank) {
          rider.pcsRank = pcsRank;
          await rider.save();
        }
      }
      
      if (!pcsRank) {
        noRankCount++;
      }
      
      const oldPrice = rider.price || 0;
      const priceData = pricingConfig.calculatePrice({ pcsRank });
      
      rider.price = priceData.price;
      rider.priceScore = priceData.score;
      rider.priceFactors = priceData.factors;
      
      await rider.save();
      updated++;
      
      if (oldPrice !== priceData.price) {
        console.log(`   ${rider.name}: ${oldPrice}M€ → ${priceData.price}M€ (PCS Rank: ${pcsRank || 'N/A'})`);
      }
    }
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ PROCESO COMPLETADO!`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Precios recalculados: ${updated}`);
    if (noRankCount > 0) {
      console.log(`   Corredores sin PCS Rank: ${noRankCount} (precio mínimo 4M€)`);
    }
    
    // Estadísticas
    const stats = await Rider.aggregate([
      { $group: {
        _id: null,
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }}
    ]);
    
    console.log(`\n📊 ESTADÍSTICAS DE PRECIOS:`);
    console.log(`   Precio promedio: ${stats[0]?.avgPrice.toFixed(1) || 0}M€`);
    console.log(`   Precio mínimo: ${stats[0]?.minPrice || 0}M€`);
    console.log(`   Precio máximo: ${stats[0]?.maxPrice || 0}M€`);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

recalculateAllPrices();