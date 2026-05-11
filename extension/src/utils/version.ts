/**
 * Returns the human-facing extension version string.
 *
 * Chrome/Edge manifest v3 requires `version` to be 1-4 numeric segments.
 * Prerelease tags like `2.0.70-beta` are stored in `version_name` instead;
 * `version` carries the numeric prefix (`2.0.70`).
 *
 * Everywhere we display the version OR compare it against a host-side
 * VERSION string (which uses the full semver, e.g. `2.0.70-beta`), we
 * MUST read `version_name` when present so:
 *   - display stays consistent with Edge's own manifest listing
 *   - equality checks against `update_available` payloads work
 *     (host sends its `VERSION` constant, which is the full semver)
 *
 * Fallback to `version` for non-prerelease builds where `version_name`
 * is absent.
 */
export function getExtensionVersion(): string {
    const manifest = chrome.runtime.getManifest() as chrome.runtime.Manifest & {
        version_name?: string;
    };
    return manifest.version_name ?? manifest.version;
}
