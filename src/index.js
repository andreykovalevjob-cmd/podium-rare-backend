require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { init } = require("./db");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());
app.use(express.json());

// Routes
app.use("/creators", require("./routes/creators"));
app.use("/brands", require("./routes/brands"));
app.use("/works", require("./routes/works"));

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
