require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { init } = require("./db");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// Routes
app.use("/creators", require("./routes/creators"));
app.use("/brands", require("./routes/brands"));
app.use("/works", require("./routes/works"));
app.use("/register", require("./routes/registrations"));
app.use("/auth", require("./routes/auth"));
app.use("/auth", require("./routes/google-auth"));

// Health check
app.get("/", (req, res) => res.json({ ok: true, service: "Podium Rare API" }));

const PORT = process.env.PORT || 3001;

init()
  .then(() => {
    app.listen(PORT, () => console.log(`Podium Rare API → http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  });
