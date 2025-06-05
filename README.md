[Leia este README em Português](README.pt-BR.md)

# Omni Max ![Logo](/src/assets/icons/icon-32.png)

**Omni Max is an AI-powered Chrome extension designed to supercharge the [Matrix Go](https://www.matrixgo.ai/) omnichannel customer service platform. It provides agents with tools for chat summarization, response enhancement, message templates, and quick data access to improve efficiency and customer interactions.**

## ✨ Key Features

Omni Max aims to streamline the workflow of customer service agents on the Matrix Go platform by offering:

* 🤖 **AI-Powered Assistance:**
    * **Chat Summarization:** Instantly generate concise summaries of lengthy customer conversations.
* 📝 **Message Template Processing:** Insert customer names quickly and formatted; select variables in templates with a single click.
* 🖱️ **Quick Copy Shortcuts:**
    * Copy customer's name (e.g., `Ctrl+Shift+Z` by default).
    * Copy customer's document number (CPF/CNPJ) (e.g., `Ctrl+Shift+X` by default).
    * Copy a pre-filled Service Order template (e.g., `Ctrl+Shift+S` by default).
* ⚙️ **Modular Design:** Enable or disable specific functionalities (modules) through the extension's popup menu to customize the experience to your individual needs.
* 🎨 **Layout Corrections:** Optional adjustments to the Matrix Go platform layout for improved usability (e.g., moving the conversation list).

## 🎯 Target Platform

This extension is specifically designed to integrate with and enhance the user experience on the **Matrix Go** omnichannel customer service platform.

## 🛠️ Tech Stack (Core)

* [SvelteKit](https://kit.svelte.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Vite](https://vitejs.dev/)
* [CRXJS Vite Plugin](https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin/README.md) (for Chrome Extension Manifest V3)
* [LangChain](https://js.langchain.com/) for AI provider integrations.

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (LTS version recommended)
* `npm` (comes with Node.js) or `yarn` / `pnpm`

### Installation (for Users)

*(Instructions on how to install the Omni Max extension from the Chrome Web Store will be available here once it is published. For development and testing, please see the "Development Setup" section below.)*

For detailed usage instructions, please refer to our [User Guide](/docs/USER_GUIDE.md).

### Development Setup

To set up Omni Max for development:

1.  **Clone the repository:**
    ````bash
    git clone [https://github.com/DevDeividMoura/omni-max.git](https://github.com/DevDeividMoura/omni-max.git)
    cd omni-max
    ````

2.  **Install dependencies:**
    ````bash
    npm install
    # or yarn install / pnpm install
    ````

3.  **Run in development mode:**
    ````bash
    npm run dev
    ````
    This command will:
    * Build the extension into the `/dist` directory.
    * Watch for file changes and rebuild automatically (HMR for extension pages and content scripts).

4.  **Load the unpacked extension in Chrome:**
    * Open Chrome and navigate to `chrome://extensions`.
    * Enable "Developer mode" using the toggle switch.
    * Click the "Load unpacked" button.
    * Select the `dist` directory from your project folder.

Omni Max should now be installed and active for development.

## 🔧 Configuration

Omni Max offers a range of configurations accessible via its popup interface, allowing you to tailor the extension to your workflow:

* **Global Enable/Disable:** Quickly turn the entire extension on or off.
* **Module Toggling:** Individually enable or disable specific features such as AI Chat Summary, Quick Copy shortcuts, Layout Corrections, and Template Processing.
* **AI Settings:**
    * Select your preferred AI provider (e.g., OpenAI, Gemini, Anthropic, Groq, Ollama).
    * Manage API keys or Base URLs for the chosen provider.
    * Choose a specific AI model from the selected provider.
* **Custom Prompts:** Modify the default prompts used for AI features like chat summarization.
* **Shortcut Keys:** Customize the keyboard shortcuts for quick copy actions.

The state of these configurations is saved across browser sessions. For a detailed guide on all configuration options, see the [User Guide](/docs/USER_GUIDE.md#configuring-omni-max).

## 🏗️ Building for Production

To create a production-ready build of the extension (e.g., for packaging and uploading to the Chrome Web Store):

````bash
npm run build
````

This will generate optimized files in the /dist directory.

## 🤝 Contributing

We welcome contributions to Omni Max! To contribute, please:

1.  Adhere to the Gitflow workflow. Feature development should occur on branches derived from `develop`.
2.  Use Conventional Commits for your commit messages (see table in the project's persona description).
3.  Submit Pull Requests to the `develop` branch. Please use the provided [Pull Request template](/.github/PULL_REQUEST_TEMPLATE.md).
4.  Ensure any new code is well-tested and follows the project's coding standards (SOLID, Clean Code, etc.).
5.  Write unit tests for new functionalities and ensure all tests pass (`npm run test`).
6.  Update documentation (READMEs, User Guide) as necessary for any changes or new features.

This project uses `release-please` for automated release management based on Conventional Commits.

## 📝 License

This project is licensed under the MIT License.
Please see the `LICENSE.md` file (if it exists, otherwise assume MIT based on common practice for your projects) for details.

---

Made with ❤️ by [@DevDeividMoura](https://github.com/DevDeividMoura)