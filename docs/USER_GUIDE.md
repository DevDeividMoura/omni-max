# Omni Max - User Guide

Welcome to Omni Max! This guide will help you install, configure, and use the Omni Max extension to enhance your experience on the Matrix Go platform.

## Table of Contents

1.  [Introduction](#introduction)
2.  [Installation](#installation)
3.  [Accessing Omni Max](#accessing-omni-max)
4.  [Main Features](#main-features)
    * [Layout Correction](#layout-correction)
    * [Quick Copy: Customer Name](#quick-copy-customer-name)
    * [Quick Copy: Document Number](#quick-copy-document-number)
    * [Quick Copy: Service Order Template](#quick-copy-service-order-template)
    * [Message Template Processor](#message-template-processor)
    * [AI: Chat Summary](#ai-chat-summary)
5.  [Configuring Omni Max](#configuring-omni-max)
    * [Global Enable/Disable](#global-enabledisable)
    * [Enabling/Disabling Modules](#enablingdisabling-modules)
    * [Configuring AI Provider](#configuring-ai-provider)
    * [Customizing Prompts](#customizing-prompts)
    * [Customizing Shortcut Keys](#customizing-shortcut-keys)
6.  [Troubleshooting](#troubleshooting)
7.  [Contact & Support](#contact--support)

## Introduction

Omni Max is an AI-powered Chrome extension designed to supercharge the [Matrix Go](https://www.matrixgo.ai/) omnichannel customer service platform. It provides agents with tools for chat summarization, response enhancement, message templates, and quick data access to improve efficiency and customer interactions.

## Installation

*(This section will be updated with instructions for installing from the Chrome Web Store once the extension is published.)*

Currently, to use Omni Max, you need to load it as an unpacked extension in development mode. Please refer to the [Development Setup instructions in the main README.md](../README.md#development-setup).

## Accessing Omni Max

Once installed, you can access Omni Max's features and settings through its popup menu:

1.  Click on the Extensions icon (usually a puzzle piece 🧩) in your Chrome toolbar.
2.  Find "Omni Max" in the list of extensions and click on it.
3.  The Omni Max popup will appear, allowing you to configure its settings.

## Main Features

Omni Max offers several modules to enhance your workflow. You can enable or disable these modules individually via the popup menu.

### Layout Correction

* **What it does:** Optionally adjusts the layout of the Matrix Go platform for improved usability. For example, it can move the conversation list to the right and limit its height.
* **How to use:** Enable the "Layout Correction" module in the Omni Max popup under "General Modules". The changes will apply automatically to the Matrix Go interface.

### Quick Copy: Customer Name

* **What it does:** Allows you to quickly copy the customer's name from the active chat.
* **Default Shortcut:** `Ctrl+Shift+Z`
* **How to use:** Ensure the "Shortcut: Copy Customer Name" module is enabled in the Omni Max popup (under "Keyboard Shortcuts"). When in an active chat on Matrix Go, press the configured shortcut. The customer's name will be copied to your clipboard, and a notification will confirm the action.
* **Customization:** You can change the shortcut key in the "Keyboard Shortcuts" section of the popup.

### Quick Copy: Document Number

* **What it does:** Allows you to quickly copy the customer's document number (CPF or CNPJ) from the active chat.
* **Default Shortcut:** `Ctrl+Shift+X`
* **How to use:** Enable the "Shortcut: Copy Customer Document Number" module. Press the configured shortcut in an active chat. The document number will be copied, and a notification will appear.
* **Customization:** The shortcut key can be changed in the popup.

### Quick Copy: Service Order Template

* **What it does:** Copies a pre-defined Service Order template to your clipboard. The template can automatically include the customer's phone number and the current protocol number if found on the page.
* **Default Shortcut:** `Ctrl+Shift+S`
* **How to use:** Enable the "Shortcut: Service Order Template" module. Press the configured shortcut. The template text will be copied.
    ````
    Situação: [RELATO_DO_CLIENTE] |||
    Telefone: [TELEFONE_DO_CLIENTE_OU_PLACEHOLDER] |||
    Protocolo: [NUMERO_DO_PROTOCOLO_OU_PLACEHOLDER] |||
    OBS: [OBSERVAÇÕES]
    ````
* **Customization:** The shortcut key can be changed in the popup.

### Message Template Processor

* **What it does:** Enhances the handling of message templates within Matrix Go. It can automatically format customer names (e.g., `{ANA MARIA}` becomes `Ana`) and allows quick navigation/selection of variables like `[VARIABLE]` using the `Tab` key.
* **How to use:** Enable the "Message Template Processor" module. When typing in the Matrix Go chatbox, type your template.
    * For name formatting, use the `{CUSTOMER_NAME}` placeholder.
    * For variable selection, type your variable within square brackets `[MY_VARIABLE]`. After typing the closing bracket, pressing `Tab` should select the content within the brackets.

### AI: Chat Summary

* **What it does:** Uses Artificial Intelligence to generate a concise summary of the current customer conversation history (protocol).
* **How to use:**
    1.  Enable the "AI: Chat Summary" module in the Omni Max popup (under "AI Settings").
    2.  Ensure you have configured an AI Provider and entered the necessary API Key/Base URL (see [Configuring AI Provider](#configuring-ai-provider)).
    3.  Select an AI model.
    4.  In Matrix Go, when viewing an active conversation, a "Summarize with AI" button (or similar) should appear near the chat actions. Click this button.
    5.  The summary will be generated and displayed, typically in a popup or a dedicated area. The summary is also cached for the current session.
* **Note:** This feature requires a valid API key for the selected AI provider (e.g., OpenAI, Gemini, Groq, Anthropic) or a running Ollama instance with a specified Base URL.

## Configuring Omni Max

You can customize Omni Max through its popup menu.

### Global Enable/Disable

* At the top of the popup, there's a main toggle switch. This allows you to quickly enable or disable all functionalities of Omni Max.
* The status ("Active" or "Inactive") is displayed next to the toggle.

### Enabling/Disabling Modules

Omni Max is modular, meaning you can turn specific features on or off.

* **General Modules:** Contains features like "Layout Correction" and "Template Processor".
* **Keyboard Shortcuts:** Allows you to enable/disable all shortcuts globally and then toggle individual shortcuts like "Copy Name", "Copy Document Number", etc.
* **AI Settings:** Allows you to enable/disable all AI features globally and then toggle individual AI modules like "AI Chat Summary".

Each module typically has a toggle switch next to its name.

### Configuring AI Provider

To use AI-powered features, you need to configure an AI provider:

1.  Open the Omni Max popup and navigate to the "AI Settings" section.
2.  **Enable AI Features:** Ensure the main toggle for "Enable All AI Functions" is on.
3.  **Select Provider:** Choose your preferred AI provider from the dropdown list (e.g., OpenAI, Google Gemini, Anthropic, Groq, Ollama).
4.  **Manage Credentials:**
    * Click the "Manage Credentials ([Provider Name])" button.
    * A modal will appear prompting for:
        * **API Key:** For providers like OpenAI, Gemini, Anthropic, Groq. You'll need to obtain this from the respective provider's website.
        * **Base URL:** For self-hosted providers like Ollama (e.g., `http://localhost:11434`).
    * Enter your credential and click "OK".
    * The extension provides links to documentation on how to obtain API keys for each provider.
5.  **Select Model:** Once credentials are set and valid, a list of available models for the selected provider will load in the "Model" dropdown. Choose the model you wish to use. If models don't load, check your API key/Base URL and internet connection.
6.  **Apply Changes:** Click the "Apply Changes" button at the bottom of the popup to save your AI configuration.

### Customizing Prompts

For AI features like "Chat Summary", you can customize the instructions (prompts) given to the AI.

1.  Open the Omni Max popup.
2.  Expand the "Customizable Prompts" section.
3.  You'll see text areas for different AI features (e.g., "Chat Summary Prompt").
4.  Modify the prompt text as desired. Placeholders might be available (e.g., for inserting the chat content automatically - refer to default prompts for examples).
5.  Click "Apply Changes" to save.

### Customizing Shortcut Keys

You can change the letter used for Ctrl+Shift shortcuts.

1.  Open the Omni Max popup.
2.  Expand the "Keyboard Shortcuts" section.
3.  Ensure "Enable All Shortcuts" is active and the specific shortcut module (e.g., "Shortcut: Copy Customer Name") is also enabled.
4.  Next to each shortcut action, there's an input field showing the current key (e.g., "Z" for `Ctrl+Shift+Z`).
5.  Click in the input field and type the new single letter (A-Z) or digit (0-9) you want to use for that shortcut.
6.  Click "Apply Changes" to save.

## Troubleshooting

* **Extension not working:**
    * Ensure Omni Max is enabled in `chrome://extensions`.
    * Ensure the global toggle in the Omni Max popup is "Active".
    * Check if the specific module you want to use is enabled in the popup.
    * Reload the Matrix Go tab after making changes or initial installation.
* **AI features not working / "Models not loading" error / API Key error:**
    * Double-check that you have entered the correct API Key or Base URL for your selected AI provider in the "AI Settings" section of the popup.
    * Ensure your API key is active and has sufficient credits/quota with the provider.
    * For Ollama, ensure your Ollama service is running and accessible at the specified Base URL.
    * Verify your internet connection.
    * Try re-saving your credentials and clicking "Apply Changes".
* **Shortcuts not working:**
    * Ensure "Enable All Shortcuts" is active in the popup.
    * Ensure the specific shortcut module is enabled.
    * Check for conflicts with other Chrome extensions or system-wide shortcuts. Try changing the key in the Omni Max popup.

## Contact & Support

If you encounter bugs, have feature requests, or need help:

* Please check existing [issues on GitHub](https://github.com/DevDeividMoura/omni-max/issues).
* If your issue isn't listed, feel free to [open a new issue](https://github.com/DevDeividMoura/omni-max/issues/new).

---
Made with ❤️ by [@DevDeividMoura](https://github.com/DevDeividMoura)