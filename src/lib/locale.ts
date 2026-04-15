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
    'Search filters': 'Filtros de busqueda',
    'filters active': 'filtros activos',
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
    'Primary action': 'Accion principal',
    'Address': 'Direccion',
    'Phone': 'Telefono',
    'Enquire about': 'Consulta sobre',
    'Arrange a viewing or ask for details': 'Solicita una visita o pide mas detalles',
    'Ask for details or latest availability': 'Pide detalles o la disponibilidad actual',
    'Book a Viewing': 'Reservar visita',
    'Request Viewing': 'Solicitar visita',
    'Request Valuation': 'Solicitar valoracion',
    'Ask about this property': 'Preguntar por esta propiedad',
    'Thinking of selling something similar?': 'Pensando en vender algo parecido?',
    'Chat with the office about this listing': 'Habla con la oficina sobre este inmueble',
    'Chat on WhatsApp': 'Hablar por WhatsApp',
    'I am interested in': 'Me interesa',
    'Use the enquiry form to request a viewing, ask for floorplans, or confirm the latest availability with the team.': 'Usa el formulario para solicitar una visita, pedir planos o confirmar la disponibilidad mas reciente con el equipo.',
    'Use the enquiry form to ask questions, request floorplans, or confirm the latest availability with the team.': 'Usa el formulario para hacer preguntas, pedir planos o confirmar la disponibilidad mas reciente con el equipo.',
    'Invite owners and landlords to request a valuation while keeping the enquiry form available for buyer questions.': 'Invita a propietarios y arrendadores a solicitar una valoracion mientras mantienes el formulario disponible para consultas de compradores.',
    'Use WhatsApp for a faster first contact, then fall back to the enquiry form below if you need a fuller message.': 'Usa WhatsApp para un primer contacto mas rapido y recurre al formulario de abajo si necesitas enviar un mensaje mas completo.',
    'If you still want details on this listing, use the enquiry form below and the team will come back to you.': 'Si aun quieres detalles sobre este inmueble, usa el formulario de abajo y el equipo te respondera.',
    'Prefer email instead? Use the form below for viewing requests, floorplans, or availability questions.': 'Prefieres email? Usa el formulario de abajo para visitas, planos o consultas sobre disponibilidad.',
    'Share the details you need and the office can reply with the next step or the latest status.': 'Comparte lo que necesitas y la oficina podra responder con el siguiente paso o el estado mas reciente.',
    'Share a preferred day or time if you want the team to come back with viewing availability.': 'Comparte un dia u hora preferidos si quieres que el equipo te responda con disponibilidad para visitas.',
    'Start the conversation': 'Inicia la conversacion',
    'Tell us what you need help with': 'Cuentanos en que necesitas ayuda',
    'Use the form for buying, selling, renting, valuations, or general office questions. The team can route your enquiry to the right next step.': 'Usa el formulario para compra, venta, alquiler, valoraciones o consultas generales. El equipo puede dirigir tu consulta al siguiente paso correcto.',
    'Speak to a real local team for viewings, valuations, landlord questions, and buyer support.': 'Habla con un equipo local real para visitas, valoraciones, consultas de propietarios y apoyo a compradores.',
    'Call the office': 'Llamar a la oficina',
    'Send an email': 'Enviar un correo',
    'Clear route for valuations, viewings, and buyer questions': 'Ruta clara para valoraciones, visitas y consultas de compradores',
    'Office identity and contact details shown before the first enquiry': 'Identidad de oficina y datos de contacto visibles antes de la primera consulta',
    'Consistent trust cues across contact and property detail journeys': 'Senales de confianza consistentes entre contacto y fichas de propiedad',
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
    'Open fullscreen gallery': 'Abrir galeria a pantalla completa',
    'View fullscreen': 'Ver en pantalla completa',
    'Fullscreen photo gallery': 'Galeria de fotos a pantalla completa',
    'Close gallery': 'Cerrar galeria',
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
    'Search filters': 'Filtres de recherche',
    'filters active': 'filtres actifs',
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
    'Primary action': 'Action principale',
    'Address': 'Adresse',
    'Phone': 'Telephone',
    'Enquire about': 'Demande sur',
    'Arrange a viewing or ask for details': 'Organiser une visite ou demander des details',
    'Ask for details or latest availability': 'Demander des details ou la disponibilite actuelle',
    'Book a Viewing': 'Reserver une visite',
    'Request Viewing': 'Demander une visite',
    'Request Valuation': 'Demander une estimation',
    'Ask about this property': 'Demander des informations sur ce bien',
    'Thinking of selling something similar?': 'Vous pensez vendre un bien similaire ?',
    'Chat with the office about this listing': 'Echangez avec l agence au sujet de ce bien',
    'Chat on WhatsApp': 'Discuter sur WhatsApp',
    'I am interested in': 'Je suis interesse par',
    'Use the enquiry form to request a viewing, ask for floorplans, or confirm the latest availability with the team.': 'Utilisez le formulaire pour demander une visite, obtenir les plans ou confirmer la disponibilite la plus recente avec l equipe.',
    'Use the enquiry form to ask questions, request floorplans, or confirm the latest availability with the team.': 'Utilisez le formulaire pour poser vos questions, demander les plans ou confirmer la disponibilite la plus recente avec l equipe.',
    'Invite owners and landlords to request a valuation while keeping the enquiry form available for buyer questions.': 'Invitez les proprietaires et bailleurs a demander une estimation tout en gardant le formulaire disponible pour les questions d acheteurs.',
    'Use WhatsApp for a faster first contact, then fall back to the enquiry form below if you need a fuller message.': 'Utilisez WhatsApp pour un premier contact plus rapide, puis le formulaire ci-dessous si vous avez besoin d un message plus complet.',
    'If you still want details on this listing, use the enquiry form below and the team will come back to you.': 'Si vous voulez toujours des details sur ce bien, utilisez le formulaire ci-dessous et l equipe reviendra vers vous.',
    'Prefer email instead? Use the form below for viewing requests, floorplans, or availability questions.': 'Vous preferez l email ? Utilisez le formulaire ci-dessous pour les visites, les plans ou les questions de disponibilite.',
    'Share the details you need and the office can reply with the next step or the latest status.': 'Partagez les informations dont vous avez besoin et l agence pourra repondre avec la prochaine etape ou le statut le plus recent.',
    'Share a preferred day or time if you want the team to come back with viewing availability.': 'Indiquez un jour ou un horaire prefere si vous souhaitez que l equipe vous recontacte avec des disponibilites de visite.',
    'Start the conversation': 'Lancez la conversation',
    'Tell us what you need help with': 'Dites-nous ce dont vous avez besoin',
    'Use the form for buying, selling, renting, valuations, or general office questions. The team can route your enquiry to the right next step.': 'Utilisez le formulaire pour l achat, la vente, la location, les estimations ou les questions generales. L equipe pourra orienter votre demande vers la bonne suite.',
    'Speak to a real local team for viewings, valuations, landlord questions, and buyer support.': 'Parlez a une vraie equipe locale pour les visites, estimations, questions de bailleurs et accompagnement acheteur.',
    'Call the office': 'Appeler l agence',
    'Send an email': 'Envoyer un email',
    'Clear route for valuations, viewings, and buyer questions': 'Parcours clair pour les estimations, visites et questions acheteurs',
    'Office identity and contact details shown before the first enquiry': 'Identite de l agence et coordonnees visibles avant la premiere demande',
    'Consistent trust cues across contact and property detail journeys': 'Reperes de confiance coherents entre le contact et les fiches bien',
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
    'Open fullscreen gallery': 'Ouvrir la galerie en plein ecran',
    'View fullscreen': 'Voir en plein ecran',
    'Fullscreen photo gallery': 'Galerie photo en plein ecran',
    'Close gallery': 'Fermer la galerie',
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
