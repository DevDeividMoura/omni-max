import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

const { version } = packageJson;

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch] = version
    // can only contain digits, dots, or dash
    .replace(/[^\d.-]+/g, "")
    // split into version parts
    .split(/[.-]/);

export default defineManifest(async () => ({
    manifest_version: 3,
    name: "Chrome Extension Svelte Typescript Boilerplate",
    description: "Boilerplate for Chrome Extension Svelte Typescript project",
    version: `${major}.${minor}.${patch}`,
    version_name: version,
    icons: {
        "16": "src/assets/icons/icon-16.png",
        "32": "src/assets/icons/icon-32.png",
        "48": "src/assets/icons/icon-48.png",
        "128": "src/assets/icons/icon-128.png",
    },
    content_scripts: [
        {
            matches: ["https://vipmax.matrixdobrasil.ai/Painel/"],
            js: ["src/content/index.ts"],
        },
    ],
    action: {
        default_popup: "src/popup/popup.html",
        default_icon: {
            "16": "src/assets/icons/icon-16.png",
            "32": "src/assets/icons/icon-32.png",
            "48": "src/assets/icons/icon-48.png",
            "128": "src/assets/icons/icon-128.png",
        },
    },
    permissions: ["storage"] as chrome.runtime.ManifestPermissions[],
}));
