require("dotenv").config();
const {
  Client, GatewayIntentBits, Partials, AuditLogEvent, PermissionsBitField
} = require("discord.js");
const { connectDB } = require("./database/db");
const { commands, executeCommand } = require("./commands/commands");
const { getSettings } = require("./services/settings");
const { handleTrigger } = require("./services/triggers");
const { check, botAdded, permissionEscalation } = require("./services/antinuke");
const { sendLog } = require("./services/logging");
const { createTicket } = require("./services/tickets");
const profile = require("./config/botProfile");
const { error } = require("./utils/embeds");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks
  ],
  partials: [Partials.Channel, Partials.Message]
});

function commandParts(content) {
  const m = content.trim().match(/^(\S+)(?:\s+([\s\S]*))?$/);
  return [m?.[1] || "", m?.[2] || ""];
}
function splitArgs(s) {
  return [...s.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(x => x[1] ?? x[2] ?? x[3]);
}
function setProfile(guild) {
  if (guild.members.me) guild.members.me.setNickname(profile.nickname).catch(()=>{});
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setPresence({
    status: profile.status,
    activities: profile.activity?.text ? [{ name: profile.activity.text, type: profile.activity.type === "Playing" ? 0 : profile.activity.type === "Streaming" ? 1 : profile.activity.type === "Listening" ? 2 : profile.activity.type === "Watching" ? 3 : 5 }] : []
  });
  for (const g of client.guilds.cache.values()) setProfile(g);
});

client.on("guildCreate", g => setProfile(g));

client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const c = commands.find(x => x.name === interaction.commandName);
      if (!c) return;
      await executeCommand(client, interaction, interaction.commandName);
    } else if (interaction.isButton()) {
      if (interaction.customId === "ticket_create") {
        const ch = await createTicket(interaction.guild, interaction.user);
        return interaction.reply({ embeds: [{ title: "Ticket created", description: `Your ticket is ${ch}.` }], ephemeral: true });
      }
      if (interaction.customId === "ticket_claim") {
        const { Ticket } = require("./database/models");
        await Ticket.findOneAndUpdate({channelId:interaction.channel.id},{claimedBy:interaction.user.id});
        return interaction.reply({ content: `Claimed by ${interaction.user}.`, ephemeral: false });
      }
      if (interaction.customId === "ticket_close") {
        await Ticket.findOneAndUpdate({channelId:interaction.channel.id},{status:"closed"});
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone,{ViewChannel:false});
        return interaction.reply({ embeds: [{ title: "Ticket closed", description: "This ticket is now closed." }] });
      }
    }
  } catch (e) {
    console.error(e);
    if (interaction.isRepliable()) {
      const p = { embeds: [error("Error", e.message || "Something went wrong.")], ephemeral: true };
      interaction.replied || interaction.deferred ? interaction.followUp(p).catch(()=>{}) : interaction.reply(p).catch(()=>{});
    }
  }
});

client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  try {
    const s = await getSettings(message.guild.id);
    const prefix = s.prefix || process.env.PREFIX || "+";
    if (message.content.startsWith(prefix)) {
      const [raw, rest] = commandParts(message.content.slice(prefix.length));
      const args = splitArgs(rest);
      const aliases = { p:"ping", warn:"warn", warnings:"warnings", unban:"unban", untimeout:"untimeout", sm:"slowmode" };
      const name = aliases[raw.toLowerCase()] || raw.toLowerCase();
      const known = commands.some(c => c.name === name);
      if (!known) return;
      if (name === "say") {
        await executeCommand(client, { guild: message.guild, member: message.member, channel: message.channel, user: message.author, reply: p => message.reply(p) }, name, args);
        await message.delete().catch(()=>{});
        return;
      }
      await executeCommand(client, { guild: message.guild, member: message.member, channel: message.channel, user: message.author, reply: p => message.reply(p) }, name, args);
      return;
    }
    await handleTrigger(message);
  } catch (e) {
    console.error(e);
    message.reply({ embeds: [error("Error", e.message || "Something went wrong.")] }).catch(()=>{});
  }
});

client.on("channelDelete", c => check(c.guild, "channelDelete", AuditLogEvent.ChannelDelete));
client.on("channelCreate", c => check(c.guild, "channelCreate", AuditLogEvent.ChannelCreate));
client.on("roleDelete", r => check(r.guild, "roleDelete", AuditLogEvent.RoleDelete));
client.on("roleCreate", r => check(r.guild, "roleCreate", AuditLogEvent.RoleCreate));
client.on("guildMemberRemove", m => check(m.guild, "kick", AuditLogEvent.MemberKick));
client.on("webhooksUpdate", c => check(c.guild, "webhook", AuditLogEvent.WebhookCreate));
client.on("guildMemberAdd", m => botAdded(m));
client.on("roleUpdate", r => permissionEscalation(r.guild));

client.on("guildMemberAdd", async m => {
  await sendLog(m.guild, "MEMBER", "Member joined", `<@${m.id}> joined.`);
});
client.on("guildMemberRemove", async m => {
  await sendLog(m.guild, "MEMBER", "Member left", `<@${m.id}> left.`);
});

connectDB(process.env.MONGODB_URI).then(() => client.login(process.env.DISCORD_TOKEN)).catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});
