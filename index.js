require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const channelIds = (process.env.CHANNEL_IDS || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

const FRUIT_CHECK_INTERVAL = 5 * 60 * 1000;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SHADOWX Fruit Tracker is running!");
}).listen(process.env.PORT || 3000);

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  for (const id of channelIds) {
    try {
      const channel = await client.channels.fetch(id);

      if (channel && channel.isTextBased()) {
        await channel.send("🔥 SHADOWX Fruit Tracker is ONLINE!");
      }
    } catch (error) {
      console.error(`Channel ${id}: ${error.message}`);
    }
  }

  console.log("Fruit check interval: 5 minutes");
});

client.login(process.env.DISCORD_TOKEN)
  .catch(error => console.error("Login failed:", error));
