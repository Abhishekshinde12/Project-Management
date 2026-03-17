# 📋 Project Management API

A production ready role-based **SaaS Project Management API** built with FastAPI — similar in concept to Jira, Linear, or Notion. Supports multi-tenant organizations, projects, tasks, comments, and secure JWT-based authentication with refresh token rotation.


---
## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [FastAPI](https://fastapi.tiangolo.com/) |
| ORM | [SQLModel](https://sqlmodel.tiangolo.com/) (SQLAlchemy + Pydantic) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| Migrations | [Alembic](https://alembic.sqlalchemy.org/) |
| Auth | [python-jose](https://github.com/mpdavis/python-jose) (JWT) |
| Password Hashing | [passlib](https://passlib.readthedocs.io/) + argon |
| Containerization | Docker + Docker Compose |
---


## Features

### 🔐 Authentication
- Register a new user
- Login with email + password — returns **access + refresh tokens** via HTTP-only cookies
- **Refresh token rotation** — new refresh token issued on every refresh
- **Reuse detection** — entire token family revoked if a reused token is detected
- Logout revokes the token family
- All tokens persisted in a `refresh_tokens` table

### 🏢 Organizations
- Any authenticated user can create an organization
- Creator is automatically assigned the `OWNER` role
- Owner can delete the organization
- View all projects under an organization
- Manage members — add, remove, and view members (owner and admin only)

### 📁 Projects
- Owner and admin can create and delete projects
- Any organization member can view projects

### ✅ Tasks
- Any org member can create a task
- Task updates allowed by: task creator, assignee, admin, owner
- Task deletion allowed by: task creator, admin, owner
- Manage task assignees — add/remove (creator, admin, owner only)
- Only org members can be assigned to tasks

### 💬 Comments
- Any org member can comment on a task
- Comment edit/delete allowed by: comment author, admin, owner

### 🛡️ Role-Based Access Control
The API uses a role hierarchy within each organization:
| Role | Permissions |
|---|---|
| `OWNER` | Full access — manage members, projects, tasks, comments, delete org |
| `ADMIN` | Manage members, projects, tasks, comments |
| `MEMBER` | View projects, create/update own tasks, comment on tasks |
---


## Setup & Installation

### Prerequisites - [Docker](https://www.docker.com/) installed

### 1. Clone the repository

```bash
git clone https://github.com/Abhishekshinde12/Project-Management.git
cd Project-Management
```

### 2. Create your environment file
Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the following required variables in .env:
- **DATABASE_PASSWORD** → Database user password (alphanumeric only)
- **ACCESS_TOKEN_SECRET** → Secret key for signing access tokens
- **REFRESH_TOKEN_SECRET** → Secret key for signing refresh tokens

### Generating Secure Secret Keys
- Use the following command to generate strong random secrets: `openssl rand -base64 32` (can run this command directly in linux terminal)
- Run this command twice and assign the generated values to:
    - **ACCESS_TOKEN_SECRET**
    - **REFRESH_TOKEN_SECRET**

### `Do not use the same value for both secrets.`
### You can also update default values for the rest of variables
 
### 3. Start the application

```bash
docker compose up --build
```

This will:
- Spin up the PostgreSQL database container
- Run Alembic migrations automatically
- Start the FastAPI backend and React Frontend

The API will be available at: **http://localhost:8000**

Interactive docs (Swagger UI): **http://localhost:8000/docs**

### 4. Stopping the application

```bash
docker compose down
```

To also remove the database volume (full reset):

```bash
docker compose down -v
```
---


## 📁 Project Structure

```markdown
Project-Management/
├── docker-compose.yml
├── backend/
│   ├── alembic.ini
│   ├── entrypoint.sh   # script to run migrations as soon as DB starts up and before starting backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py # 
│   │   ├── enums.py
│   │   ├── main.py     # Entry Point of Project
│   │   ├── alembic/    # Alembic Migrations
│   │   ├── core/       # JWT auth utilities
│   │   ├── models/     # DB models
│   │   ├── routers/    # API routes
│   │   └── schemas/    # Validation Schemas
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf          # NGINX configuration
│   ├── public/
│   └── src/
│       ├── api/            # API calls
│       ├── components/     # Reusable UI
│       ├── pages/          # App Pages
│       ├── store/          # State Management
│       └── utils/          # Helpers
```
---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).