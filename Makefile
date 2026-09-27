.PHONY: install
install:
	pnpm install

.PHONY: build
build:
	pnpm run build

.PHONY: build-gateway
build-gateway:
	pnpm run build:gateway

.PHONY: build-auth
build-auth:
	pnpm run build:auth

.PHONY: dev
dev:
	pnpm run start:gateway

.PHONY: start-gateway
start-gateway:
	pnpm run start:gateway

.PHONY: start-auth
start-auth:
	pnpm run start:auth

.PHONY: start-prod
start-prod:
	pnpm run start:prod

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
	pnpm exec jest --config ./apps/gateway/test/jest-e2e.json
	pnpm exec jest --config ./apps/auth/test/jest-e2e.json

.PHONY: clean
clean:
	rm -rf dist

.PHONY: docker-clean
docker-clean:
	docker compose down -v --remove-orphans

