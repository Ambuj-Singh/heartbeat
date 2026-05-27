function authorizeRoles(...allowedRoles) {
  const roleSet = new Set(allowedRoles);

  return (req, res, next) => {
    const currentRole = req.user?.role;

    if (!currentRole || !roleSet.has(currentRole)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this resource."
      });
    }

    return next();
  };
}

module.exports = {
  authorizeRoles
};
