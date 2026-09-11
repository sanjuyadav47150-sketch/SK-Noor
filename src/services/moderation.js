const { Warning } = require("../database/models");
async function addWarning(guildId, userId, moderatorId, reason) {
  return Warning.create({ guildId, userId, moderatorId, reason });
}
async function getWarnings(guildId, userId) {
  return Warning.find({ guildId, userId }).sort({ createdAt: -1 });
}
async function clearWarnings(guildId, userId) {
  return Warning.deleteMany({ guildId, userId });
}
module.exports = { addWarning, getWarnings, clearWarnings };
