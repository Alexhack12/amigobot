const { auth, db } = require("../firebase/firebaseAdmin");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token no proporcionado",
      });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(token);

    const userDoc = await db.collection("users").doc(decodedToken.uid).get();

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data(),
    };

    next();
  } catch (error) {
    console.error("Error verificando token:", error);
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Acceso solo para administradores",
    });
  }

  next();
};

const requireApprovedPsychologist = (req, res, next) => {
  if (
    req.user?.role !== "psychologist" ||
    req.user?.verificationStatus !== "approved"
  ) {
    return res.status(403).json({
      message: "Acceso solo para psicólogos aprobados",
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireApprovedPsychologist,
};