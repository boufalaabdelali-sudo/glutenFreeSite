const { SiteConfig } = require("../models/SiteConfig");
const { loadBranding, deepMerge } = require("../config/loadBranding");

async function getOrCreateSiteConfig() {
  let cfg = await SiteConfig.findOne();
  if (cfg) return cfg;

  const fromJson = loadBranding();
  cfg = await SiteConfig.create(fromJson);
  return cfg;
}

async function updateSiteConfig(patch) {
  const current = await getOrCreateSiteConfig();
  const merged = deepMerge(current.toObject(), patch || {});

  current.set({
    siteName: merged.siteName,
    businessType: merged.businessType,
    locale: merged.locale,
    currency: merged.currency,
    theme: merged.theme,
    images: merged.images,
    contact: merged.contact,
    texts: merged.texts,
    labels: merged.labels,
    admin: merged.admin,
  });
  await current.save();
  return current;
}

module.exports = {
  getOrCreateSiteConfig,
  updateSiteConfig,
};
