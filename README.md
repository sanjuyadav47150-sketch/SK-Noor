# All-In-One Discord Bot

Features:
- Prefix `+` and slash commands
- Moderation: ban, unban, kick, timeout, untimeout, warn, warnings, clear, lock, unlock, nick, slowmode, say
- Tickets: setup, panel, create, claim, add/remove, close/reopen/delete, transcript
- Anti-Nuke: channel/role/webhook/bot/ban/kick protection, permission escalation detection, raid detection, whitelist, emergency lockdown
- Trigger system with responses, embeds, reactions, delete option, channel restrictions and cooldown
- Security/moderation/ticket/message/member logs
- Bot detection and local risk scoring
- Per-guild MongoDB settings
- Editable bot profile config
- Editable custom emoji config
- Clean embeds

## Setup
1. Copy `.env.example` to `.env`.
2. Fill in DISCORD_TOKEN, CLIENT_ID and MONGODB_URI.
3. Run `npm install`.
4. Run `npm run register`.
5. Run `npm start`.
6. In Discord Developer Portal, enable the required privileged intents, especially Message Content and Server Members for the features that need them.
7. Keep `.env` private and never upload it to GitHub.

For fast development registration, put the test server ID in DEV_GUILD_ID.
