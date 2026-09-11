const mongoose = require("mongoose");

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, unique: true },
  prefix: { type: String, default: "+" },
  logChannelId: String,
  securityLogChannelId: String,
  ticketCategoryId: String,
  ticketSupportRoleId: String,
  ticketCounter: { type: Number, default: 0 },
  ticketPanelChannelId: String,
  ticketPanelMessageId: String,
  antinuke: {
    enabled: { type: Boolean, default: true },
    windowMs: { type: Number, default: 10000 },
    thresholds: {
      channelDelete: { type: Number, default: 3 },
      channelCreate: { type: Number, default: 5 },
      roleDelete: { type: Number, default: 3 },
      roleCreate: { type: Number, default: 5 },
      ban: { type: Number, default: 3 },
      kick: { type: Number, default: 5 },
      webhook: { type: Number, default: 3 },
      bot: { type: Number, default: 2 },
      permission: { type: Number, default: 2 }
    },
    punishment: { type: String, default: "strip" }
  },
  whitelist: { type: [String], default: [] },
  triggerDefaults: { enabled: { type: Boolean, default: true } }
}, { timestamps: true });

const WarningSchema = new mongoose.Schema({
  guildId: String, userId: String, moderatorId: String, reason: String
}, { timestamps: true });

const TriggerSchema = new mongoose.Schema({
  guildId: String, trigger: String, response: String,
  embed: { type: Boolean, default: false },
  reaction: String,
  deleteMessage: { type: Boolean, default: false },
  cooldownMs: { type: Number, default: 0 },
  channelIds: { type: [String], default: [] },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const TicketSchema = new mongoose.Schema({
  guildId: String, channelId: String, number: Number, creatorId: String,
  claimedBy: String, status: { type: String, default: "open" }
}, { timestamps: true });

module.exports = {
  Guild: mongoose.models.Guild || mongoose.model("Guild", GuildSchema),
  Warning: mongoose.models.Warning || mongoose.model("Warning", WarningSchema),
  Trigger: mongoose.models.Trigger || mongoose.model("Trigger", TriggerSchema),
  Ticket: mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema)
};
