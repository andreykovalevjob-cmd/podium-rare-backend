const { Router } = require("express");
const { db } = require("../db");

const router = Router();

// GET /offers — список всех офферов (фильтры: status, from_type, to_type)
router.get("/", async (req, res) => {
  try {
    const { status, from_type, to_type } = req.query;
    let sql = "SELECT * FROM offers WHERE 1=1";
    const args = [];
    if (status)    { sql += " AND status = ?";    args.push(status); }
    if (from_type) { sql += " AND from_type = ?"; args.push(from_type); }
    if (to_type)   { sql += " AND to_type = ?";   args.push(to_type); }
    sql += " ORDER BY created_at DESC";
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /offers/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM offers WHERE id = ?",
      args: [req.params.id],
    });
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /offers — создать оффер
router.post("/", async (req, res) => {
  try {
    const {
      from_type, from_id, from_name,
      to_type, to_id, to_name,
      description, location, dates, brief,
      budget_min, budget_max, negotiable,
      package: pkg, status, notes,
    } = req.body;

    if (!from_type || !from_name || !to_type)
      return res.status(400).json({ error: "from_type, from_name, to_type — обязательны" });

    const result = await db.execute({
      sql: `INSERT INTO offers
              (from_type, from_id, from_name, to_type, to_id, to_name,
               description, location, dates, brief,
               budget_min, budget_max, negotiable, package, status, notes)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        from_type, from_id ?? null, from_name,
        to_type, to_id ?? null, to_name ?? null,
        description ?? null, location ?? null, dates ?? null, brief ?? null,
        budget_min ?? null, budget_max ?? null,
        negotiable ? 1 : 0,
        pkg ?? null,
        status || "new",
        notes ?? null,
      ],
    });

    res.status(201).json({ id: Number(result.lastInsertRowid) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /offers/:id — обновить оффер
router.patch("/:id", async (req, res) => {
  try {
    const fields = [
      "from_type","from_id","from_name",
      "to_type","to_id","to_name",
      "description","location","dates","brief",
      "budget_min","budget_max","negotiable","package","status","notes",
    ];
    const updates = [];
    const args = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        args.push(f === "negotiable" ? (req.body[f] ? 1 : 0) : req.body[f]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: "Nothing to update" });
    args.push(req.params.id);
    await db.execute({
      sql: `UPDATE offers SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /offers/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM offers WHERE id = ?", args: [req.params.id] });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
