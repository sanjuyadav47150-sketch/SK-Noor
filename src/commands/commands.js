const {
  SlashCommandBuilder, PermissionFlagsBits, ChannelType,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder
} = require("discord.js");
const { success, error, info, warn } = require("../utils/embeds");
const { getSettings } = require("../services/settings");
const { addWarning, getWarnings, clearWarnings } = require("../services/moderation");
const { Trigger, Ticket } = require("../database/models");
const { createTicket, transcript } = require("../services/tickets");
const { emergencyLockdown } = require("../services/antinuke");

const commands = [];

function add(name, desc, opts) {
  commands.push(new SlashCommandBuilder().setName(name).setDescription(desc).setDefaultMemberPermissions(opts || undefined));
}

add("ping", "Check bot latency");
add("ban", "Ban a member", PermissionFlagsBits.BanMembers);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reason"));
add("unban", "Unban a user", PermissionFlagsBits.BanMembers);
commands.at(-1).addStringOption(o => o.setName("user").setDescription("User ID").setRequired(true));
add("kick", "Kick a member", PermissionFlagsBits.KickMembers);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reason"));
add("timeout", "Timeout a member", PermissionFlagsBits.ModerateMembers);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)).addIntegerOption(o => o.setName("minutes").setDescription("Minutes").setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption(o => o.setName("reason").setDescription("Reason"));
add("untimeout", "Remove timeout", PermissionFlagsBits.ModerateMembers);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true));
add("warn", "Warn a member", PermissionFlagsBits.ModerateMembers);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(true));
add("warnings", "Show warnings", PermissionFlagsBits.ModerateMembers);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true));
add("clear", "Delete messages", PermissionFlagsBits.ManageMessages);
commands.at(-1).addIntegerOption(o => o.setName("amount").setDescription("1-100").setRequired(true).setMinValue(1).setMaxValue(100));
add("lock", "Lock this channel", PermissionFlagsBits.ManageChannels);
add("unlock", "Unlock this channel", PermissionFlagsBits.ManageChannels);
add("nick", "Change nickname", PermissionFlagsBits.ManageNicknames);
commands.at(-1).addUserOption(o => o.setName("user").setDescription("Member").setRequired(true)).addStringOption(o => o.setName("nickname").setDescription("New nickname").setMaxLength(32));
add("slowmode", "Set slowmode", PermissionFlagsBits.ManageChannels);
commands.at(-1).addIntegerOption(o => o.setName("seconds").setDescription("0-21600").setRequired(true).setMinValue(0).setMaxValue(21600));
add("say", "Make the bot send a message", PermissionFlagsBits.ManageMessages);
commands.at(-1).addStringOption(o => o.setName("message").setDescription("Message").setRequired(true));
add("config", "Configure logs");
commands.at(-1).addSubcommand(s => s.setName("logs").setDescription("Set normal log channel").addChannelOption(o => o.setName("channel").setChannelTypes(ChannelType.GuildText).setRequired(true)))
.addSubcommand(s => s.setName("securitylogs").setDescription("Set security log channel").addChannelOption(o => o.setName("channel").setChannelTypes(ChannelType.GuildText).setRequired(true)));
add("ticket", "Ticket controls");
commands.at(-1).addSubcommand(s => s.setName("setup").setDescription("Set ticket category/support role").addChannelOption(o => o.setName("category").setChannelTypes(ChannelType.GuildCategory)).addRoleOption(o => o.setName("support_role")))
.addSubcommand(s => s.setName("panel").setDescription("Send a ticket panel").addChannelOption(o => o.setName("channel").setChannelTypes(ChannelType.GuildText).setRequired(true)))
.addSubcommand(s => s.setName("add").setDescription("Add a member to this ticket").addUserOption(o => o.setName("user").setRequired(true)))
.addSubcommand(s => s.setName("remove").setDescription("Remove a member").addUserOption(o => o.setName("user").setRequired(true)))
.addSubcommand(s => s.setName("close").setDescription("Close ticket"))
.addSubcommand(s => s.setName("reopen").setDescription("Reopen ticket"))
.addSubcommand(s => s.setName("delete").setDescription("Delete ticket"))
.addSubcommand(s => s.setName("transcript").setDescription("Create a transcript"));
add("trigger", "Manage triggers");
commands.at(-1).addSubcommand(s => s.setName("add").setDescription("Add trigger").addStringOption(o => o.setName("trigger").setDescription("Keyword").setRequired(true)).addStringOption(o => o.setName("response").setDescription("Response").setRequired(true)).addBooleanOption(o => o.setName("embed").setDescription("Embed response")).addStringOption(o => o.setName("reaction").setDescription("Emoji")).addBooleanOption(o => o.setName("delete").setDescription("Delete trigger message")))
.addSubcommand(s => s.setName("remove").setDescription("Remove trigger").addStringOption(o => o.setName("trigger").setRequired(true)))
.addSubcommand(s => s.setName("list").setDescription("List triggers"))
.addSubcommand(s => s.setName("enable").setDescription("Enable trigger").addStringOption(o => o.setName("trigger").setRequired(true)))
.addSubcommand(s => s.setName("disable").setDescription("Disable trigger").addStringOption(o => o.setName("trigger").setRequired(true)));
add("antinuke", "Manage Anti-Nuke");
commands.at(-1).addSubcommand(s => s.setName("enable").setDescription("Enable"))
.addSubcommand(s => s.setName("disable").setDescription("Disable"))
.addSubcommand(s => s.setName("status").setDescription("Status"))
.addSubcommand(s => s.setName("whitelist").setDescription("Whitelist user").addUserOption(o => o.setName("user").setRequired(true)))
.addSubcommand(s => s.setName("unwhitelist").setDescription("Remove whitelist").addUserOption(o => o.setName("user").setRequired(true)))
.addSubcommand(s => s.setName("lockdown").setDescription("Emergency lockdown"));

