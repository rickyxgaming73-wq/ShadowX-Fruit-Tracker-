const channelIds = (process.env.CHANNEL_IDS || "")
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

for (const id of channelIds) {
  try {
    const channel = await client.channels.fetch(id);

    if (channel && channel.isTextBased()) {
      await channel.send("🔥 ShadowX Fruit Tracker is ONLINE!");
    }
  } catch (error) {
    console.error(`Failed to send to channel ${id}:`, error.message);
  }
}
const FRUIT_CHECK_INTERVAL = 5 * 60 * 1000;
