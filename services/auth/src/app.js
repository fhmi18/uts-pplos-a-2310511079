const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const db = require("./config/database");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES },
  );
};

// Generate Refresh Token (long-lived)
const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES,
  });
};

// Save Refresh Token to Database
const saveRefreshToken = async (userId, refreshToken) => {
  try {
    const connection = await db.getConnection();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await connection.query(
      "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [userId, refreshToken, expiresAt],
    );
    connection.release();
    return true;
  } catch (error) {
    console.error("Error saving refresh token:", error.message);
    return false;
  }
};

// Health Check
app.get("/api/auth/health", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query("SELECT 1");
    connection.release();

    res.status(200).json({
      status: "success",
      message: "Auth Service is running",
      database: "Connected to db_auth",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// Login - Generate Access & Refresh Token
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "Email is required",
    });
  }

  try {
    const connection = await db.getConnection();
    const [users] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );

    if (users.length === 0) {
      connection.release();
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    await saveRefreshToken(user.id, refreshToken);

    connection.release();

    res.status(200).json({
      status: "success",
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Login failed",
      error: error.message,
    });
  }
});

// Refresh Token - Generate New Access Token
app.post("/api/auth/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      status: "error",
      message: "Refresh token is required",
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const connection = await db.getConnection();

    // Check if token exists in database
    const [tokens] = await connection.query(
      "SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW()",
      [decoded.id, refreshToken],
    );

    if (tokens.length === 0) {
      connection.release();
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }

    // Get user data
    const [users] = await connection.query("SELECT * FROM users WHERE id = ?", [
      decoded.id,
    ]);

    if (users.length === 0) {
      connection.release();
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const user = users[0];
    const newAccessToken = generateAccessToken(user);

    connection.release();

    res.status(200).json({
      status: "success",
      message: "Access token refreshed",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error.message);
    res.status(401).json({
      status: "error",
      message: "Invalid refresh token",
      error: error.message,
    });
  }
});

// Verify Access Token
app.post("/api/auth/verify", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1] || req.body.token;

  if (!token) {
    return res.status(400).json({
      status: "error",
      message: "Token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    res.json({
      status: "success",
      message: "Token is valid",
      user: decoded,
    });
  } catch (error) {
    res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }
});

// GitHub OAuth Login - Redirect ke GitHub
app.get("/api/auth/github/login", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_CALLBACK_URL;
  const scope = "user:email";
  const state = Buffer.from(Math.random().toString())
    .toString("base64")
    .substring(0, 32);

  if (!clientId || !redirectUri) {
    return res.status(400).json({
      status: "error",
      message: "GitHub OAuth not configured",
    });
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  res.redirect(githubAuthUrl);
});

// GitHub OAuth Callback
app.get("/api/auth/callback/github", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({
      status: "error",
      message: "Missing authorization code",
    });
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    const githubAccessToken = tokenResponse.data.access_token;

    if (!githubAccessToken) {
      return res.status(400).json({
        status: "error",
        message: "Failed to get access token from GitHub",
      });
    }

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/json",
      },
    });

    const githubUser = userResponse.data;

    const emailResponse = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: "application/json",
        },
      },
    );

    const primaryEmail =
      emailResponse.data.find((e) => e.primary)?.email || githubUser.email;

    const connection = await db.getConnection();
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ? OR oauth_id = ?",
      [primaryEmail, githubUser.id.toString()],
    );

    let userId;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await connection.query(
        "UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        ["github", githubUser.id.toString(), githubUser.avatar_url, userId],
      );
    } else {
      const [result] = await connection.query(
        "INSERT INTO users (name, email, oauth_provider, oauth_id, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [
          githubUser.name || githubUser.login,
          primaryEmail,
          "github",
          githubUser.id.toString(),
          githubUser.avatar_url,
        ],
      );
      userId = result.insertId;
    }

    connection.release();

    // Generate tokens
    const user = { id: userId, email: primaryEmail };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await saveRefreshToken(userId, refreshToken);

    res.json({
      status: "success",
      message: "GitHub authentication successful",
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: primaryEmail,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        provider: "github",
      },
    });
  } catch (error) {
    console.error("[Auth] GitHub OAuth Error:", error.message);
    res.status(500).json({
      status: "error",
      message: "GitHub authentication failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Auth Service] Running on port ${PORT}`);
  console.log(`[Auth Service] Environment: ${process.env.NODE_ENV}`);
  console.log(
    `[Auth Service] GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? "Configured" : "Not configured"}`,
  );
});
