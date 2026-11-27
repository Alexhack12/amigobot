const createRoleGuard = ({ role, verificationStatus = null, message }) =>
  (req, res, next) => {
    const hasRole = req.user?.role === role;
    const hasStatus =
      verificationStatus === null ||
      req.user?.verificationStatus === verificationStatus;

    if (!hasRole || !hasStatus) {
      return res.status(403).json({ message });
    }

    return next();
  };

module.exports = { createRoleGuard };
