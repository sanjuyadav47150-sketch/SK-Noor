const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { getSettings } = require("./settings");
const { Ticket } = require("../database/models");

async function createTicket(guild, user) {
  const s = await getSettings(guild.id);
  const number = (s.ticketCounter || 0) + 1;
  s.ticketCounter = number; await s.save();
  const name = `ticket-${String(number).padStart(4, "0")}`;
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
  ];
  if (s.ticketSupportRoleId) overwrites.push({ id: s.ticketSupportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  const ch = await guild.channels.create({ name, type: ChannelType.GuildText, parent: s.ticketCategoryId || null, permissionOverwrites: overwrites });
  await Ticket.create({ guildId: guild.id, channelId: ch.id, number, creatorId: user.id });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("ticket_close").setLabel("Close").setStyle(ButtonStyle.Danger)
  );
  await ch.send({ content: `<@${user.id}>`, embeds: [new EmbedBuilder().setTitle(`Ticket #${number}`).setDescription("Support will be with you soon.")], components: [row] });
  return ch;
}
async function transcript(channel) {
  const msgs = await channel.messages.fetch({ limit: 100 });
  return [...msgs.values()].reverse().map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`).join("\n");
}
module.exports = { createTicket, transcript };
