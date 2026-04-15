const mongoose = require("mongoose");

const siteConfigSchema = new mongoose.Schema(
  {
    siteName: { type: String, default: "Votre commerce" },
    businessType: { type: String, enum: ["restaurant", "retail"], default: "retail" },
    locale: { type: String, default: "fr-FR" },
    currency: { type: String, default: "EUR" },
    theme: {
      primary: { type: String, default: "#16a34a" },
      primaryDark: { type: String, default: "#15803d" },
      heroGradient: { type: String, default: "135deg, #1e293b, #334155" },
      heroColor: { type: String, default: "#1e293b" },
      topBarColor: { type: String, default: "#0f172a" },
      badgeBg: { type: String, default: "rgba(255, 255, 255, 0.2)" },
    },
    images: {
      favicon: { type: String, default: "" },
      logo: { type: String, default: "" },
      heroBackground: { type: String, default: "" },
    },
    contact: {
      whatsapp: { type: String, default: "33600000000" },
      email: { type: String, default: "contact@exemple.fr" },
      stripePaymentLink: { type: String, default: "" },
    },
    texts: {
      pageTitleSuffix: { type: String, default: "Commande en ligne" },
      metaDescription: { type: String, default: "Commandez en ligne — catalogue et livraison." },
      navCtaCommand: { type: String, default: "Commander" },
      navCtaAdmin: { type: String, default: "Espace admin" },
      heroBadge: { type: String, default: "Votre accroche" },
      heroTitle: { type: String, default: "Une vitrine prête à personnaliser" },
      heroLead: {
        type: String,
        default: "Remplacez ces textes et images pour chaque client.",
      },
      menuSectionTitle: { type: String, default: "Notre offre" },
      menuLoading: { type: String, default: "Chargement..." },
      menuEmpty: { type: String, default: "Aucun article pour le moment." },
      orderSectionTitle: { type: String, default: "Votre commande" },
      orderBlocked: {
        type: String,
        default: "Ajoutez des articles depuis l'espace admin pour activer les commandes.",
      },
      fieldsetLegend: { type: String, default: "Votre sélection" },
      confirmButton: { type: String, default: "Valider la commande" },
      confirmSending: { type: String, default: "Envoi en cours..." },
      footerCopyright: { type: String, default: "Votre commerce" },
      notesPlaceholder: { type: String, default: "Remarques..." },
    },
    labels: {
      itemSingular: { type: String, default: "article" },
      itemPlural: { type: String, default: "articles" },
      catalogTitle: { type: String, default: "Catalogue" },
      addItemAction: { type: String, default: "Ajouter un article" },
      editItemAction: { type: String, default: "Modifier un article" },
      saveItemAction: { type: String, default: "Enregistrer" },
      selectItemsLegend: { type: String, default: "Sélection des articles" },
    },
    admin: {
      pageTitle: { type: String, default: "Administration" },
      headerTitle: { type: String, default: "Administration" },
    },
  },
  { timestamps: true }
);

function toPublicConfig(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    siteName: o.siteName,
    businessType: o.businessType,
    locale: o.locale,
    currency: o.currency,
    theme: o.theme || {},
    images: o.images || {},
    contact: o.contact || {},
    texts: o.texts || {},
    labels: o.labels || {},
    admin: o.admin || {},
  };
}

module.exports = {
  SiteConfig: mongoose.model("SiteConfig", siteConfigSchema),
  toPublicConfig,
};
