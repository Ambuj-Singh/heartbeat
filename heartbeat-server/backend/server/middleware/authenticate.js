const { getUserFromAccessToken } = require("../services/authService");
const config = require("../config/env");

function extractBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== "string") {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function extractAccessToken(req) {
  const cookieToken = req.cookies?.[config.accessTokenCookieName];
  if (cookieToken) {
    return cookieToken;
  }

  return extractBearerToken(req.headers.authorization);
}

async function authenticateRequest(req, res, next) {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing authentication token."
      });
    }

    const user = await getUserFromAccessToken(token);
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: error.message || "Invalid token."
    });
  }
}

module.exports = {
  authenticateRequest,
  extractAccessToken,
  extractBearerToken
};
