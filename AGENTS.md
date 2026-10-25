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

4. **Code Intelligence with CodeGraph**:
   - OmniServices uses **CodeGraph** (`@colbymchenry/codegraph`) to provide semantic code intelligence and knowledge graph querying for AI agents (Antigravity IDE, Cursor, Claude Code, Gemini CLI, etc.).
   - Rather than crawling and reading dozens of files one-by-one, agents use CodeGraph's local MCP tools (`codegraph_explore`, `codegraph_search`, `codegraph_impact`) to retrieve exact definitions, caller/callee graphs, and impact radiuses in single calls.
   - For detailed setup, MCP tools, and workflow instructions, see [codegraph-guidelines.md](.agent/rules/codegraph-guidelines.md).

5. **Swagger & OpenAPI 3.0 Documentation Standards**:
   - All Swagger annotations and descriptions **MUST be 100% in professional English**.
   - Every API endpoint that can throw exceptions must be documented with `@ApiErrorResponse` or `@ApiErrorResponses` from `@common`.
   - Multi-step workflows (OTP registration, password change, etc.) must define explicit `operationId` and OpenAPI 3.0 `links`.
   - For detailed rules and code examples, see [swagger-openapi-guidelines.md](.agent/rules/swagger-openapi-guidelines.md).

6. **gRPC & Proto File Versioning Strategy**:
   - All `.proto` files must be organized under version subdirectories (e.g. `proto/v1/auth.proto`).
   - Package declarations must explicitly include the version (`package auth.v1;`).
   - Constants must be dynamically composed using domain and version tokens (`buildGrpcPackageName(domain, version)`). Do not hardcode package name strings.
   - For detailed rules and evolution lifecycle, see [grpc-proto-versioning-guidelines.md](.agents/rules/grpc-proto-versioning-guidelines.md).

7. **MCP Todo Task Management**:
   - When receiving a request to handle or process a task on MCP Todo formatted like `todo-99377` (e.g. `todo-<id>`), use the command `omni-todo --help` to learn how to interact with and manage tasks on MCP Todo.
