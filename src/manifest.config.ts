import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

import { capitalizeFirstLetterOfWords } from "./utils";

const {
  name: rawProjectName,
  description: rawProjectDescription,
  version: semverVersion,
} = packageJson;

// Extract major, minor, and patch from SemVer string (e.g., "0.1.0-beta6" -> "0.1.0")
// This regex first removes any characters that are not digits, dots, or hyphens (pre-release tags),
// then splits by dot or hyphen. It assumes standard SemVer structure.
const [major, minor, patch] = semverVersion
  .replace(/[^\d.-]+/g, "")
  .split(/[.-]/)
  .slice(0, 3); // Ensure only major, minor, patch are taken

/**
 * Defines the manifest for the Chrome extension.
 * The manifest is generated asynchronously using project details from `package.json`.
 */
export default defineManifest(async () => {
  // Extracts the core description if a prefix like "Project Type: Description" exists.
  const descriptionParts: string[] = rawProjectDescription.split(": ");
  const projectDescription: string =
    descriptionParts.length > 1
      ? descriptionParts[1]
      : rawProjectDescription;

  const projectName: string = capitalizeFirstLetterOfWords(
    rawProjectName.replace(/-/g, " ")
  );

  return {
    manifest_version: 3,
    name: projectName,
    description: projectDescription,
    version: `${major}.${minor}.${patch}`,
    version_name: semverVersion,
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
        matches: ["https://vipmax.matrixdobrasil.ai/Painel/"],
        js: ["src/content/index.ts"],
        run_at: "document_start"
      },
    ],
    permissions: [
      "storage",
      "tabs",
    ] as chrome.runtime.ManifestPermissions[],
  };
});