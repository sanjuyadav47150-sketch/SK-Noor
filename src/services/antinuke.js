const { AuditLogEvent, PermissionsBitField } = require("discord.js");
const { getSettings } = require("./settings");
const { sendLog } = require("./logging");
const { detectBotRisk } = require("./botDetection");

const actions = new Map();
function record(guildId, executorId, action, windowMs) {
  const key = `${guildId}:${executorId}:${action}`;
  const now = Date.now();
  const arr = (actions.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now); actions.set(key, arr); return arr.length;
}
async function executor(guild, type) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < 10000);
    return entry?.executor || null;
  } catch { return null; }
}
async function punish(guild, user, settings, reason) {
  if (!user || settings.whitelist.includes(user.id) || user.id === guild.ownerId) return;
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  try {
    if (settings.antinuke.punishment === "strip") {
      const removable = member.roles.cache.filter(r => r.editable && r.id !== guild.id);
      await member.roles.remove(removable, reason);
    } else if (settings.antinuke.punishment === "kick") await member.kick(reason);
    else if (settings.antinuke.punishment === "ban") await member.ban({ reason });
  } catch {}
  await sendLog(guild, "SECURITY", "Anti-Nuke action", `Executor: <@${user.id}>\\nReason: ${reason}`, true);
}
async function check(guild, action, auditType) {
  const s = await getSettings(guild.id);
  if (!s.antinuke.enabled) return;
  const ex = await executor(guild, auditType);
  if (!ex) return;
  const n = record(guild.id, ex.id, action, s.antinuke.windowMs);
  const threshold = s.antinuke.thresholds[action] || 3;
  await sendLog(guild, "SECURITY", "Security event", `${action}: ${n}/${threshold}\\nExecutor: <@${ex.id}>`, true);
  if (n >= threshold) await punish(guild, ex, s, `Anti-Nuke threshold reached: ${action}`);
}
async function botAdded(member) {
  if (!member.user.bot) return;
  const ex = await executor(member.guild, AuditLogEvent.BotAdd);
  const risk = await detectBotRisk(member, ex);
  await sendLog(member.guild, "SECURITY", "Bot added", `Bot: <@${member.id}>\\nAdded by: ${ex ? `<@${ex.id}>` : "Unknown"}\\nRisk: ${risk.level} (${risk.score})`, true);
  const s = await getSettings(member.guild.id);
  if (risk.level === "HIGH" && ex) await punish(member.guild, ex, s, `High-risk bot added (${risk.score})`);
}
async function permissionEscalation(guild) {
  return check(guild, "permission", AuditLogEvent.RoleUpdate);
}
async function emergencyLockdown(guild) {
  const s = await getSettings(guild.id);
  for (const ch of guild.channels.cache.values()) {
    if (!ch.isTextBased() || !ch.permissionOverwrites?.edit) continue;
    try { await ch.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: "Anti-Nuke emergency lockdown" }); } catch {}
  }
  await sendLog(guild, "SECURITY", "Emergency lockdown", "Text channels were locked for @everyone.", true);
}
module.exports = {
  check,
  botAdded,
  permissionEscalation,
  emergencyLockdown
};
