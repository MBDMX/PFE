# GMAO Platform

Plateforme GMAO (Gestion de Maintenance Assistée par Ordinateur) — PFE.

## Structure

```
gmao-platform/
├── frontend/        (Next.js 16 — TypeScript + Tailwind)
├── backend/         (Node.js / Express — données mockées)
├── database/        (schema.sql + seed.sql)
└── docker-compose.yml
```

## Lancer en développement local

```bash
# Frontend
cd frontend && npm install && npm run dev
# → http://localhost:3000

# Backend (optionnel, le frontend utilise des données mockées)
cd backend && npm install && node index.js
# → http://localhost:4000
```

## Lancer avec Docker (recommandé pour le travail en équipe)

> Pré-requis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé

```bash
# Depuis la racine du projet
docker compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:4000
```

```bash
# Arrêter
docker compose down
```

## Identifiants de test

| Rôle           | Identifiant | Mot de passe |
|----------------|-------------|--------------|
| Administrateur | admin       | admin123     |
| Responsable    | manager     | mgr123       |
| Technicien     | tech1       | tech123      |

## Stack technique

| Couche    | Technologie          |
|-----------|----------------------|
| Frontend  | Next.js 16, TypeScript, Tailwind CSS, Recharts |
| Backend   | Node.js, Express.js  |
| Base de données | SQL (schema + seed) |
| Conteneurisation | Docker, Docker Compose |
