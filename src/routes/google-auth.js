const { Router } = require("express");
const { db } = require("../db");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "podium-rare-secret-2026";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "https://podium-rare.vercel.app";
const BACKEND_URL = process.env.BACKEND_URL || "https://podium-rare-backend-production.up.railway.app";

// GET /auth/google — редирект на Google
router.get("/google", (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${BACKEND_URL}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/google/callback — обработка кода от Google
router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${APP_URL}/#login?error=google_denied`);
  }

  try {
    // Обмен кода на токены
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${BACKEND_URL}/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.id_token) throw new Error("No id_token");

    // Верифицировать id_token через Google
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleEmail = payload.email?.toLowerCase();
    const googleName = payload.name || payload.email;

    if (!googleEmail) throw new Error("No email from Google");

    // Найти пользователя по email
    let user = null;
    let role = null;

    const creatorRows = await db.execute({
      sql: "SELECT * FROM creators WHERE LOWER(email) = ?",
      args: [googleEmail],
    });
    if (creatorRows.rows.length) {
      user = creatorRows.rows[0];
      role = "creator";
      if (user.cities) {
        try { user.cities = JSON.parse(user.cities); } catch (_) {}
      }
      // Подгрузить works
      const { rows: works } = await db.execute({
        sql: "SELECT * FROM works WHERE creator_id = ? ORDER BY created_at DESC",
        args: [user.id],
      });
      user.works = works;
    }

    if (!user) {
      const brandRows = await db.execute({
        sql: "SELECT * FROM brands WHERE LOWER(email) = ?",
        args: [googleEmail],
      });
      if (brandRows.rows.length) {
        user = brandRows.rows[0];
        role = "brand";
      }
    }

    if (!user) {
      // Email не найден — редирект с ошибкой
      return res.redirect(`${APP_URL}/#login?error=not_registered&email=${encodeURIComponent(googleEmail)}`);
    }

    // Выдать JWT
    const jwtToken = jwt.sign(
      { user_id: user.id, role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Редирект на фронт с токеном в hash
    res.redirect(`${APP_URL}/#dashboard?token=${jwtToken}&role=${role}`);

  } catch (e) {
    console.error("Google OAuth error:", e.message);
    res.redirect(`${APP_URL}/#login?error=google_failed`);
  }
});

module.exports = router;
