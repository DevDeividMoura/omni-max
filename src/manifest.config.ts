import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

import { capitalizeFirstLetterOfWords } from "./utils";

const { name: projectName, description: projectDescription, version } = packageJson;

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch] = version
    .replace(/[^\d.-]+/g, "") // Allow only digits, dots, or dashes
    .split(/[.-]/); // Split into version parts

/**
 * Defines the manifest for the Chrome extension.
 * The manifest is generated asynchronously.
 */
export default defineManifest(async () => {
    const descriptionParts = projectDescription.split(": ");
    const finalDescription = descriptionParts.length > 1 ? descriptionParts[1] : projectDescription;

    return {
        manifest_version: 3,
        name: capitalizeFirstLetterOfWords(projectName.replace(/-/g, " ")),
        description: finalDescription,
        version: `${major}.${minor}.${patch}`,
        version_name: version,
        icons: {
            "16": "src/assets/icons/icon-16.png",
            "32": "src/assets/icons/icon-32.png",
            "48": "src/assets/icons/icon-48.png",
            "128": "src/assets/icons/icon-128.png",
        },
        action: {
            default_popup: "src/popup/popup.html",
            default_icon: {
                "16": "src/assets/icons/icon-16.png",
                "32": "src/assets/icons/icon-32.png",
                "48": "src/assets/icons/icon-48.png",
                "128": "src/assets/icons/icon-128.png",
            },
        },
        content_scripts: [
            {
                matches: ["https://vipmax.matrixdobrasil.ai/Painel/*"],
                js: ["src/content/index.ts"],
            },
        ],
        permissions: ["storage", "tabs"] as chrome.runtime.ManifestPermissions[],
    };
});