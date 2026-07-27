const core = require("../vendor/core");
const { createPgDb } = require("./db");

const db = createPgDb();

async function fetchAll(userId) {
  return core.fetchAll(db, { userId });
}

async function reconcileNovel(novel, characters, relations) {
  return core.reconcileNovel(db, novel, characters, relations);
}

async function deleteNovelRemote(id) {
  return core.deleteNovel(db, id);
}

module.exports = {
  fetchAll,
  reconcileNovel,
  deleteNovelRemote,
  uid: core.uid,
};
