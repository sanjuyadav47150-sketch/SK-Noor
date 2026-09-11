const { EmbedBuilder } = require("discord.js");
const emojis = require("../config/emojis");

function e(key) {
  const value = emojis[key];
  return value && !value.includes("EMOJI_ID") ? value : (emojis.fallback?.[key] || "");
}
function base(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description).setTimestamp();
}
function success(title, description) { return base(`${e("success")} ${title}`, description); }
function error(title, description) { return base(`${e("error")} ${title}`, description); }
function warn(title, description) { return base(`${e("warning")} ${title}`, description); }
function info(title, description) { return base(`${e("info")} ${title}`, description); }
module.exports = { e, base, success, error, warn, info };
