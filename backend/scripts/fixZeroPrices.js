// backend/scripts/fixZeroPrices.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Rider = require('../models/Rider');
const pricingConfig = require('../config/pricing');

async function fixZeroPrices() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fantasy-cycling';
    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB\n');
    
    const riders = await Rider.find({ 
      $or: [
        { price: { $lt: 4 } },
        { price: { $exists: false } }
      ]
    });
    
    console.log(`📊 Encontrados ${riders.length} corredores con precio incorrecto\n`);
    
    let fixed = 0;
    
    for (const rider of riders) {
      let pcsRank = rider.pcsRank;
      if (!pcsRank && rider.pcsData) {
        pcsRank = rider.pcsData.pcsRank || rider.pcsData.ranking;
      }
      
      const priceData = pricingConfig.calculatePrice({ pcsRank });
      const newPrice = Math.max(4, priceData.price);
      
      console.log(`   ${rider.name}: ${rider.price || 0}M€ → ${newPrice}M€ (PCS Rank: ${pcsRank || 'N/A'})`);
      
      rider.price = newPrice;
      rider.priceScore = priceData.score;
      rider.priceFactors = priceData.factors;
      await rider.save();
      fixed++;
    }
    
    console.log(`\n✅ CORREGIDOS: ${fixed} corredores`);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

fixZeroPrices();