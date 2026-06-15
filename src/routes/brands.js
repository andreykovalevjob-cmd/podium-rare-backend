const { Router } = require("express");
const { db } = require("../db");
const { upload } = require("../cloudinary");

const router = Router();

// POST /brands — создать бренд
router.post("/", upload.single("logo"), async (req, res) => {
  try {
    const { name, bio, website, instagram, email, phone, city } = req.body;
    if (!name) return res.status(400).json({ error: "name — обязателен" });

    const logo_url = req.file?.path ?? null;

    const result = await db.execute({
      sql: `INSERT INTO brands (name, bio, website, instagram, email, phone, city, logo_url)
            VALUES (?,?,?,?,?,?,?,?)`,
      args: [name, bio ?? null, website ?? null, instagram ?? null, email ?? null, phone ?? null, city ?? null, logo_url],
    });

    res.status(201).json({ id: Number(result.lastInsertRowid), name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /brands — список
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.execute(
      "SELECT * FROM brands ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /brands/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: "SELECT * FROM brands WHERE id = ?",
      args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: "Не найден" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /brands/:id — обновить профиль
router.patch("/:id", upload.single("logo"), async (req, res) => {
  try {
    const { name, bio, website, instagram, email, phone, city } = req.body;
    const fields = [];
    const args = [];

    if (name)        { fields.push("name = ?");      args.push(name); }
    if (bio != null) { fields.push("bio = ?");        args.push(bio); }
    if (website)     { fields.push("website = ?");    args.push(website); }
    if (instagram)   { fields.push("instagram = ?");  args.push(instagram); }
    if (email)       { fields.push("email = ?");      args.push(email); }
    if (phone)       { fields.push("phone = ?");      args.push(phone); }
    if (city)        { fields.push("city = ?");       args.push(city); }
    if (req.file?.path) { fields.push("logo_url = ?"); args.push(req.file.path); }

    if (!fields.length) return res.status(400).json({ error: "Нечего обновлять" });

    args.push(req.params.id);
    await db.execute({ sql: `UPDATE brands SET ${fields.join(", ")} WHERE id = ?`, args });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /brands/:id
router.delete("/:id", async (req, res) => {
  try {
    await db.execute({
      sql: "DELETE FROM brands WHERE id = ?",
      args: [req.params.id],
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
