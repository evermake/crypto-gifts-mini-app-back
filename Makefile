start-prod:
	docker compose -f docker-compose.prod.yml --env-file .docker.env up -d

stop-prod:
	docker compose -f docker-compose.prod.yml down

stop-prod-vol:
	docker compose -f docker-compose.prod.yml down -v
