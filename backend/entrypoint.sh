#!/bin/bash
set -e

echo "Waiting for database..."
while ! nc -z $DATABASE_HOST $DATABASE_PORT; do
  sleep 1
done
echo "Database is up!"

echo "Running migrations..."
alembic -c alembic.ini upgrade head

echo "Starting server..."
fastapi run