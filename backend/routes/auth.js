const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Team = require("../models/Team");
const router = express.Router();

// Registrar nuevo usuario
router.post("/register", async (req, res) => {
  try {
    const { username, password, confirmPassword, email } = req.body;

    console.log("Intento de registro:", { username, email });

    // Validaciones
    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Las contraseñas no coinciden" });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 4 caracteres" });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario (el admin NO se crea aquí, se crea con script aparte)
    const user = new User({
      username,
      password: hashedPassword,
      email: email || "",
      isAdmin: false, // Nunca crear admin desde registro normal
      createdAt: new Date(),
      lastLogin: new Date()
    });

    await user.save();

    // Crear equipo para el usuario
    const team = new Team({
      userId: user._id,
      teamName: `Equipo de ${username}`,
      directorName: username,
      riders: [],
      maillotImage: "rabobank.png",
      totalPrice: 0,
      totalPoints: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await team.save();

    res.json({ 
      success: true, 
      message: "Usuario registrado correctamente",
      userId: user._id
    });
  } catch (err) {
    console.error("Error en registro:", err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log("Intento de login:", username);

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    // Buscar usuario
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }

    // Actualizar última conexión
    user.lastLogin = new Date();
    await user.save();

    // Obtener equipo del usuario
    const team = await Team.findOne({ userId: user._id });

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        teamId: team?._id
      }
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: err.message });
  }
});

// Verificar sesión
router.post("/verify", async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.json({ valid: false });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ valid: false });
    }

    const team = await Team.findOne({ userId: user._id });

    res.json({ 
      valid: true, 
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        teamId: team?._id
      }
    });
  } catch (err) {
    console.error("Error en verify:", err);
    res.json({ valid: false });
  }
});

module.exports = router;