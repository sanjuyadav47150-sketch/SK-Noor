const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("./settings");

async function sendLog(guild, type, title, description, security = false) {
  try {
    const s = await getSettings(guild.id);
    const id = security ? s.securityLogChannelId : s.logChannelId;
    if (!id) return;
    const ch = guild.channels.cache.get(id);
    if (!ch || !ch.isTextBased()) return;
    await ch.send({ embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setTimestamp().setFooter({ text: type })] });
  } catch {}
}
module.exports = { sendLog };
