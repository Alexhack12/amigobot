const getBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== "string") return null;

  const match = authorizationHeader.match(/^Bearer ([^\s]+)$/);
  return match ? match[1] : null;
};

const createAuthenticationMiddleware = ({ auth, db, logger = console }) => {
  const verifyFirebaseToken = async (req, res, next) => {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    try {
      const decodedToken = await auth.verifyIdToken(token, true);

      req.authUser = {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
      };

      return next();
    } catch (error) {
      logger.warn?.("Token de Firebase rechazado", {
        code: error?.code || "unknown",
      });

      return res.status(401).json({ message: "Token inválido o expirado" });
    }
  };

  const verifyToken = async (req, res, next) => {
    return verifyFirebaseToken(req, res, async () => {
      try {
        const userDoc = await db
          .collection("users")
          .doc(req.authUser.uid)
          .get();

        if (!userDoc.exists) {
          return res.status(403).json({
            message: "La cuenta no tiene un perfil de acceso válido.",
          });
        }

        const userData = userDoc.data() || {};

        if (userData.blocked === true) {
          return res.status(403).json({
            message:
              "Tu acceso ha sido bloqueado. Contacta a tu psicólogo o al administrador.",
          });
        }

        req.user = {
          ...userData,
          uid: req.authUser.uid,
          email: req.authUser.email || userData.email || null,
        };

        return next();
      } catch (error) {
        logger.error?.("No se pudo comprobar el perfil autenticado", {
          code: error?.code || "unknown",
        });

        return res.status(503).json({
          message: "No se pudo validar el acceso en este momento.",
        });
      }
    });
  };

  return { verifyFirebaseToken, verifyToken };
};

module.exports = {
  createAuthenticationMiddleware,
  getBearerToken,
};
