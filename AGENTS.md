# Development Guidelines & Rules for AI Agents

## Mandatory Workflow Rules

1. **Lint Check Before Handover**:
   - After making any code changes, **running `make lint` (or `pnpm run lint`) is mandatory** to verify the entire project.
   - Ensure all linting issues (ESLint, TypeScript-ESLint, Prettier) are completely resolved (0 errors, 0 warnings) before handing over the task to the user.

2. **TypeScript & Type Safety**:
   - Avoid implicit `any` types or returning unsafe `any` values (`@typescript-eslint/no-unsafe-*`).
   - Use explicit typing, `unknown`, or safe type assertions when interacting with external libraries (NestJS microservices, RabbitMQ, Express, Supertest).

3. **Import Paths & Base Path Aliases (`@`)**:
   - **All base paths and cross-module import paths MUST use the `@` prefix** (e.g., `@auth/*`, `@gateway/*`, `@common`, `@common/*`, `@/*`).
   - **Do NOT use long relative paths with parent traversals** (e.g. `../../` or `../../../`).
   - Relative imports (`./`) are ONLY acceptable for direct sibling files within the exact same local folder.
   - When adding new apps or shared libraries, always configure their respective `@` aliases in `tsconfig.json`, `nest-cli.json`, and `package.json` (`moduleNameMapper`).
