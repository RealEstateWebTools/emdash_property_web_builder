const COPY = {
  en: {
    heroTitle: "Find Your Next Home",
    heroSubtitle: "Search the latest homes for sale and rent",
    heroPrimaryCta: "Browse Properties",
    heroSecondaryCta: "Book a Valuation",
    ctaTitle: "Ready to Move Forward?",
    ctaText: "Speak with our local team for practical advice.",
    ctaButton: "Contact Us",
    featuresHeading: "Why Clients Choose Us",
    featureSalesTitle: "Sales",
    featureSalesText: "Accurate pricing and strategic marketing.",
    featureLettingsTitle: "Lettings",
    featureLettingsText: "Reliable tenant sourcing and management.",
    featureValuationTitle: "Valuation",
    featureValuationText: "Data-backed appraisals with local context.",
  },
  es: {
    heroTitle: "Encuentra tu proximo hogar",
    heroSubtitle: "Busca las ultimas viviendas en venta y alquiler",
    heroPrimaryCta: "Ver propiedades",
    heroSecondaryCta: "Solicitar valoracion",
    ctaTitle: "Listo para dar el siguiente paso?",
    ctaText: "Habla con nuestro equipo local para recibir asesoramiento.",
    ctaButton: "Contactar",
    featuresHeading: "Por que nos eligen",
    featureSalesTitle: "Ventas",
    featureSalesText: "Valoracion precisa y marketing estrategico.",
    featureLettingsTitle: "Alquileres",
    featureLettingsText: "Captacion de inquilinos y gestion fiable.",
    featureValuationTitle: "Tasacion",
    featureValuationText: "Analisis basado en datos y conocimiento local.",
  },
};

export function normalizeLocale(locale) {
  if (locale === "es") return "es";
  return "en";
}

export function t(locale, key, fallback = "") {
  const safeLocale = normalizeLocale(locale);
  const localeCopy = COPY[safeLocale] ?? COPY.en;
  return localeCopy[key] ?? COPY.en[key] ?? fallback;
}

export function defaultFeatures(locale) {
  return [
    {
      title: t(locale, "featureSalesTitle"),
      body: t(locale, "featureSalesText"),
      icon: "house",
    },
    {
      title: t(locale, "featureLettingsTitle"),
      body: t(locale, "featureLettingsText"),
      icon: "key",
    },
    {
      title: t(locale, "featureValuationTitle"),
      body: t(locale, "featureValuationText"),
      icon: "chart",
    },
  ];
}
