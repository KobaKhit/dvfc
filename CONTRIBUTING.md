# Contributing to Data Viz Factory (dvfc)

Thank you for your interest in contributing to Data Viz Factory! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- [uv](https://docs.astral.sh/uv/) (for Python SDK, preferred over pip)
- Python 3.9+ (for Python SDK)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/KobaKhit/dvfc.git
cd dvfc

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test

# Python SDK (uv)
cd python && uv sync --extra dev && uv run pytest -q && cd ..

# Run dogfood script
pnpm dogfood
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes

- Write code following existing patterns
- Add tests for new features
- Update documentation as needed
- Run `pnpm run build` frequently

### 3. Test Your Changes

```bash
# Unit tests
pnpm test

# Validate examples
dvfc validate examples/sales-board/sales.dash.yaml

# Build example
dvfc build examples/sales-board/sales.dash.yaml -o /tmp/test-build

# Full dogfood suite
pnpm dogfood
```

### 4. Commit

Use conventional commit messages:

```bash
git commit -m "feat: add histogram chart type"
git commit -m "fix: resolve display key edge case"
git commit -m "docs: update installation guide"
git commit -m "chore: update dependencies"
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Link to any related issues
- Screenshots/examples if applicable

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Run `tsc` with no errors
- Export types for public APIs
- Add JSDoc comments for exported functions

### Python

- Follow PEP 8 style guide
- Use type hints
- Run `black` for formatting
- Use Pydantic for data validation

### Testing

- Add unit tests for new features
- Ensure all existing tests pass
- Add integration tests for end-to-end flows
- Test examples build successfully

## Project Structure

```
dvfc/
├── packages/
│   ├── core/          # Core types and schemas
│   ├── cli/           # CLI tool (dvfc binary)
│   ├── charts/        # Chart discovery
│   ├── dbt-adapter/   # dbt integration
│   ├── mcp/           # MCP server
│   └── adapter-*/     # SQLMesh, Bruin adapters
├── python/            # Python SDK
├── examples/          # Example dashboards
├── docs/              # Documentation
└── scripts/           # Build/test scripts
```

## Adding Features

### New Chart Type

1. Add type to `ChartType` enum in `packages/core/src/types.ts`
2. Implement generator in `packages/cli/src/generator.ts`
3. Add JSON Schema definition
4. Create example in `examples/`
5. Update documentation

### New Data Source Type

1. Add type to `DataSource` type in `packages/core/src/types.ts`
2. Implement resolver in CLI commands
3. Update validators
4. Add example
5. Document usage

### New MCP Tool

1. Add tool schema to `packages/mcp/src/server.ts`
2. Implement handler function
3. Update docs/mcp-cursor.md
4. Add to dogfood checklist
5. Update agent skill

## Documentation

- Update README.md for user-facing changes
- Update STATUS.md for feature completion
- Add entries to CHANGELOG.md
- Update package-specific READMEs
- Add inline code comments for complex logic

## Testing Guidelines

### What to Test

- Core functionality (validate, build, preview)
- Chart discovery (search, get, compose)
- dbt integration (manifest parsing, ref resolution)
- Edge cases (empty boards, missing data, invalid specs)

### Test Organization

```bash
# Unit tests
packages/charts/test/*.test.js

# Integration tests via dogfood
scripts/dogfood.sh

# Example validation
dvfc validate examples/*/*.dash.yaml
```

## Bug Reports

When reporting bugs, include:

1. **Description**: What happened vs what you expected
2. **Steps to Reproduce**: Minimal example
3. **Environment**: OS, Node version, pnpm version
4. **Error Messages**: Full stack traces
5. ***.dash.yaml**: If applicable, a minimal board spec

## Feature Requests

When requesting features:

1. **Use Case**: Why you need this feature
2. **Proposal**: How it should work
3. **Examples**: Mock YAML or code
4. **Alternatives**: Other solutions you've considered

## Code Review Process

### For Contributors

- Respond to review comments promptly
- Update PR based on feedback
- Keep PRs focused and small
- Rebase if requested

### For Reviewers

- Be respectful and constructive
- Suggest alternatives
- Approve when ready
- Test changes locally if possible

## Release Process

Maintainers follow this process:

1. Update version in all packages
2. Update CHANGELOG.md
3. Run full test suite
4. Build all packages
5. Tag release: `git tag v0.X.0`
6. Publish to npm and PyPI (see docs/PUBLISHING.md)
7. Create GitHub release

## Architecture Principles

1. **Compose, Don't Compete**: Use Mosaic for coordination, don't build custom engines
2. **Declarative First**: YAML specs, not imperative code
3. **dbt Native**: First-class dbt integration
4. **Static Export**: No backend required for dashboards
5. **Progressive Enhancement**: Start simple, add complexity as needed

## Need Help?

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email maintainers (see SECURITY.md)
- **Chat**: Join Discord (if available)

## License

By contributing, you agree that your contributions will be licensed under Apache-2.0.

---

**Thank you for contributing to Data Viz Factory!** 🎉
