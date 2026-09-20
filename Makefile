.PHONY: install check db-up dev web down
install:
	npm install
	cd apps/web && npm install
check:
	npm run check
	cd apps/web && npm run build
db-up:
	docker compose up -d postgres
dev:
	npm run dev
web:
	cd apps/web && npm run dev
down:
	docker compose down
