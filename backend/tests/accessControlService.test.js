const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAccessControlService,
} = require("../services/accessControlService");

const createDb = ({ allowedPsychologist, allowedPatient }) => ({
  collection: () => {
    const filters = [];
    const query = {
      where(field, operator, value) {
        filters.push([field, operator, value]);
        return query;
      },
      limit() {
        return query;
      },
      async get() {
        const values = Object.fromEntries(filters.map(([field, , value]) => [field, value]));
        return {
          empty: !(
            values.psychologistId === allowedPsychologist &&
            values.patientId === allowedPatient &&
            values.active === true
          ),
        };
      },
    };
    return query;
  },
});

test("autoriza únicamente el vínculo activo exacto", async () => {
  const access = createAccessControlService(
    createDb({ allowedPsychologist: "psy-1", allowedPatient: "patient-1" })
  );

  assert.equal(await access.verifyPatientAccess("psy-1", "patient-1"), true);
  assert.equal(await access.verifyPatientAccess("psy-2", "patient-1"), false);
  assert.equal(await access.verifyPatientAccess("psy-1", "patient-2"), false);
});

test("rechaza ids ausentes y acceso al propio id", async () => {
  const access = createAccessControlService(createDb({}));

  assert.equal(await access.verifyPatientAccess("same", "same"), false);
  assert.equal(await access.verifyPatientAccess("", "patient"), false);
  assert.equal(await access.verifyPatientAccess("psy", ""), false);
});
