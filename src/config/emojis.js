// Put your Discord custom emoji strings here.
// Example: "<:success:123456789012345678>"
// If an emoji is missing/invalid, the fallback is used.

module.exports = {
  success: "<:success:EMOJI_ID>",
  error: "<:error:EMOJI_ID>",
  warning: "<:warning:EMOJI_ID>",
  info: "<:info:EMOJI_ID>",
  ticket: "<:ticket:EMOJI_ID>",
  security: "<:security:EMOJI_ID>",
  bot: "<:bot:EMOJI_ID>",
  lock: "<:lock:EMOJI_ID>",
  unlock: "<:unlock:EMOJI_ID>",
  moderator: "<:moderator:EMOJI_ID>",
  trigger: "<:trigger:EMOJI_ID>",
  fallback: {
    success: "✅", error: "❌", warning: "⚠️", info: "ℹ️",
    ticket: "🎫", security: "🛡️", bot: "🤖",
    lock: "🔒", unlock: "🔓", moderator: "🛠️", trigger: "⚡"
  }
};
