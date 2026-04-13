/**
 * Locale validation and path helpers.
 *
 * Must stay in sync with the i18n block in astro.config.ts.
 * When adding a new locale:
 *   1. Add it to i18n.locales in astro.config.ts
 *   2. Add it to SUPPORTED_LOCALES here
 *   3. Add a fallback in i18n.fallback if needed
 */

export const DEFAULT_LOCALE = 'en'

/** Non-default locales only — these appear as URL prefixes (/es/, /fr/). */
export const SUPPORTED_LOCALES = ['es', 'fr'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const ALL_LOCALES = [DEFAULT_LOCALE, ...SUPPORTED_LOCALES] as const
export type Locale = typeof ALL_LOCALES[number]

const LOCALE_LABELS: Record<string, string> = { en: 'EN', es: 'ES', fr: 'FR' }
export function localeLabel(locale: string): string {
  return LOCALE_LABELS[locale] ?? locale.toUpperCase()
}

/**
 * Returns the locale if it is a valid non-default locale, null otherwise.
 * Used in [lang] pages to guard against arbitrary URL segments matching the route.
 */
export function validateLocale(lang: string | undefined): SupportedLocale | null {
  if (!lang) return null
  return (SUPPORTED_LOCALES as readonly string[]).includes(lang)
    ? (lang as SupportedLocale)
    : null
}

/**
 * Build a locale-prefixed path.
 * Default locale gets no prefix; non-default locales are prefixed with /<locale>.
 *
 * localePath('en', '/posts/my-post') → '/posts/my-post'
 * localePath('es', '/posts/mi-entrada') → '/es/posts/mi-entrada'
 */
export function localePath(locale: string, path: string): string {
	if (/^(?:[a-z]+:)?\/\//i.test(path) || /^(?:mailto:|tel:|#)/i.test(path)) {
		return path
	}
  if (locale === DEFAULT_LOCALE) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `/${locale}${normalized}`
}

/**
 * Astro collection IDs for non-default locales can be prefixed with the locale,
 * for example `es/mi-articulo`. Strip that prefix before building public URLs.
 */
export function entrySlug(entryId: string): string {
  const normalized = entryId.startsWith('/') ? entryId.slice(1) : entryId

  for (const locale of ALL_LOCALES) {
    const prefix = `${locale}/`
    if (normalized.startsWith(prefix)) {
      return normalized.slice(prefix.length)
    }
  }

  return normalized
}

const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    'Thoughts, stories, and ideas.': 'Ideas, historias y contexto del mercado inmobiliario.',
    'RSS Feed': 'Canal RSS',
    'article': 'artículo',
    'articles': 'artículos',
    'Home': 'Inicio',
    'Properties': 'Propiedades',
    'Posts': 'Articulos',
    'Properties for Sale': 'Propiedades en venta',
    'Properties for Rent': 'Propiedades en alquiler',
    'About': 'Sobre nosotros',
    'Contact': 'Contactanos',
    'Navigate': 'Navegar',
    'Connect': 'Conectar',
    'All Posts': 'Todos los articulos',
    'No posts yet.': 'Todavia no hay articulos.',
    'View All Properties': 'Ver todas las propiedades',
    'Search': 'Buscar',
    'Property type': 'Tipo de propiedad',
    'All types': 'Todos los tipos',
    'Bedrooms': 'Dormitorios',
    'Any bedrooms': 'Cualquier numero de dormitorios',
    'Min price': 'Precio minimo',
    'Max price': 'Precio maximo',
    'Sort by': 'Ordenar por',
    'Price: Low to High': 'Precio: de menor a mayor',
    'Price: High to Low': 'Precio: de mayor a menor',
    'Newest First': 'Mas recientes primero',
    'Most Bedrooms': 'Mas dormitorios',
    'Search results pages': 'Paginas de resultados de busqueda',
    'Available in': 'Disponible en',
    'Search blog posts': 'Buscar articulos del blog',
    'Search posts...': 'Buscar articulos...',
    'Enter a search term to find posts.': 'Introduce un termino para buscar articulos.',
    'Page not found': 'Pagina no encontrada',
    'Go back home': 'Volver al inicio',
    "The page you're looking for doesn't exist.": 'La pagina que buscas no existe.',
    "The category you're looking for doesn't exist.": 'La categoria que buscas no existe.',
    "The tag you're looking for doesn't exist.": 'La etiqueta que buscas no existe.',
    "The post you're looking for doesn't exist.": 'El articulo que buscas no existe.',
    'Browse all posts': 'Ver todos los articulos',
    "The property you're looking for doesn't exist.": 'La propiedad que buscas no existe.',
    'Browse all properties': 'Ver todas las propiedades',
    'Featured': 'Destacada',
    'Bathrooms': 'Banos',
    'Area': 'Superficie',
    'Contact Us': 'Contactanos',
    'Enquire about': 'Consulta sobre',
    'Name *': 'Nombre *',
    'Email *': 'Correo electronico *',
    'Phone (optional)': 'Telefono (opcional)',
    'Message *': 'Mensaje *',
    'Send Enquiry': 'Enviar consulta',
    'Sending...': 'Enviando...',
    'Your enquiry has been sent!': 'Tu consulta ha sido enviada!',
    'Something went wrong. Please try again.': 'Algo salio mal. Intentalo de nuevo.',
    'Network error. Please try again.': 'Error de red. Intentalo de nuevo.',
    'bed': 'hab.',
    'bath': 'bano',
    'No properties found matching your search.': 'No se encontraron propiedades para tu busqueda.',
    'Similar Properties': 'Propiedades similares',
    'properties found': 'propiedades encontradas',
  },
  fr: {
    'Thoughts, stories, and ideas.': 'Idees, analyses et histoires autour de l\'immobilier.',
    'RSS Feed': 'Flux RSS',
    'article': 'article',
    'articles': 'articles',
    'Home': 'Accueil',
    'Properties': 'Biens',
    'Posts': 'Articles',
    'Properties for Sale': 'Biens a vendre',
    'Properties for Rent': 'Biens a louer',
    'About': 'A propos',
    'Contact': 'Contact',
    'Navigate': 'Navigation',
    'Connect': 'Liens utiles',
    'All Posts': 'Tous les articles',
    'No posts yet.': 'Aucun article pour le moment.',
    'View All Properties': 'Voir tous les biens',
    'Search': 'Recherche',
    'Property type': 'Type de bien',
    'All types': 'Tous les types',
    'Bedrooms': 'Chambres',
    'Any bedrooms': 'Nombre de chambres',
    'Min price': 'Prix min',
    'Max price': 'Prix max',
    'Sort by': 'Trier par',
    'Price: Low to High': 'Prix : croissant',
    'Price: High to Low': 'Prix : decroissant',
    'Newest First': 'Plus recents d\'abord',
    'Most Bedrooms': 'Le plus de chambres',
    'Search results pages': 'Pages de resultats de recherche',
    'Available in': 'Disponible en',
    'Search blog posts': 'Rechercher dans le blog',
    'Search posts...': 'Rechercher des articles...',
    'Enter a search term to find posts.': 'Saisissez un terme pour rechercher des articles.',
    'Page not found': 'Page introuvable',
    'Go back home': 'Retour a l\'accueil',
    "The page you're looking for doesn't exist.": 'La page recherchee n\'existe pas.',
    "The category you're looking for doesn't exist.": 'La categorie recherchee n\'existe pas.',
    "The tag you're looking for doesn't exist.": 'L\'etiquette recherchee n\'existe pas.',
    "The post you're looking for doesn't exist.": 'L\'article recherche n\'existe pas.',
    'Browse all posts': 'Voir tous les articles',
    "The property you're looking for doesn't exist.": 'Le bien recherche n\'existe pas.',
    'Browse all properties': 'Voir tous les biens',
    'Featured': 'En vedette',
    'Bathrooms': 'Salles de bain',
    'Area': 'Surface',
    'Contact Us': 'Contactez-nous',
    'Enquire about': 'Demande sur',
    'Name *': 'Nom *',
    'Email *': 'Email *',
    'Phone (optional)': 'Telephone (optionnel)',
    'Message *': 'Message *',
    'Send Enquiry': 'Envoyer la demande',
    'Sending...': 'Envoi...',
    'Your enquiry has been sent!': 'Votre demande a ete envoyee!',
    'Something went wrong. Please try again.': 'Un probleme est survenu. Veuillez reessayer.',
    'Network error. Please try again.': 'Erreur reseau. Veuillez reessayer.',
    'bed': 'ch.',
    'bath': 'sdb',
    'No properties found matching your search.': 'Aucun bien ne correspond a votre recherche.',
    'Similar Properties': 'Biens similaires',
    'properties found': 'biens trouves',
  },
}

const BRAND_TRANSLATIONS: Record<string, Record<string, string>> = {
  es: {
    'Property Search': 'Buscador de Propiedades',
    'My Blog': 'Mi Blog',
  },
  fr: {
    'Property Search': 'Recherche Immobiliere',
    'My Blog': 'Mon Blog',
  },
}

export function translateLabel(locale: string, text: string): string {
  return UI_TRANSLATIONS[locale]?.[text] ?? text
}

export function translateBrand(locale: string, text: string): string {
  return BRAND_TRANSLATIONS[locale]?.[text] ?? text
}
