# Contributing to CraftControl

Thank you for your interest in contributing to **CraftControl**! 
This document defines the strict rules and workflows that all developers must follow to maintain a high standard of quality across the project.

## 1. Golden Rule: Mandatory Git Flow

CraftControl strictly follows the **Git Flow** branching model. Direct commits or direct merges to the `main` branch are strictly prohibited.

- `main`: Contains only stable, production-ready code.
- `develop`: The main integration branch. All new features branch off from here.
- `feature/*`: Branches for developing new features (e.g., `feature/i18n-support`).
- `hotfix/*`: Branches for fixing critical production bugs that branch off from `main`.

**Daily Workflow:**
1. Create your branch from `develop`: `git checkout -b feature/my-new-feature develop`
2. Write your code and make logical commits.
3. Push your branch: `git push origin feature/my-new-feature`
4. Open a Pull Request targeting `develop`.

## 2. Clean Code Rules

Code quality is non-negotiable. All code must be human-readable and highly optimized.

- **0 Comments (Self-Documenting Code):** Your code must explain itself. Name your functions and variables so well that a comment becomes unnecessary. Comments are only permitted in highly obscure configurations or complex regular expressions.
- **Early Returns (No Nested Ifs):** Avoid "arrow-shaped code". Use guard clauses (`early returns`) to handle error cases at the beginning of functions.
- **Clear Naming Conventions:** Use `camelCase` for variables and functions, and `PascalCase` for React Components and Classes. Always use descriptive names in English (e.g., `fetchServerLogs` instead of `getLogs`).
- **Clean Test Files:** Cypress E2E test files must not have blank lines between sequential commands of the same nature (e.g., consecutive `cy.get` calls) and must not chain unnecessary line breaks.

## 3. Pull Requests and CI/CD Checks

Before a Pull Request can be merged into `develop` or `main`, it must successfully pass our GitHub Actions pipeline.

### Automated Checks
1. **Security Scan:** Analyzes vulnerabilities and exposed credentials in the code.
2. **ESLint & Prettier:** Code must be correctly formatted and free of syntax errors or anti-patterns.
3. **Cypress E2E (UI Testing):** Our entire E2E suite must pass at 100%. This includes complete flows for server creation, authentication, plugins, logs, etc. *Note:* Never hardcode or expose the port directly; rely on dynamic port handling (`PORT=0`) in CI to prevent `EADDRINUSE` failures.

### Pull Request Format
You must use our mandatory [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) to describe the changes made, which issue it closes, and what tests you manually ran. Every PR must be reviewed by at least 1 code owner before being merged.
