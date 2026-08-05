const requirePendingPsychologist = (req, res, next) => {
  if (req.user?.role !== "psychologist") {
    return res.status(403).json({
      message: "La verificación está disponible solo para cuentas de psicólogo.",
    });
  }

  if (req.user.verificationStatus !== "pending") {
    return res.status(409).json({
      message: "Esta cuenta ya tiene un resultado de verificación.",
      verificationStatus: req.user.verificationStatus,
    });
  }

  return next();
};

const getVerificationRateLimitMax = (env = process.env) => {
  const configured = Number(env.VERIFICATION_RATE_LIMIT_MAX || 3);

  return Number.isInteger(configured) && configured > 0
    ? Math.min(configured, 10)
    : 3;
};

const verificationRateLimitHandler = (req, res) =>
  res.status(429).json({
    message: "Demasiados intentos de verificación. Intenta más tarde.",
  });

const createVerificationRateLimit = (env = process.env) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: getVerificationRateLimitMax(env),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user.uid,
    handler: verificationRateLimitHandler,
  });

module.exports = {
  requirePendingPsychologist,
  getVerificationRateLimitMax,
  verificationRateLimitHandler,
  createVerificationRateLimit,
};
const { rateLimit } = require("express-rate-limit");
