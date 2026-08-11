# spendx — one entry point for the dev loop. See README.md.
#
# The Expo app is deliberately absent from `dev`: its CLI is interactive and
# wants its own terminal. Run `make mobile` there.

COMPOSE ?= podman compose
BACKEND := backend
MOBILE := mobile

.DEFAULT_GOAL := help
.PHONY: help setup hooks up down logs psql db-ensure-test migrate seed db-reset \
        dev mobile openapi api-types contract-check lint typecheck test test-backend \
        test-mobile check clean

help: ## Show this help
	@grep -hE '^[a-z][a-z-]*:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## --- setup ---------------------------------------------------------------

setup: hooks ## Install dependencies in both apps and wire git hooks
	@command -v node >/dev/null || { echo "node not found — install Node $$(cat .nvmrc) (nvm use)"; exit 1; }
	npm --prefix $(BACKEND) ci
	npm --prefix $(MOBILE) ci
	@test -f $(BACKEND)/.env || cp $(BACKEND)/.env.example $(BACKEND)/.env
	@echo "Ready. Next: make dev (and make mobile in another terminal)."

hooks: ## Point git at the checked-in hooks in .githooks/
	git config core.hooksPath .githooks
	@echo "core.hooksPath = .githooks"

## --- stack ---------------------------------------------------------------

up: ## Start backing services and wait until healthy
	@$(COMPOSE) ls >/dev/null 2>&1 || { \
		echo "compose cannot reach a container runtime."; \
		echo "With podman, enable the API socket once:"; \
		echo "    systemctl --user enable --now podman.socket"; \
		exit 1; \
	}
	$(COMPOSE) up -d --wait
	@$(MAKE) --no-print-directory db-ensure-test

down: ## Stop backing services (data survives in the pgdata volume)
	$(COMPOSE) down

logs: ## Tail service logs
	$(COMPOSE) logs -f

psql: ## Open a psql shell on the development database
	$(COMPOSE) exec postgres psql -U spendx -d spendx

db-ensure-test: ## Create the spendx_test database if the volume predates the init script
	@$(COMPOSE) exec -T postgres psql -U spendx -d postgres -tAc \
		"SELECT 1 FROM pg_database WHERE datname='spendx_test'" | grep -q 1 \
		|| $(COMPOSE) exec -T postgres createdb -U spendx -O spendx spendx_test

## --- database ------------------------------------------------------------

migrate: ## Apply pending migrations to the development database
	npm --prefix $(BACKEND) run db:migrate:deploy

seed: ## Load the deterministic development dataset
	npm --prefix $(BACKEND) run db:seed

db-reset: up ## Drop, recreate, migrate and reseed the development database
	npm --prefix $(BACKEND) run db:reset

## --- running -------------------------------------------------------------

dev: up migrate ## Start services, migrate, then run the API in watch mode
	npm --prefix $(BACKEND) run start:dev

mobile: ## Start the Expo dev server (own terminal — it needs a TTY)
	npm --prefix $(MOBILE) start

## --- contract ------------------------------------------------------------

openapi: ## Regenerate backend/openapi.json from the running app's Swagger document
	npm --prefix $(BACKEND) run openapi:generate

api-types: ## Regenerate mobile API types from backend/openapi.json
	npm --prefix $(BACKEND) run api:types

contract-check: openapi api-types ## Fail if the committed contract artifacts are stale
	@git diff --quiet -- $(BACKEND)/openapi.json $(MOBILE)/src/api/schema.d.ts || { \
		echo "Contract artifacts are stale. Run 'make openapi api-types' and commit the result:"; \
		git --no-pager diff --stat -- $(BACKEND)/openapi.json $(MOBILE)/src/api/schema.d.ts; \
		exit 1; \
	}

## --- quality -------------------------------------------------------------

lint: ## Lint both apps
	npm --prefix $(BACKEND) run lint
	npm --prefix $(MOBILE) run lint

typecheck: ## Typecheck both apps
	npm --prefix $(BACKEND) run typecheck
	npm --prefix $(MOBILE) run typecheck

test-backend: up ## Run the backend unit and integration suites
	npm --prefix $(BACKEND) test
	npm --prefix $(BACKEND) run test:e2e

test-mobile: ## Run the mobile unit tests
	npm --prefix $(MOBILE) test

test: test-backend test-mobile ## Run every test

check: lint typecheck contract-check test ## Everything CI runs

clean: ## Remove containers and the database volume (destroys local data)
	$(COMPOSE) down -v
