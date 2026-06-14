const { Router } = require("express");
const { db } = require("../db");

const router = Router();

// POST /register/creator
router.post("/creator", async (req, res) => {
  try {
    const { name, email, phone, instagram, website, city, type, bio } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });

    const result = await db.execute({
      sql: `INSERT INTO registrations (kind, name, email, phone, instagram, website, city, type, bio)
            VALUES ('creator',?,?,?,?,?,?,?,?)`,
      args: [name, email, phone ?? null, instagram ?? null, website ?? null, city ?? null, type ?? null, bio ?? null],
    });

    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /register/brand
router.post("/brand", async (req, res) => {
  try {
    const { name, email, phone, instagram, website, city, bio } = req.body;
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });

    const result = await db.execute({
      sql: `INSERT INTO registrations (kind, name, email, phone, instagram, website, city, bio)
            VALUES ('brand',?,?,?,?,?,?,?)`,
      args: [name, email, phone ?? null, instagram ?? null, website ?? null, city ?? null, bio ?? null],
    });

    res.status(201).json({ ok: true, id: Number(result.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /register — список заявок для админки
router.get("/", async (req, res) => {
  try {
    const { kind, status } = req.query;
    let sql = "SELECT * FROM registrations";
    const args = [];
    const conds = [];
    if (kind) { conds.push("kind = ?"); args.push(kind); }
    if (status) { conds.push("status = ?"); args.push(status); }
    if (conds.length) sql += " WHERE " + conds.join(" AND ");
    sql += " ORDER BY created_at DESC";

    const rows = await db.execute({ sql, args });
    res.json(rows.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /register/:id — сменить статус (approved/rejected)
// При approved — автоматически создаёт запись в creators или brands
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "new"].includes(status))
      return res.status(400).json({ error: "invalid status" });

    // Получаем заявку
    const { rows } = await db.execute({
      sql: "SELECT * FROM registrations WHERE id = ?",
      args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const reg = rows[0];

    // Обновляем статус
    await db.execute({
      sql: "UPDATE registrations SET status = ? WHERE id = ?",
      args: [status, req.params.id],
    });

    // При апруве — создаём запись в нужной таблице (если ещё не создана)
    if (status === "approved") {
      if (reg.kind === "creator") {
        const { rows: existing } = await db.execute({
          sql: "SELECT id FROM creators WHERE email = ?",
          args: [reg.email],
        });
        if (!existing.length) {
          await db.execute({
            sql: `INSERT INTO creators (name, bio, type, cities, instagram, email, phone, website)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              reg.name,
              reg.bio ?? null,
              reg.type || "ugc",
              JSON.stringify(reg.city ? [reg.city] : []),
              reg.instagram ?? null,
              reg.email,
              reg.phone ?? null,
              reg.website ?? null,
            ],
          });
        }
      } else if (reg.kind === "brand") {
        const { rows: existing } = await db.execute({
          sql: "SELECT id FROM brands WHERE name = ?",
          args: [reg.name],
        });
        if (!existing.length) {
          await db.execute({
            sql: `INSERT INTO brands (name, bio, website, instagram)
                  VALUES (?, ?, ?, ?)`,
            args: [reg.name, reg.bio ?? null, reg.website ?? null, reg.instagram ?? null],
          });
        }
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
