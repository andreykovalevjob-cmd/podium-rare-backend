const { Router } = require("express");
const { db } = require("../db");
const { upload, cloudinary } = require("../cloudinary");

const router = Router();

// POST /works — загрузить работу (фото или видео)
// multipart: file=<файл>, creator_id=<id>, type=photo|video, caption=<текст>
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { creator_id, caption } = req.body;
    if (!creator_id) return res.status(400).json({ error: "creator_id — обязателен" });
    if (!req.file) return res.status(400).json({ error: "file — обязателен" });

    const url = req.file.path;
    const public_id = req.file.filename;
    const type = req.file.mimetype?.startsWith("video") ? "video" : "photo";

    const result = await db.execute({
      sql: `INSERT INTO works (creator_id, url, public_id, type, caption)
            VALUES (?,?,?,?,?)`,
      args: [creator_id, url, public_id, type, caption ?? null],
    });

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      url,
      type,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /works?creator_id=1 — все работы креатора
router.get("/", async (req, res) => {
  try {
    const { creator_id } = req.query;
    if (!creator_id)
      return res.status(400).json({ error: "creator_id — обязателен" });

    const { rows } = await db.execute({
      sql: "SELECT * FROM works WHERE creator_id = ? ORDER BY created_at DESC",
      args: [creator_id],
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /works/:id — удалить работу + из Cloudinary
router.delete("/:id", async (req, res) => {
  try {
    const { rows } = await db.execute({
      sql: "SELECT * FROM works WHERE id = ?",
      args: [req.params.id],
    });
    if (!rows.length) return res.status(404).json({ error: "Не найдена" });

    const work = rows[0];
    if (work.public_id) {
      await cloudinary.uploader.destroy(work.public_id, {
        resource_type: work.type === "video" ? "video" : "image",
      });
    }

    await db.execute({
      sql: "DELETE FROM works WHERE id = ?",
      args: [req.params.id],
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
