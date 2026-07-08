const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const psychologistRoutes = require("./routes/psychologistRoutes");
const chatRoutes = require("./routes/chatRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API de AmigoBot funcionando",
  });
});

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/psychologists", psychologistRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});