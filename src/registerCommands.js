require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { commands } = require("./commands/commands");
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async()=> {
  const body = commands.map(c => c.toJSON());
  if (process.env.DEV_GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID), { body });
    console.log("Commands registered to DEV_GUILD_ID.");
  } else {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
    console.log("Global commands registered.");
  }
})().catch(console.error);
