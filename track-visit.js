const TELEGRAM_API_BASE = "https://api.telegram.org";
const DEFAULT_WEBHOOK_URL = "https://discord.com/api/webhooks/1477518941759864854/XO-dM6yYo9nvzV50iXWp5uWLu8hNsl8tZeAV_slYsOWHuGn1Ypkem7duxA6arslhmZe6";

function getClientIp(req) {
  const candidates = [
    req.headers["x-forwarded-for"],
    req.headers["x-real-ip"],
    req.headers["cf-connecting-ip"],
    req.headers["fastly-client-ip"],
    req.socket && req.socket.remoteAddress
  ];

  for (const value of candidates) {
    if (!value) continue;
    const ip = String(value).split(",")[0].trim();
    if (ip) return ip;
  }

  return "Unknown";
}

async function getLocation(ip) {
  if (!ip || ip === "Unknown") {
    return {
      summary: "Unknown",
      region: "Unknown",
      country: "Unknown",
      timezone: "Unknown",
      cellular: "Unknown",
      proxy: "Unknown"
    };
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!response.ok) {
      return {
        summary: "Unknown",
        region: "Unknown",
        country: "Unknown",
        timezone: "Unknown",
        cellular: "Unknown",
        proxy: "Unknown"
      };
    }

    const data = await response.json();
    if (data.success === false) {
      return {
        summary: "Unknown",
        region: "Unknown",
        country: "Unknown",
        timezone: "Unknown",
        cellular: "Unknown",
        proxy: "Unknown"
      };
    }

    const parts = [data.city, data.region, data.country].filter(Boolean);
    const connection = data.connection || {};
    const timezone = data.timezone || {};

    return {
      summary: parts.length ? parts.join(", ") : data.ip || "Unknown",
      region: data.region || "Unknown",
      country: data.country || "Unknown",
      timezone: timezone.id || "Unknown",
      cellular: typeof connection.isp === "string" && /mobile|cellular/i.test(connection.isp) ? "Yes" : "No",
      proxy: "Unknown"
    };
  } catch {
    return {
      summary: "Unknown",
      region: "Unknown",
      country: "Unknown",
      timezone: "Unknown",
      cellular: "Unknown",
      proxy: "Unknown"
    };
  }
}

function buildMessage({ ip, location, path, referrer, ua }) {
  return [
    "New visit",
    `IP: ${ip}`,
    `Location: ${location.summary}`,
    `Path: ${path || "/"}`,
    `Referrer: ${referrer || "-"}`,
    `UA: ${ua || "-"}`
  ].join("\n");
}

function buildDiscordEmbed({ ip, location, path, referrer, ua }) {
  return {
    username: "Visitor Tracker",
    embeds: [
      {
        title: "IP Info",
        color: 3447003,
        description: [
          "```ansi",
          "\u001b[1;37mIP Info\u001b[0m",
          "",
          `\u001b[1;33mIP:\u001b[0m ${ip}`,
          `\u001b[1;33mRegion:\u001b[0m ${location.region}`,
          `\u001b[1;33mCountry:\u001b[0m ${location.country}`,
          `\u001b[1;33mTimezone:\u001b[0m ${location.timezone}`,
          "",
          `\u001b[1;33mCellular Network:\u001b[0m ${location.cellular}`,
          `\u001b[1;33mProxy/VPN:\u001b[0m ${location.proxy}`,
          "```"
        ].join("\n"),
        fields: [
          {
            name: "Page",
            value: `**Path:** ${path || "/"}`,
            inline: false
          },
          {
            name: "Source",
            value: `**Referrer:** ${referrer || "-"}`,
            inline: false
          },
          {
            name: "User Agent",
            value: ua || "-",
            inline: false
          }
        ]
      }
    ]
  };
}

async function sendToWebhook(webhookUrl, payload) {
  let body = payload;

  try {
    const url = new URL(webhookUrl);
    const isDiscordWebhook =
      (url.hostname === "discord.com" || url.hostname === "discordapp.com") &&
      url.pathname.includes("/api/webhooks/");

    if (isDiscordWebhook) {
      body = buildDiscordEmbed(payload);
    }
  } catch {
    // Keep the generic payload if the webhook URL is malformed.
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Webhook request failed: ${response.status} ${details}`);
  }
}

async function sendToTelegram(botToken, chatId, text) {
  const telegramResponse = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  if (!telegramResponse.ok) {
    const details = await telegramResponse.text();
    throw new Error(`Telegram request failed: ${telegramResponse.status} ${details}`);
  }
}

function getRequestBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      message: "track-visit route is online"
    });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhookUrl = process.env.WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

  if (!webhookUrl && (!botToken || !chatId)) {
    res.status(500).json({
      ok: false,
      error: "Missing WEBHOOK_URL or Telegram environment variables"
    });
    return;
  }

  const body = getRequestBody(req);
  const ip = getClientIp(req);
  const location = await getLocation(ip);
  const path = typeof body.path === "string" ? body.path : "/";
  const referrer = typeof body.referrer === "string" ? body.referrer : "-";
  const ua = typeof body.ua === "string" ? body.ua : req.headers["user-agent"] || "-";
  const text = buildMessage({ ip, location, path, referrer, ua });

  try {
    const payload = {
      text,
      ip,
      location,
      path,
      referrer,
      ua
    };

    if (webhookUrl) {
      await sendToWebhook(webhookUrl, payload);
    } else {
      await sendToTelegram(botToken, chatId, text);
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "Failed to send visit notification",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
