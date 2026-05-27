const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const User = require("../models/User");

const ROLES = {
  ADMIN: "ADMIN",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER"
};

function normalizeRole(role = ROLES.VIEWER) {
  const safeRole = String(role || ROLES.VIEWER).toUpperCase();
  return Object.values(ROLES).includes(safeRole) ? safeRole : ROLES.VIEWER;
}

function normalizeUsername(username = "") {
  return String(username || "").trim().toLowerCase();
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    username: user.username,
    role: user.role
  };
}

function parseExpiresInToMs(value, fallbackMs) {
  if (!value) {
    return fallbackMs;
  }

  const safeValue = String(value).trim();
  const match = safeValue.match(/^(\d+)([smhd])$/i);

  if (!match) {
    const numeric = Number(safeValue);
    return Number.isFinite(numeric) ? numeric * 1000 : fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
  };

  return amount * unitMap[unit];
}

async function hashPassword(password) {
  return bcrypt.hash(String(password || ""), 10);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(String(password || ""), String(passwordHash || ""));
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      role: user.role,
      type: "access"
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn
    }
  );
}

function signRefreshToken(user, family) {
  return jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      role: user.role,
      type: "refresh",
      family
    },
    config.refreshTokenSecret,
    {
      expiresIn: config.refreshTokenExpiresIn
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.refreshTokenSecret);
}

function buildCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/",
    maxAge
  };
}

function getAccessCookieOptions() {
  return buildCookieOptions(parseExpiresInToMs(config.jwtExpiresIn, 12 * 60 * 60 * 1000));
}

function getRefreshCookieOptions() {
  return buildCookieOptions(
    parseExpiresInToMs(config.refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000)
  );
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(config.accessTokenCookieName, accessToken, getAccessCookieOptions());
  res.cookie(config.refreshTokenCookieName, refreshToken, getRefreshCookieOptions());
}

function clearAuthCookies(res) {
  const clearOptions = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/"
  };

  res.clearCookie(config.accessTokenCookieName, clearOptions);
  res.clearCookie(config.refreshTokenCookieName, clearOptions);
}

async function issueSession(userDocument) {
  const family = crypto.randomUUID();
  const accessToken = signAccessToken(userDocument);
  const refreshToken = signRefreshToken(userDocument, family);

  userDocument.refreshTokenHash = sha256(refreshToken);
  userDocument.refreshTokenExpiresAt = new Date(
    Date.now() + parseExpiresInToMs(config.refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000)
  );
  userDocument.refreshTokenFamily = family;
  await userDocument.save();

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(userDocument)
  };
}

async function authenticateUser(username, password) {
  const safeUsername = normalizeUsername(username);

  if (!safeUsername || !password) {
    const error = new Error("Username and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ username: safeUsername });

  if (!user) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    const error = new Error("Invalid credentials.");
    error.statusCode = 401;
    throw error;
  }

  return issueSession(user);
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    const error = new Error("Missing refresh token.");
    error.statusCode = 401;
    throw error;
  }

  const payload = verifyRefreshToken(refreshToken);
  if (payload.type !== "refresh") {
    const error = new Error("Invalid refresh token.");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    const error = new Error("User no longer exists.");
    error.statusCode = 401;
    throw error;
  }

  const hashedToken = sha256(refreshToken);
  const tokenExpired =
    !user.refreshTokenExpiresAt || new Date(user.refreshTokenExpiresAt).getTime() < Date.now();

  if (
    !user.refreshTokenHash ||
    user.refreshTokenHash !== hashedToken ||
    tokenExpired ||
    user.refreshTokenFamily !== payload.family
  ) {
    user.refreshTokenHash = null;
    user.refreshTokenExpiresAt = null;
    user.refreshTokenFamily = null;
    await user.save();

    const error = new Error("Refresh token rejected.");
    error.statusCode = 401;
    throw error;
  }

  return issueSession(user);
}

async function revokeSession(userId) {
  if (!userId) {
    return;
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      refreshTokenFamily: null
    }
  });
}

async function getUserFromAccessToken(token) {
  const payload = verifyAccessToken(token);
  if (payload.type !== "access") {
    const error = new Error("Invalid access token.");
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(payload.sub).lean();

  if (!user) {
    const error = new Error("User no longer exists.");
    error.statusCode = 401;
    throw error;
  }

  return sanitizeUser(user);
}

async function ensureBootstrapAdmin() {
  const username = normalizeUsername(config.bootstrapAdmin.username);
  const existing = await User.findOne({ username }).lean();

  if (existing) {
    return existing;
  }

  const passwordHash = await hashPassword(config.bootstrapAdmin.password);
  const user = await User.create({
    username,
    passwordHash,
    role: normalizeRole(config.bootstrapAdmin.role)
  });

  return sanitizeUser(user);
}

module.exports = {
  ROLES,
  authenticateUser,
  clearAuthCookies,
  ensureBootstrapAdmin,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  getUserFromAccessToken,
  issueSession,
  normalizeRole,
  refreshSession,
  revokeSession,
  sanitizeUser,
  setAuthCookies,
  verifyAccessToken,
  verifyRefreshToken
};
