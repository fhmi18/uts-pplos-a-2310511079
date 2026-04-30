const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const db = require("./config/database");
const {
  verifyJWT,
  addToBlacklist,
  tokenBlacklist,
} = require("./middleware/jwtMiddleware");

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
    { id: user.id, email: user.email, role: user.role || 'user' },
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

// Register - Create New User with Email & Password
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Name, email, and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      status: "error",
      message: "Password must be at least 6 characters long",
    });
  }

  try {
    const connection = await db.getConnection();

    // Check if email already exists
    const [existingUsers] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      connection.release();
      return res.status(409).json({
        status: "error",
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await connection.query(
      "INSERT INTO users (name, email, password, oauth_provider, created_at) VALUES (?, ?, ?, ?, NOW())",
      [name, email, hashedPassword, "local"],
    );

    const userId = result.insertId;
    connection.release();

    // Generate tokens
    const user = { id: userId, email };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    await saveRefreshToken(userId, refreshToken);

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      accessToken,
      refreshToken,
      user: {
        id: userId,
        name,
        email,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Registration failed",
      error: error.message,
    });
  }
});

// Login - Email/Password Authentication with Validation
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Email and password are required",
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

    // Validate password if user has local password
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        connection.release();
        return res.status(401).json({
          status: "error",
          message: "Invalid email or password",
        });
      }
    } else {
      // User only has OAuth provider, cannot login with password
      connection.release();
      return res.status(403).json({
        status: "error",
        message:
          "This account uses OAuth provider login. Please use GitHub OAuth.",
      });
    }

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

// Logout - Invalidate Access Token (Blacklist)
app.post("/api/auth/logout", verifyJWT, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      // Add token to blacklist
      addToBlacklist(token);
    }

    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete refresh token from database
      const connection = await db.getConnection();
      await connection.query("DELETE FROM refresh_tokens WHERE token = ?", [
        refreshToken,
      ]);
      connection.release();
    }

    res.json({
      status: "success",
      message: "Logout successful. Token invalidated.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Logout failed",
      error: error.message,
    });
  }
});

// Get User Profile (Protected Endpoint Example)
app.get("/api/auth/profile", verifyJWT, async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [users] = await connection.query(
      "SELECT id, name, email, avatar_url, oauth_provider FROM users WHERE id = ?",
      [req.user.id],
    );
    connection.release();

    if (users.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.json({
      status: "success",
      message: "User profile retrieved",
      user: users[0],
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve profile",
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

app.get("/api/auth/google/login", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  const scope = "openid email profile";
  const state = Buffer.from(Math.random().toString())
    .toString("base64")
    .substring(0, 32);

  if (!clientId || !redirectUri) {
    return res.status(400).json({
      status: "error",
      message: "Google OAuth not configured",
    });
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.redirect(googleAuthUrl);
});

// Google OAuth Callback
app.get("/api/auth/callback/google", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({
      status: "error",
      message: "Missing authorization code",
    });
  }

  try {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      },
    );

    const googleAccessToken = tokenResponse.data.access_token;

    if (!googleAccessToken) {
      return res.status(400).json({
        status: "error",
        message: "Failed to get access token from Google",
      });
    }

    const userResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      },
    );

    const googleUser = userResponse.data;

    const connection = await db.getConnection();
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ? OR oauth_id = ?",
      [googleUser.email, googleUser.id.toString()],
    );

    let userId;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await connection.query(
        "UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        ["google", googleUser.id.toString(), googleUser.picture, userId],
      );
    } else {
      const [result] = await connection.query(
        "INSERT INTO users (name, email, oauth_provider, oauth_id, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [
          googleUser.name,
          googleUser.email,
          "google",
          googleUser.id.toString(),
          googleUser.picture,
        ],
      );
      userId = result.insertId;
    }

    connection.release();

    // Generate tokens
    const user = { id: userId, email: googleUser.email };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await saveRefreshToken(userId, refreshToken);

    res.json({
      status: "success",
      message: "Google authentication successful",
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        provider: "google",
      },
    });
  } catch (error) {
    console.error("[Auth] Google OAuth Error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Google authentication failed",
      error: error.message,
    });
  }
});

app.get("/api/auth/facebook/login", (req, res) => {
  const clientId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_CALLBACK_URL;
  const scope = "email,public_profile";
  const state = Buffer.from(Math.random().toString())
    .toString("base64")
    .substring(0, 32);

  if (!clientId || !redirectUri) {
    return res.status(400).json({
      status: "error",
      message: "Facebook OAuth not configured",
    });
  }

  const facebookAuthUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&auth_type=rerequest`;
  res.redirect(facebookAuthUrl);
});

// Facebook OAuth Callback
app.get("/api/auth/callback/facebook", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({
      status: "error",
      message: "Missing authorization code",
    });
  }

  try {
    const tokenResponse = await axios.get(
      "https://graph.facebook.com/v17.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
          code: code,
        },
      },
    );

    const facebookAccessToken = tokenResponse.data.access_token;

    if (!facebookAccessToken) {
      return res.status(400).json({
        status: "error",
        message: "Failed to get access token from Facebook",
      });
    }

    const userResponse = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email,picture",
        access_token: facebookAccessToken,
      },
    });

    const facebookUser = userResponse.data;
    const email =
      facebookUser.email || `facebook_${facebookUser.id}@kos-system.local`;

    const connection = await db.getConnection();
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ? OR oauth_id = ?",
      [email, facebookUser.id.toString()],
    );

    let userId;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      await connection.query(
        "UPDATE users SET oauth_provider = ?, oauth_id = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?",
        [
          "facebook",
          facebookUser.id.toString(),
          facebookUser.picture?.data?.url,
          userId,
        ],
      );
    } else {
      const [result] = await connection.query(
        "INSERT INTO users (name, email, oauth_provider, oauth_id, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [
          facebookUser.name,
          email,
          "facebook",
          facebookUser.id.toString(),
          facebookUser.picture?.data?.url,
        ],
      );
      userId = result.insertId;
    }

    connection.release();

    // Generate tokens
    const user = { id: userId, email: email };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await saveRefreshToken(userId, refreshToken);

    res.json({
      status: "success",
      message: "Facebook authentication successful",
      accessToken,
      refreshToken,
      user: {
        id: userId,
        email: email,
        name: facebookUser.name,
        avatar: facebookUser.picture?.data?.url,
        provider: "facebook",
      },
    });
  } catch (error) {
    console.error("[Auth] Facebook OAuth Error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Facebook authentication failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Auth Service] Running on port ${PORT}`);
  console.log(`[Auth Service] Environment: ${process.env.NODE_ENV}`);
});
