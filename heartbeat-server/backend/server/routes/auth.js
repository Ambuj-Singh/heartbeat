const express = require("express");
const { validate } = require("../middleware/validate");
const {
  authenticateUser,
  clearAuthCookies,
  getUserFromAccessToken,
  refreshSession,
  revokeSession,
  setAuthCookies
} = require("../services/authService");
const { createAuditLog } = require("../services/auditLogService");
const { loginBodySchema } = require("../validation/schemas");
const config = require("../config/env");

const router = express.Router();

router.post("/login", validate(loginBodySchema), async (req, res, next) => {
  try {
    const result = await authenticateUser(req.body?.username, req.body?.password);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    await createAuditLog({
      actor: result.user.username,
      actorRole: result.user.role,
      action: "LOGIN",
      resourceType: "SESSION",
      metadata: { username: result.user.username }
    });
    res.json({ user: result.user });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[config.refreshTokenCookieName];
    const result = await refreshSession(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.json({ user: result.user });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[config.accessTokenCookieName];
    const refreshToken = req.cookies?.[config.refreshTokenCookieName];
    const user = accessToken ? await getUserFromAccessToken(accessToken).catch(() => null) : null;

    if (user?.id) {
      await revokeSession(user.id);
      await createAuditLog({
        actor: user.username,
        actorRole: user.role,
        action: "LOGOUT",
        resourceType: "SESSION",
        metadata: { username: user.username }
      });
    } else if (refreshToken) {
      await refreshSession(refreshToken)
        .then((result) => revokeSession(result.user.id))
        .catch(() => null);
    }

    clearAuthCookies(res);
    res.status(204).send();
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const accessToken = req.cookies?.[config.accessTokenCookieName];
    if (!accessToken) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing authentication token."
      });
    }

    const user = await getUserFromAccessToken(accessToken);
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
