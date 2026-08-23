# Contributing to Gea Ecosystem

Thank you for your interest in contributing to the Gea ecosystem! We welcome all contributions that help make Gea simpler, lighter, and more reliable.

## Core Philosophies

Before opening an issue or a pull request, please keep our core tenets in mind across all packages:

1. **Zero Hooks**: We strictly adhere to Gea's Class-based, Object-Oriented design. Do not introduce functional components, hooks (`use~`), or implicit reactive magic.
2. **Zero Dependencies**: Keep the bundle size microscopic. Do not install external libraries without an extensive architectural debate.
3. **Explicit over Implicit**: Resource management (cleanups, event listeners, focus traps, intervals) must be explicit and deterministic.

## Development Setup

This repository is managed as a Monorepo using `pnpm` workspaces.

```bash
# Clone the repository
git clone [https://github.com/KoHaRxnP/geasc.git](https://github.com/KoHaRxnP/geasc.git)
cd geasc

# Install all dependencies across the workspace
pnpm install

# Run tests across all packages
pnpm test

# Typecheck all packages
pnpm typecheck

```

### Working on Specific Packages

You can run scripts for a specific package from the root using `--filter`:

```bash
# Example: Build or test only the a11y package
pnpm --filter ./ecosystems/a11y test

```

## Pull Request Guidelines

1. **Branch Naming**: Use clear naming like `feat/feature-name` or `fix/bug-name`.
2. **Clean TypeScript**: Adhere to the strict TypeScript rules configured in the project.
3. **Ensure No Memory Leaks**:
* Verify all global listeners (`window`, `document`), intervals, or state stacks (e.g., `trapStack`) are flawlessly cleaned up in `destroy()` or designated cleanup methods.


4. **Write Tests**: Ensure your changes are covered by unit tests using Vitest (especially for keyboard interactions, focus traps, or async resources).
5. **Update Documentation**: Update relevant `README.md` files or docs if you modify any public APIs.

## Code of Conduct

Be respectful, collaborative, and focused on maintaining high-quality code. Let's build the best ecosystem for Gea together!