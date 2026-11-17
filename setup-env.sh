#!/usr/bin/env bash

set -e

ENV_FILE=".env"

echo "=== Study Room Reservation .env Setup ==="

# 1. Check if .env already exists
if [ -f "$ENV_FILE" ]; then
  read -rp "A $ENV_FILE file already exists. Do you want to overwrite it? (y/N): " overwrite
  if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
    echo "Aborted. Existing $ENV_FILE was not modified."
    exit 0
  fi
fi

echo ""

# 2. Ask for Postgres Username and Database Name
read -rp "Enter POSTGRES_USER [e.g. study_admin]: " pg_user
pg_user=${pg_user:-study_admin}

read -rp "Enter POSTGRES_DB [e.g. study_reservations]: " pg_db
pg_db=${pg_db:-study_reservations}

# 3. Password options: Manual entry or Auto-generate
echo ""
echo "How would you like to set POSTGRES_PASSWORD?"
echo "  1) Generate a strong random password (Recommended)"
echo "  2) Enter a password manually"
read -rp "Choose an option: " pass_choice
pass_choice=${pass_choice:-1}

if [ "$pass_choice" == "2" ]; then
  while true; do
    read -rsp "Enter POSTGRES_PASSWORD: " pg_pass
    echo ""
    if [ -n "$pg_pass" ]; then
      break
    fi
    echo "Password cannot be empty. Please try again."
  done
else
  # Generate a 24-character URL-safe alphanumeric password
  pg_pass=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
  echo "Generated strong password."
fi

# 4. Ask for Ports (Press Enter to keep defaults)
echo ""
read -rp "Enter DB_PORT[default: 5432]: " db_port
db_port=${db_port:-5432}

read -rp "Enter BACKEND_PORT[default: 3000]: " backend_port
backend_port=${backend_port:-3000}

read -rp "Enter FRONTEND_PORT[default: 5173]: " frontend_port
frontend_port=${frontend_port:-5173}

# Automatically align VITE_API_URL with the chosen BACKEND_PORT
default_vite_url="http://localhost:${backend_port}"
read -rp "Enter VITE_API_URL [$default_vite_url]: " vite_api_url
vite_api_url=${vite_api_url:-$default_vite_url}

# 5. Write values to .env
cat <<EOF >"$ENV_FILE"
POSTGRES_USER=${pg_user}
POSTGRES_PASSWORD=${pg_pass}
POSTGRES_DB=${pg_db}

DB_PORT=${db_port}
BACKEND_PORT=${backend_port}
FRONTEND_PORT=${frontend_port}
VITE_API_URL=${vite_api_url}
EOF

echo ""
echo "Successfully generated $ENV_FILE!"
