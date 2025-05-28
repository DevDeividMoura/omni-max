# Omni Max ![Logo](/src/assets/icons/icon-32.png)

**Omni Max is an AI-powered Chrome extension designed to supercharge the [Matrix Go](https://www.matrixgo.ai/) omnichannel customer service platform. It provides agents with tools for chat summarization, response enhancement, message templates, and quick data access to improve efficiency and customer interactions.**

## ✨ Key Features

Omni Max aims to streamline the workflow of customer service agents on the Matrix Go platform by offering:

* 🤖 **AI-Powered Assistance:**
    * **Chat Summarization:** Instantly generate concise summaries of lengthy customer conversations.
    * **Contextual Response Improvement:** Get AI-driven suggestions to refine and enhance your replies, ensuring they are clear, empathetic, and effective.
* 📝 **Message Template Processing:** insert the customer name quickly formatted, select variables in the templates quickly with one click.
* 🖱️ **Quick Copy Shortcuts:**
    * Copy customer's name (e.g., `Ctrl+Shift+X`).
    * Copy customer's CPF (e.g., `Ctrl+Shift+C`).
* ⚙️ **Modular Design:** Enable or disable specific functionalities (modules) through the extension's popup menu to customize the experience to your individual needs.
* 🎨 **Layout Corrections (Future):** Optional adjustments to the Matrix Go platform layout for improved usability.

## 🎯 Target Platform

This extension is specifically designed to integrate with and enhance the user experience on the **Matrix Go** omnichannel customer service platform.

## 🛠️ Tech Stack (Core)

* [SvelteKit](https://kit.svelte.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Vite](https://vitejs.dev/)
* [CRXJS Vite Plugin](https://github.com/crxjs/chrome-extension-tools/blob/main/packages/vite-plugin/README.md) (for Chrome Extension Manifest V3)

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (LTS version recommended)
* `npm` (comes with Node.js) or `yarn` / `pnpm`

### Installation (for Users)

*(Instructions on how to install the Omni Max extension from the Chrome Web Store will be available here once it is published. For development and testing, please see the "Development Setup" section below.)*

### Development Setup

To set up Omni Max for development:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/DevDeividMoura/omni-max.git

    cd omni-max
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install / pnpm install
    ```

3.  **Run in development mode:**
    ```bash
    npm run dev
    ```
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

Omni Max allows for user configuration via its popup interface:

* **Module Toggling:** Easily enable or disable specific features (e.g., AI Summary, Quick Copy Name) to suit your workflow. The state of these modules is saved across browser sessions.
* **(Future):** Settings for AI provider integration (e.g., API keys, model selection), custom prompts, etc.

## 🏗️ Building for Production

To create a production-ready build of the extension (e.g., for packaging and uploading to the Chrome Web Store):

```bash
npm run build
```

This will generate optimized files in the /dist directory.

## 🤝 Contributing

We welcome contributions to Omni Max! To contribute, please:

1. Adhere to the Gitflow workflow. Feature development should occur on branches derived from develop.
2. Use Conventional Commits for your commit messages.
3. Submit Pull Requests to the develop branch. Please use the provided Pull Request template.
4. Ensure any new code is well-tested and follows the project's coding standards.

This project uses release-please for automated release management.

## 📝 License

This project is licensed under the MIT License.
Please see the LICENSE.md file for details. 

Made with ❤️ by [@DevDeividMoura](https://github.com/DevDeividMoura)