const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Conectar a la Base de Datos MongoDB
connectDB();

app.use(cors());
app.use(express.json({ limit: '50mb' }));        // Aumentar límite a 50MB
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "..")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// Inyección de enrutadores modulares de la API
app.use("/api/riders", require("./routes/riders"));
app.use("/api/team", require("./routes/team"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/leagues", require("./routes/leagues")); 
app.use("/api/ranking", require("./routes/ranking"));
app.use("/api/results", require("./routes/results"));

app.get("/", (req, res) => {
  res.send("API Fantasy Cycling funcionando 🚴");
});

const PORT = process.env.PORT || 3000;

// Levantar escucha del servidor HTTP
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo correctamente en el puerto ${PORT}`);
});

// Aumentamos el tiempo de espera por si el scraping inicial asíncrono toma más tiempo del habitual
server.headersTimeout = 120000;
server.requestTimeout = 120000;