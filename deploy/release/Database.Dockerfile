# Same sample initialization as the existing local stack. Runs ONLY on an empty volume.
FROM mysql:8.0
COPY database/init/ /docker-entrypoint-initdb.d/
