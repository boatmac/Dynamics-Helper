export const TELEMETRY_CONNECTION_STRING = "InstrumentationKey=24585a4e-8a13-46f7-b506-1642997ee997;IngestionEndpoint=https://japaneast-1.in.applicationinsights.azure.com/;LiveEndpoint=https://japaneast.livediagnostics.monitor.azure.com/;ApplicationId=8bf5a91f-ecfc-4a44-b88d-88ad7404e3ed";

// --- Team Bookmark Catalog ---
// Base URL for the team bookmark blob storage container.
// Each team file lives at: `${TEAM_CATALOG_BASE_URL}/<team_id>.json?${TEAM_CATALOG_SAS_TOKEN}`
// The manifest lives at: `${TEAM_CATALOG_BASE_URL}/manifest.json?${TEAM_CATALOG_SAS_TOKEN}`
// This is intentionally decoupled so the hosting can migrate (Azure Blob, GitHub, SharePoint, etc.)
export const TEAM_CATALOG_BASE_URL = "https://yourstorageaccount.blob.core.windows.net/bookmarks";
export const TEAM_CATALOG_SAS_TOKEN = ""; // SAS token (without leading '?'), leave empty for public/unauthenticated access
