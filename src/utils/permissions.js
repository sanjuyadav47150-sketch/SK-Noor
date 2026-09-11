function isOwner(userId) {
  return (process.env.OWNER_IDS || "").split(",").map(x => x.trim()).includes(userId);
}
module.exports = { isOwner };
