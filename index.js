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

const STOCK_URL = "https://fruityblox.com/stock";
const CHECK_INTERVAL = 5 * 60 * 1000;

let previousStock = null;

http.createServer((req, res) => {
  res.writeHead(200);
  res.end("SHADOWX Fruit Tracker is running!");
}).listen(process.env.PORT || 3000);

async function sendToChannels(message) {
  for (const id of channelIds) {
    try {
      const channel = await client.channels.fetch(id);
      if (channel && channel.isTextBased()) {
        await channel.send(message);
      }
    } catch (error) {
      console.error(`Channel ${id}: ${error.message}`);
    }
  }
}

function unescapeJson(value) {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function parseStock(html) {
  const match = html.match(
    /\{\\"normal\\":(\[.*?\]),\\"mirage\\":(\[.*?\])/
  );

  if (match) {
    try {
      const normal = JSON.parse(unescapeJson(match[1]))
        .map(item => item.name)
        .filter(Boolean);

      const mirage = JSON.parse(unescapeJson(match[2]))
        .map(item => item.name)
        .filter(Boolean);

      if (normal.length || mirage.length) {
        return { normal, mirage };
      }
    } catch (error) {
      console.log("Trying dealer card data...");
    }
  }

  const stock = { normal: [], mirage: [] };
  const sections = [...html.matchAll(
    /<section>([\s\S]*?)<\/section>/g
  )];

  for (const item of sections) {
    const section = item[1];
    const heading = section.match(/<h2[^>]*>([^<]+)<\/h2>/);

    const key = heading &&
      heading[1].trim().toLowerCase().startsWith("mirage")
      ? "mirage"
      : "normal";

    stock[key] = [...section.matchAll(
      /<h3[^>]*>([^<]+)<\/h3>/g
    )].map(x => x[1].trim());
  }

  if (!stock.normal.length && !stock.mirage.length) {
    throw new Error("Could not read dealer stock.");
  }

  return stock;
}

async function checkDealerStock() {
  try {
    const response = await fetch(STOCK_URL, {
      headers: {
        "User-Agent": "SHADOWX-Fruit-Tracker/1.0",
        "Accept": "text/html"
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`Website error: ${response.status}`);
    }

    const html = await response.text();
    const stock = parseStock(html);

    if (previousStock === null) {
      previousStock = stock;

      await sendToChannels(
        "🍈 **SHADOWX CURRENT DEALER STOCK**\n\n" +
        "**Normal Dealer:**\n" +
        (stock.normal.join(", ") || "No data") +
        "\n\n**Mirage Dealer:**\n" +
        (stock.mirage.join(", ") || "No data") +
        "\n\nSource: " + STOCK_URL
      );

      return;
    }

    if (JSON.stringify(previousStock.normal) !==
        JSON.stringify(stock.normal)) {
      await sendToChannels(
        "🛒 **NORMAL DEALER STOCK CHANGED!**\n" +
        (stock.normal.join(", ") || "No data")
      );
    }

    if (JSON.stringify(previousStock.mirage) !==
        JSON.stringify(stock.mirage)) {
      await sendToChannels(
        "🌌 **MIRAGE DEALER STOCK CHANGED!**\n" +
        (stock.mirage.join(", ") || "No data")
      );
    }

    previousStock = stock;
    console.log("Dealer stock check completed.");

  } catch (error) {
    console.error("Dealer check failed:", error.message);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await sendToChannels("🔥 SHADOWX Fruit Tracker is ONLINE!");

  await checkDealerStock();

  setInterval(checkDealerStock, CHECK_INTERVAL);

  console.log("Dealer checks running every 5 minutes.");
});

client.login(process.env.DISCORD_TOKEN)
  .catch(error => console.error("Login failed:", error));
