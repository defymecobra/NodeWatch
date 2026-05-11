/**
 * NodeWatch - Alert Service
 *
 * Checks if incoming logs trigger any alert configurations for the project.
 * Supports sending notifications via Telegram.
 */
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const db = require('../db');
const configService = require('./config');

let bot = null;
let currentToken = null;

/**
 * Get or initialize the Telegram bot instance.
 */
function getBot() {
  const token = configService.get('telegram_bot_token');
  
  if (!token) return null;
  
  // If token changed, re-initialize
  if (token !== currentToken) {
    currentToken = token;
    bot = new TelegramBot(token, { polling: false });
    console.log('✅ Telegram Bot (re)configured with dynamic token');
  }
  
  return bot;
}

// Map levels to numeric weights for comparison
const LEVEL_WEIGHTS = {
  info: 10,
  warn: 20,
  error: 30,
  critical: 40,
};

/**
 * Process alerts for a given log entry.
 * Checks active alert configurations for the project and sends notifications
 * if the log level is high enough.
 *
 * @param {Object} project - { id, name }
 * @param {Object} log - The saved log record
 * @param {boolean} isDuplicate - Whether this is a duplicate occurrence
 */
async function processAlerts(project, log, isDuplicate) {
  // To avoid spam, only alert on the FIRST occurrence of an error
  if (isDuplicate) {
    return;
  }

  try {
    // Find all active alert configs for this project
    const result = await db.query(
      `SELECT channel, recipient_id, min_level
       FROM alert_configs
       WHERE project_id = $1 AND is_enabled = true`,
      [project.id]
    );

    if (result.rows.length === 0) return;

    const logWeight = LEVEL_WEIGHTS[log.level] || 0;

    for (const config of result.rows) {
      const configWeight = LEVEL_WEIGHTS[config.min_level] || 0;

      // Check if log level meets or exceeds the minimum level required for this alert
      if (logWeight >= configWeight) {
        if (config.channel === 'telegram') {
          const activeBot = getBot();
          if (activeBot) {
            await sendTelegramAlert(config.recipient_id, project.name, log, activeBot);
          }
        } else if (config.channel === 'discord') {
          await sendDiscordAlert(config.recipient_id, project.name, log);
        }
      }
    }
  } catch (err) {
    console.error('❌ Failed to process alerts:', err.message);
  }
}

/**
 * Send a formatted message to a Telegram chat.
 *
 * @param {string} chatId - Telegram chat ID
 * @param {string} projectName - Name of the project
 * @param {Object} log - The log entry
 */
async function sendTelegramAlert(chatId, projectName, log, activeBot) {
  const emoji = log.level === 'critical' ? '🚨' :
                log.level === 'error'    ? '❌' :
                log.level === 'warn'     ? '⚠️' : 'ℹ️';

  const message = `${emoji} *NodeWatch Alert*\n*Project:* ${projectName}\n*Level:* ${log.level.toUpperCase()}\n\n*Message:*\n\`\`\`text\n${log.message}\n\`\`\``;

  try {
    await activeBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`❌ Telegram alert failed for chat ${chatId}:`, err.message);
  }
}

/**
 * Send a rich embed message to a Discord Webhook.
 * 
 * @param {string} webhookUrl - Discord Webhook URL
 * @param {string} projectName - Name of the project
 * @param {Object} log - The log entry
 */
async function sendDiscordAlert(webhookUrl, projectName, log) {
  const color = log.level === 'critical' ? 0xff4757 : // Red
                log.level === 'error'    ? 0xffa502 : // Orange
                log.level === 'warn'     ? 0xeccc68 : // Yellow
                                           0x2f3542;   // Dark
  
  const payload = JSON.stringify({
    embeds: [{
      title: `NodeWatch Alert: ${projectName}`,
      description: `**${log.message}**`,
      color: color,
      fields: [
        { name: 'Level', value: log.level.toUpperCase(), inline: true },
        { name: 'Project', value: projectName, inline: true },
        { name: 'Time', value: new Date(log.last_seen_at || log.created_at).toLocaleString(), inline: true }
      ],
      footer: { text: 'NodeWatch Monitoring' },
      timestamp: new Date().toISOString(),
      url: `${configService.get('dashboard_url', 'http://localhost:5173')}/incidents/${log.id}`
    }]
  });

  try {
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Discord API returned status ${res.statusCode}`));
      });

      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
    });
  } catch (err) {
    console.error(`❌ Discord alert failed for ${projectName}:`, err.message);
  }
}

module.exports = {
  processAlerts,
};
