const { Router } = require("express");
const { db } = require("../db");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "podium-rare-secret-2026";
const APP_URL = process.env.APP_URL || "https://podium-rare.vercel.app";

// POST /auth/request — запросить magic link
// body: { email }
router.post("/request", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email required" });

  const emailLower = email.toLowerCase().trim();

  // Найти пользователя (creator или brand)
  let user = null;
  let role = null;

  const creatorRows = await db.execute({
    sql: "SELECT id, name, email FROM creators WHERE LOWER(email) = ?",
    args: [emailLower],
  });
  if (creatorRows.rows.length) {
    user = creatorRows.rows[0];
    role = "creator";
  }

  if (!user) {
    const brandRows = await db.execute({
      sql: "SELECT id, name, email FROM brands WHERE LOWER(email) = ?",
      args: [emailLower],
    });
    if (brandRows.rows.length) {
      user = brandRows.rows[0];
      role = "brand";
    }
  }

  if (!user) {
    // Не раскрываем что email не найден — security best practice
    return res.json({ ok: true, message: "If this email is registered, you'll receive a link." });
  }

  // Создать токен
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 мин

  await db.execute({
    sql: `INSERT INTO magic_tokens (token, user_id, role, expires_at) VALUES (?,?,?,?)`,
    args: [token, user.id, role, expiresAt],
  });

  const link = `${APP_URL}/#dashboard?token=${token}`;

  // Отправить email если есть Resend API key
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Podium Rare <noreply@podiumrare.com>",
          to: emailLower,
          subject: "Your Podium Rare login link",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
              <h2 style="font-size: 24px; margin-bottom: 8px;">PODIUM RARE</h2>
              <p>Hi ${user.name},</p>
              <p>Click the link below to sign in. Valid for 30 minutes.</p>
              <a href="${link}" style="display:inline-block;background:#0a0a0a;color:#fff;padding:14px 28px;text-decoration:none;font-weight:bold;margin:16px 0;">OPEN MY DASHBOARD →</a>
              <p style="color:#888;font-size:13px;">If you didn't request this, ignore this email.</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error("Email send failed:", e.message);
    }
  } else {
    // Dev mode: вернуть ссылку прямо в ответе
    console.log(`[DEV] Magic link for ${emailLower}: ${link}`);
  }

  res.json({
    ok: true,
    message: "If this email is registered, you'll receive a link.",
    // Dev only — убрать в проде с RESEND_API_KEY
    ...(process.env.RESEND_API_KEY ? {} : { dev_link: link, dev_token: token }),
  });
});

// GET /auth/verify?token=X — верифицировать и выдать JWT
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "token required" });

  const { rows } = await db.execute({
    sql: "SELECT * FROM magic_tokens WHERE token = ? AND used = 0",
    args: [token],
  });

  if (!rows.length) return res.status(401).json({ error: "Invalid or expired token" });

  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) {
    return res.status(401).json({ error: "Token expired" });
  }

  // Пометить как использованный
  await db.execute({
    sql: "UPDATE magic_tokens SET used = 1 WHERE token = ?",
    args: [token],
  });

  // Выдать JWT
  const jwtToken = jwt.sign(
    { user_id: row.user_id, role: row.role },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  // Получить данные пользователя
  const table = row.role === "creator" ? "creators" : "brands";
  const { rows: userRows } = await db.execute({
    sql: `SELECT * FROM ${table} WHERE id = ?`,
    args: [row.user_id],
  });

  const user = userRows[0] || {};
  if (row.role === "creator" && user.cities) {
    try { user.cities = JSON.parse(user.cities); } catch (_) {}
  }

  // Портфолио для креатора
  if (row.role === "creator") {
    const { rows: works } = await db.execute({
      sql: "SELECT * FROM works WHERE creator_id = ? ORDER BY created_at DESC",
      args: [row.user_id],
    });
    user.works = works;
  }

  res.json({ ok: true, token: jwtToken, role: row.role, user });
});

// GET /auth/me — получить текущего пользователя по JWT
router.get("/me", requireAuth, async (req, res) => {
  const { user_id, role } = req.auth;
  const table = role === "creator" ? "creators" : "brands";

  const { rows } = await db.execute({
    sql: `SELECT * FROM ${table} WHERE id = ?`,
    args: [user_id],
  });
  if (!rows.length) return res.status(404).json({ error: "User not found" });

  const user = { ...rows[0] };
  if (role === "creator" && user.cities) {
    try { user.cities = JSON.parse(user.cities); } catch (_) {}
  }

  if (role === "creator") {
    const { rows: works } = await db.execute({
      sql: "SELECT * FROM works WHERE creator_id = ? ORDER BY created_at DESC",
      args: [user_id],
    });
    user.works = works;
  }

  res.json({ role, user });
});

// Middleware для проверки JWT
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.auth = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch (_) {
    res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = router;
module.exports.requireAuth = requireAuth;
