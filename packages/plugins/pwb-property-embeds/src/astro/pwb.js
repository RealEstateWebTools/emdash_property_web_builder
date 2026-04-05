const DEFAULT_LOCALE = "en";

function trimTrailingSlash(value) {
	return value.replace(/\/+$/, "");
}

export function getPwbApiBase() {
	const url = import.meta.env.PWB_API_URL;
	if (!url) {
		throw new Error("PWB_API_URL environment variable is not set");
	}
	return trimTrailingSlash(url);
}

export async function getPropertyBySlug(slug, locale = DEFAULT_LOCALE) {
	const apiBase = getPwbApiBase();
	const url = `${apiBase}/api_public/v1/${locale}/properties/${encodeURIComponent(slug)}`;
	const res = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error(`Failed to load PWB property ${slug}: ${res.status}`);
	}
	return res.json();
}

export function getPropertyUrl(slug) {
	return `/properties/${slug}`;
}
