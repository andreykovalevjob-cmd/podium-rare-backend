const { Router } = require("express");
const { db } = require("../db");
const { upload } = require("../cloudinary");

const router = Router();

// POST /creators — создать креатора (с опциональным аватаром)
router.post("/", upload.single("avatar"), async (req, res) => {
  try {
    const { name, bio, type, cities, price_min, price_max, instagram, email, phone, website, keywords } =
      req.body;

    if (!name || !type || !cities)
      return res.status(400).json({ error: "name, type, cities — обязательны" });

    const citiesJson =
      typeof cities === "string" ? cities : JSON.stringify(cities);

    const avatar_url = req.file?.path ?? null;

    const result = await db.execute({
      sql: `INSERT INTO creators (name, bio, type, cities, price_min, price_max, instagram, email, phone, website, keywords, avatar_url)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        name,
        bio ?? null,
        type,
        citiesJson,
        price_min ?? null,
        price_max ?? null,
        instagram ?? null,
        email ?? null,
        phone ?? null,
        website ?? null,
        keywords ?? null,
        avatar_url,
      ],
    });

    res.status(201).json({ id: Number(result.lastInsertRowid), name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /creators — список (фильтр: ?city=NYC&type=photo)
router.get("/", async (req, res) => {
  try {
    const { city, type } = req.query;
    let sql = "SELECT * FROM creators";
    const args = [];

    const conditions = [];
    if (type) {
      conditions.push("type = ?");
      args.push(type);
    }
    if (city) {
      conditions.push("cities LIKE ?");
      args.push(`%${city}%`);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY created_at DESC";

    const rows = await db.execute({ sql, args });
    const creators = rows.rows.map((r) => ({
      ...r,
      cities: JSON.parse(r.cities),
    }));
    res.json(creators);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /creators/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: "SELECT * FROM creators WHERE id = ?",
      args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: "Не найден" });

    const creator = { ...rows[0], cities: JSON.parse(rows[0].cities) };

    // работы
    const works = await db.execute({
      sql: "SELECT * FROM works WHERE creator_id = ? ORDER BY created_at DESC",
      args: [req.params.id],
    });
    creator.works = works.rows;

    res.json(creator);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /creators/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM creators WHERE id = ?",
      args: [req.params.id],
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