async function executeCommand(client, ctx, name, args = []) {
  const guild = ctx.guild;
  const member = ctx.member;
  const reply = (payload) => ctx.reply ? ctx.reply(payload) : ctx.channel.send(payload);

  if (name === "ping") return reply({ embeds: [info("Pong", `Latency: ${client.ws.ping}ms`)] });
  if (!guild) return reply({ embeds: [error("Server only", "This command requires a server.")] });

  if (name === "ban") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const reason = ctx.options?.getString("reason") || args.slice(1).join(" ") || "No reason"; const m = await guild.members.fetch(u.id); await m.ban({ reason }); return reply({ embeds: [success("Banned", `${u.tag} banned.`)] }); }
  if (name === "unban") { const id = ctx.options?.getString("user") || args[0]; await guild.members.unban(id); return reply({ embeds: [success("Unbanned", `<@${id}> unbanned.`)] }); }
  if (name === "kick") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const m = await guild.members.fetch(u.id); await m.kick(ctx.options?.getString("reason") || args.slice(1).join(" ") || "No reason"); return reply({ embeds: [success("Kicked", `${u.tag} kicked.`)] }); }
  if (name === "timeout") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const m = await guild.members.fetch(u.id); const min = ctx.options?.getInteger("minutes") || Number(args[1]); await m.timeout(min * 60000, ctx.options?.getString("reason") || "No reason"); return reply({ embeds: [success("Timed out", `${u.tag} for ${min} minute(s).`)] }); }
  if (name === "untimeout") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const m = await guild.members.fetch(u.id); await m.timeout(null); return reply({ embeds: [success("Timeout removed", u.tag)] }); }
  if (name === "warn") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const reason = ctx.options?.getString("reason") || args.slice(1).join(" ") || "No reason"; await addWarning(guild.id,u.id,ctx.user.id,reason); return reply({ embeds: [success("Warned", `${u.tag}: ${reason}`)] }); }
  if (name === "warnings") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const ws = await getWarnings(guild.id,u.id); return reply({ embeds: [info("Warnings", ws.length ? ws.map((w,i)=>`${i+1}. ${w.reason} — <@${w.moderatorId}>`).join("\n") : "No warnings.")] }); }
  if (name === "clear") { const n = ctx.options?.getInteger("amount") || Number(args[0]); const msgs = await guild.channels.cache.get(ctx.channel.id).bulkDelete(n,true); return reply({ embeds: [success("Cleared", `Deleted ${msgs.size} messages.`)] }); }
  if (name === "lock" || name === "unlock") { await ctx.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: name==="lock" ? false : null }); return reply({ embeds: [success(name==="lock"?"Locked":"Unlocked", `#${ctx.channel.name} ${name==="lock"?"is now locked.":"is now unlocked."}`)] }); }
  if (name === "nick") { const u = ctx.options?.getUser("user") || guild.members.cache.get(args[0])?.user; const nick = ctx.options?.getString("nickname") ?? args.slice(1).join(" "); const m = await guild.members.fetch(u.id); await m.setNickname(nick || null); return reply({ embeds: [success("Nickname updated", `${u.tag}`)] }); }
  if (name === "slowmode") { const sec = ctx.options?.getInteger("seconds") ?? Number(args[0]); await ctx.channel.setRateLimitPerUser(sec); return reply({ embeds: [success("Slowmode", `${sec}s`)] }); }
  if (name === "say") { const msg = ctx.options?.getString("message") || args.join(" "); await ctx.channel.send(msg); if (ctx.isChatInputCommand?.()) return ctx.reply({ content: "Sent.", ephemeral: true }); return null; }

  if (name === "config") {
    const s = await getSettings(guild.id); const sub = ctx.options?.getSubcommand() || args[0]; const ch = ctx.options?.getChannel("channel");
    if (sub==="logs") { s.logChannelId=ch?.id; await s.save(); return reply({embeds:[success("Logs","Normal log channel saved.")]}); }
    if (sub==="securitylogs") { s.securityLogChannelId=ch?.id; await s.save(); return reply({embeds:[success("Security logs","Security log channel saved.")]}); }
  }

  if (name === "ticket") {
    const sub = ctx.options?.getSubcommand() || args[0]; const s=await getSettings(guild.id);
    if(sub==="setup"){ const cat=ctx.options?.getChannel("category"); const role=ctx.options?.getRole("support_role"); if(cat)s.ticketCategoryId=cat.id;if(role)s.ticketSupportRoleId=role.id;await s.save();return reply({embeds:[success("Ticket setup","Ticket settings saved.")]});}
    if(sub==="panel"){const ch=ctx.options?.getChannel("channel")||ctx.channel;const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("ticket_create").setLabel("Create Ticket").setStyle(ButtonStyle.Primary));const m=await ch.send({embeds:[new EmbedBuilder().setTitle("Support Tickets").setDescription("Click below to open a private ticket.")],components:[row]});s.ticketPanelChannelId=ch.id;s.ticketPanelMessageId=m.id;await s.save();return reply({embeds:[success("Panel created",`Sent in ${ch}.`)]});}
    if(sub==="add"){const u=ctx.options?.getUser("user");await ctx.channel.permissionOverwrites.edit(u.id,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});return reply({embeds:[success("Added",`${u.tag} added.`)]});}
    if(sub==="remove"){const u=ctx.options?.getUser("user");await ctx.channel.permissionOverwrites.delete(u.id);return reply({embeds:[success("Removed",`${u.tag} removed.`)]});}
    if(sub==="close"){await Ticket.findOneAndUpdate({channelId:ctx.channel.id},{status:"closed"});await ctx.channel.permissionOverwrites.edit(guild.roles.everyone,{ViewChannel:false});return reply({embeds:[success("Closed","Ticket closed.")]});}
    if(sub==="reopen"){await Ticket.findOneAndUpdate({channelId:ctx.channel.id},{status:"open"});await ctx.channel.permissionOverwrites.edit(guild.roles.everyone,{ViewChannel:false});const t=await Ticket.findOne({channelId:ctx.channel.id});if(t)await ctx.channel.permissionOverwrites.edit(t.creatorId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});return reply({embeds:[success("Reopened","Ticket reopened.")]});}
    if(sub==="delete"){await Ticket.deleteOne({channelId:ctx.channel.id});await ctx.channel.delete();return null;}
    if(sub==="transcript"){const text=await transcript(ctx.channel);const buf=Buffer.from(text,"utf8");return reply({content:"Transcript created.",files:[{attachment:buf,name:`${ctx.channel.name}.txt`}]});}
  }

  if (name === "trigger") {
    const sub=ctx.options?.getSubcommand()||args[0];
    if(sub==="add"){const tr=ctx.options?.getString("trigger")||args[1];const response=ctx.options?.getString("response")||args.slice(2).join(" ");const t=await Trigger.findOneAndUpdate({guildId:guild.id,trigger:tr.toLowerCase()},{guildId:guild.id,trigger:tr.toLowerCase(),response,embed:ctx.options?.getBoolean("embed")||false,reaction:ctx.options?.getString("reaction")||"",deleteMessage:ctx.options?.getBoolean("delete")||false,enabled:true},{upsert:true,new:true});return reply({embeds:[success("Trigger added",`**${t.trigger}** → ${t.response}`)]});}
    if(sub==="remove"){const tr=ctx.options?.getString("trigger")||args[1];await Trigger.deleteOne({guildId:guild.id,trigger:tr.toLowerCase()});return reply({embeds:[success("Trigger removed",tr)]});}
    if(sub==="list"){const ts=await Trigger.find({guildId:guild.id});return reply({embeds:[info("Triggers",ts.length?ts.map(t=>`${t.enabled?"🟢":"🔴"} **${t.trigger}** → ${t.response}`).join("\n"):"No triggers.")]});}
    if(sub==="enable"||sub==="disable"){const tr=ctx.options?.getString("trigger")||args[1];await Trigger.updateOne({guildId:guild.id,trigger:tr.toLowerCase()},{$set:{enabled:sub==="enable"}});return reply({embeds:[success("Trigger updated",`${tr}: ${sub}`)]});}
  }

  if(name==="antinuke"){
    const sub=ctx.options?.getSubcommand()||args[0];const s=await getSettings(guild.id);
    if(sub==="enable"){s.antinuke.enabled=true;await s.save();return reply({embeds:[success("Anti-Nuke","Enabled.")]});}
    if(sub==="disable"){s.antinuke.enabled=false;await s.save();return reply({embeds:[warn("Anti-Nuke","Disabled.")]});}
    if(sub==="status")return reply({embeds:[info("Anti-Nuke",`Enabled: ${s.antinuke.enabled}\\nPunishment: ${s.antinuke.punishment}\\nWhitelist: ${s.whitelist.length}`)]});
    if(sub==="whitelist"||sub==="unwhitelist"){const id=ctx.options?.getUser("user")?.id||args[1];s.whitelist=s.whitelist.filter(x=>x!==id);if(sub==="whitelist")s.whitelist.push(id);await s.save();return reply({embeds:[success("Whitelist",`${sub}: <@${id}>`)]});}
    if(sub==="lockdown"){await emergencyLockdown(guild);return reply({embeds:[warn("Emergency lockdown","All text channels were locked for @everyone.")]});}
  }
}

module.exports = { commands, executeCommand };
