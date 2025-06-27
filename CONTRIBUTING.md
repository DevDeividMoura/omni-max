# Contributing to Omni Max

First off, thank you for considering contributing to Omni Max! It's people like you that make the open-source community such an amazing place. We welcome any contribution, from fixing a typo to implementing a whole new feature.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Development Setup](#development-setup)
- [Git Workflow and Pull Requests](#git-workflow-and-pull-requests)
- [Coding Style and Principles](#coding-style-and-principles)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Testing](#testing)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please ensure the bug was not already reported by searching on GitHub under [Issues](https://github.com/DevDeividMoura/omni-max/issues). If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/DevDeividMoura/omni-max/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample or an executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

If you have an idea for a new feature or an improvement to an existing one, please open an issue to discuss it. This allows us to coordinate our efforts and prevent duplication of work.

### Your First Code Contribution

Unsure where to begin contributing to Omni Max? You can start by looking through `good-first-issue` and `help-wanted` issues.

## Development Setup

To get the project running locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/DevDeividMoura/omni-max.git](https://github.com/DevDeividMoura/omni-max.git)
    cd omni-max
    ```

2.  **Install dependencies:** We use `npm` for package management.
    ```bash
    npm install
    ```

3.  **Run in development mode:** This command will build the extension and watch for changes.
    ```bash
    npm run build
    ```

4.  **Load the unpacked extension in Chrome:**
    -   Open Chrome and navigate to `chrome://extensions`.
    -   Enable "Developer mode".
    -   Click "Load unpacked".
    -   Select the `dist` directory from the project folder.

## Git Workflow and Pull Requests

We use the **Gitflow** workflow. All development for new features and bugfixes should happen on branches created from the `develop` branch.

1.  Create a feature branch from `develop`: `git checkout -b feature/your-awesome-feature develop`
2.  Make your changes and commit them.
3.  Push your feature branch to GitHub: `git push origin feature/your-awesome-feature`
4.  Open a Pull Request from your feature branch to the `develop` branch.
5.  Please use the provided [Pull Request template](/.github/PULL_REQUEST_TEMPLATE.md).

## Coding Style and Principles

We strive to maintain a high-quality codebase. Please adhere to these principles:

-   **Clean Code:** Write code that is easy to read and understand.
-   **SOLID Principles:** Follow SOLID principles for object-oriented design.
-   **Modularity:** Keep components and services focused on a single responsibility.
-   **Documentation:** Use TSDoc/JSDoc-style `docstrings` for all public functions, classes, and types. Use inline comments only for critical or complex logic that cannot be made self-evident.

## Commit Message Guidelines

We use **Conventional Commits** with emojis to make our commit history clear and to automate releases. Please follow the format: `type: <emoji> message`.

Refer to the emoji guide in our project's main persona description for the correct emoji and type.

**Example:**

```
feat: ✨ add AI persona management
fix: 🐛 correct DOM selector for customer name
docs: 📝 update user guide for knowledge base
```

## Testing

-   Add unit tests for any new logic or service.
-   Ensure all existing tests pass by running `npm run test`.
-   Our CI pipeline will run these tests automatically on your PR.

Thank you again for your interest in contributing!