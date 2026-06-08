const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Team = require("../models/Team");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB conectado");
    
    // Crear usuario admin si no existe
    await createAdminIfNotExists();
    
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Función para crear el usuario admin si no existe
async function createAdminIfNotExists() {
  try {
    // Buscar si ya existe un admin
    const adminExists = await User.findOne({ username: "admin" });
    
    if (!adminExists) {
      console.log("👑 Creando usuario administrador...");
      
      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash("admin1234", 10);
      
      // Crear admin
      const admin = new User({
        username: "admin",
        password: hashedPassword,
        email: "admin@fantasycycling.com",
        isAdmin: true,
        createdAt: new Date(),
        lastLogin: new Date()
      });
      
      await admin.save();
      console.log("✅ Usuario admin creado correctamente");
      console.log("   Usuario: admin");
      console.log("   Contraseña: admin1234");
      
      // Crear equipo para el admin
      const adminTeam = new Team({
        userId: admin._id,
        teamName: "Admin Team",
        directorName: "Administrador",
        riders: [],
        maillotImage: "rabobank.png",
        totalPrice: 0,
        totalPoints: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await adminTeam.save();
      console.log("✅ Equipo del admin creado correctamente");
      
    } else {
      console.log("✅ Usuario admin ya existe");
      
      // Opcional: Actualizar contraseña del admin por si acaso
      const hashedPassword = await bcrypt.hash("admin1234", 10);
      if (adminExists.password !== hashedPassword) {
        adminExists.password = hashedPassword;
        await adminExists.save();
        console.log("🔄 Contraseña del admin actualizada");
      }
    }
  } catch (err) {
    console.error("❌ Error al crear usuario admin:", err);
  }
}

module.exports = connectDB;