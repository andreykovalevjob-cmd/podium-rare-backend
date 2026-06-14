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
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "new"].includes(status))
      return res.status(400).json({ error: "invalid status" });

    await db.execute({
      sql: "UPDATE registrations SET status = ? WHERE id = ?",
      args: [status, req.params.id],
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
