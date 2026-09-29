.PHONY: install
install:
	pnpm install
	npx -y @colbymchenry/codegraph install

.PHONY: prisma-generate
prisma-generate:
	pnpm run prisma:generate

.PHONY: start-gateway
start-gateway:
	pnpm --filter @omni/gateway run start

.PHONY: start-auth
start-auth:
	pnpm --filter @omni/auth run start

.PHONY: start-user
start-user:
	pnpm --filter @omni/user run start

.PHONY: start-notification
start-notification:
	pnpm --filter @omni/notification run start

.PHONY: build
build:
	pnpm -r run build

.PHONY: lint
lint:
	pnpm run lint

.PHONY: format
format:
	pnpm run format

.PHONY: test
test:
	pnpm run test

.PHONY: test-e2e
test-e2e:
	pnpm run test:e2e

.PHONY: clean
clean:
	rm -rf dist build coverage .nyc_output logs
	rm -rf apps/*/dist apps/*/logs
	rm -rf apps/*/src/generated libs/*/src/generated
	rm -rf node_modules apps/*/node_modules libs/*/node_modules
	rm -rf .pnpm-store *.tsbuildinfo *.log

.PHONY: docker-clean
docker-clean:
	docker compose down -v --remove-orphans

.PHONY: codegraph-sync
codegraph-sync:
	npx -y @colbymchenry/codegraph sync
