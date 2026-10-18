const prisma = require('../../config/db');
const { sendSuccess, sendError } = require('../../utils/response');
const { recordAuditLog } = require('../../services/auditService');
const { settingUpdateSchema } = require('../../validators');

/**
 * Get all application settings
 */
async function getSettings(req, res, next) {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' }
    });

    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return sendSuccess(res, {
      list: settings,
      map: settingsMap
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update application settings (Owner only)
 */
async function updateSettings(req, res, next) {
  try {
    const data = settingUpdateSchema.parse(req.body);

    const updatedSettings = [];

    for (const [key, value] of Object.entries(data.settings)) {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
      updatedSettings.push(setting);
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'SETTINGS_UPDATE',
      entityType: 'Setting',
      details: { updatedKeys: Object.keys(data.settings) },
      req
    });

    return sendSuccess(res, updatedSettings, 'Settings updated successfully.');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings
};
