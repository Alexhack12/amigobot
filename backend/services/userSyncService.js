const buildExistingUserSync = ({ existing, name, tokenEmail, timestamp }) => {
  const update = {
    name,
    email: tokenEmail || existing.email || null,
    updatedAt: timestamp,
  };

  return {
    update,
    response: {
      name,
      email: update.email,
      role: existing.role,
      verificationStatus: existing.verificationStatus,
      blocked: existing.blocked === true,
    },
  };
};

const buildNewUserProfile = ({
  uid,
  tokenEmail,
  name,
  requestedRole,
  cedula,
  timestamp,
}) => ({
  uid,
  email: tokenEmail,
  name,
  role: requestedRole,
  cedula,
  verificationStatus: requestedRole === "psychologist" ? "pending" : "approved",
  blocked: false,
  createdAt: timestamp,
  updatedAt: timestamp,
});

module.exports = { buildExistingUserSync, buildNewUserProfile };
