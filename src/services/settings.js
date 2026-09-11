const { Guild } = require("../database/models");
async function getSettings(guildId) {
  return Guild.findOneAndUpdate({ guildId }, { $setOnInsert: { guildId, prefix: process.env.PREFIX || "+" } }, { upsert: true, new: true });
}
module.exports = { getSettings };
