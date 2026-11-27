const { auth, db } = require("../firebase/firebaseAdmin");
const {
  createAuthenticationMiddleware,
} = require("../services/authenticationService");
const { createRoleGuard } = require("../services/roleAuthorization");

const { verifyFirebaseToken, verifyToken } = createAuthenticationMiddleware({
  auth,
  db,
});

const requireAdmin = createRoleGuard({
  role: "admin",
  message: "Acceso solo para administradores",
});

const requireApprovedPsychologist = createRoleGuard({
  role: "psychologist",
  verificationStatus: "approved",
  message: "Acceso solo para psicólogos aprobados",
});

module.exports = {
  verifyFirebaseToken,
  verifyToken,
  requireAdmin,
  requireApprovedPsychologist,
};
