# Privacy Policy for Omni Max

**Last Updated:** June 25, 2025

This Privacy Policy describes how Omni Max ("we," "us," or "our") handles your information when you use our browser extension. Our core principle is to protect your privacy and process as little data as possible. Omni Max is designed to operate locally on your machine.

## 1. Information We Collect and Store

Omni Max stores all its data locally on your computer using your browser's built-in storage mechanisms (`chrome.storage.sync`, `chrome.storage.local`, and `IndexedDB`). We do **not** have a server, and we do **not** collect, transmit, or view your personal information.

The data stored locally by the extension includes:

* **Configuration Settings:** Your preferences for enabling/disabling modules, shortcut keys, and layout corrections.
* **AI Provider Credentials:** Your API keys (e.g., for OpenAI, Google Gemini) and Base URLs (e.g., for Ollama). This information is stored locally and is only used to communicate directly from your browser to the AI provider you have selected. **These keys are never sent to us or any other third party.**
* **AI Personas:** The custom personas you create, including their names, descriptions, and system prompts.
* **Knowledge Base Documents:** The content of documents you add to your local knowledge base. This data is converted into numerical representations (embeddings) and stored in your browser's IndexedDB for the AI to perform searches.
* **Agent Conversation State:** The history of your interactions with the Omni Max AI assistant is saved locally in your browser's IndexedDB to provide conversation memory for each customer service session.

## 2. How We Use Your Information

The information stored locally is used exclusively to provide the extension's features:

* **API Keys/URLs:** Used to make requests directly to the third-party AI service you have configured (e.g., OpenAI, Google Gemini, Ollama). Your interactions with these services are subject to their respective privacy policies.
* **Knowledge Base Content:** Used locally by the agent to find relevant information and provide contextually-aware answers to your queries.
* **Settings and Personas:** Used to customize the extension's behavior according to your preferences.

## 3. Information Sharing and Disclosure

We do not share, sell, or disclose any of your data with anyone. Since all data is stored locally on your device, you are in full control. The only external communication initiated by the extension is between your browser and the AI provider you have explicitly configured.

## 4. Data Security

We rely on the security mechanisms of your browser's local storage (`chrome.storage` and `IndexedDB`) to protect the information stored on your device.

## 5. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.

## 6. Contact Us

If you have any questions about this Privacy Policy, please open an issue on our GitHub repository:
[https://github.com/DevDeividMoura/omni-max/issues](https://github.com/DevDeividMoura/omni-max/issues)