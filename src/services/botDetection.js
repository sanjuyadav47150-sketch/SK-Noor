async function detectBotRisk(member, addedBy) {
  let score = 0;
  const bot = member.user;
  const ageDays = (Date.now() - bot.createdTimestamp) / 86400000;
  if (ageDays < 7) score += 25;
  if (member.permissions.has("Administrator")) score += 45;
  else if (member.permissions.has("ManageGuild") || member.permissions.has("ManageChannels") || member.permissions.has("ManageRoles")) score += 20;
  if (addedBy && addedBy.id === bot.id) score += 20;
  return { score, level: score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW" };
}
module.exports = { detectBotRisk };
