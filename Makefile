create-key:
	openssl rand -base64 756 > replica.key

start-prod:
	docker compose -f docker-compose.prod.yml --env-file .docker.env up -d