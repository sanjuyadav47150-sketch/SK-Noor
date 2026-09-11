const { Trigger } = require("../database/models");
const cooldowns = new Map();

async function handleTrigger(message) {
  if (!message.guild || message.author.bot) return false;
  const list = await Trigger.find({ guildId: message.guild.id, enabled: true });
  for (const t of list) {
    if (t.channelIds.length && !t.channelIds.includes(message.channel.id)) continue;
    if (!message.content.toLowerCase().includes(t.trigger.toLowerCase())) continue;
    const key = `${message.guild.id}:${t._id}`;
    const now = Date.now();
    if (cooldowns.has(key) && cooldowns.get(key) > now) continue;
    cooldowns.set(key, now + t.cooldownMs);
    const payload = t.embed
      ? { embeds: [{ title: "Trigger", description: t.response }] }
      : { content: t.response };
    await message.channel.send(payload);
    if (t.reaction) { try { await message.react(t.reaction); } catch {} }
    if (t.deleteMessage) { try { await message.delete(); } catch {} }
    return true;
  }
  return false;
}
module.exports = { handleTrigger };
