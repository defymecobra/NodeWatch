/**
 * NodeWatch - Alert Service
 *
 * Checks if incoming logs trigger any alert configurations for the project.
 * Supports sending notifications via Telegram.
 */
const TelegramBot = require('node-telegram-bot-api');
const db = require('../db');

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot = null;

if (token) {
  // Initialize Telegram bot (polling: false because we only send messages, not receive)
  bot = new TelegramBot(token, { polling: false });
  console.log('✅ Telegram Bot configured for alerts');
} else {
  console.log('⚠️ TELEGRAM_BOT_TOKEN not provided. Telegram alerts are disabled.');
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
        if (config.channel === 'telegram' && bot) {
          await sendTelegramAlert(config.recipient_id, project.name, log);
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
async function sendTelegramAlert(chatId, projectName, log) {
  const emoji = log.level === 'critical' ? '🚨' :
                log.level === 'error'    ? '❌' :
                log.level === 'warn'     ? '⚠️' : 'ℹ️';

  const message = `${emoji} *NodeWatch Alert*\n*Project:* ${projectName}\n*Level:* ${log.level.toUpperCase()}\n\n*Message:*\n\`\`\`text\n${log.message}\n\`\`\``;

  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error(`❌ Telegram alert failed for chat ${chatId}:`, err.message);
  }
}

module.exports = {
  processAlerts,
};
