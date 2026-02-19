# TEDA — Prop Trading Platform

> Clone fidèle de [prop.tedafunded.com](https://prop.tedafunded.com/) — Get Trained, Get Funded.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **Framer Motion**
- **PostgreSQL** + **Prisma**
- **Vercel** (déploiement)

---

## Workflow collaboratif

Ce projet suit un workflow à 3 outils :

| Outil | Rôle | Branche GitHub |
|-------|------|----------------|
| **Claude Code** | Backend, API, Auth, DB, Config | `main` |
| **Lovable** | UI, Composants, Design | `lovable` |
| **GitHub** | Hub central, CI/CD, PRs | — |

> 👉 Lire [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) avant de contribuer.

---

## Développement local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Structure des branches

```
main          ← production-ready (protégée, Claude Code)
lovable       ← Lovable UI updates
feature/xxx   ← features temporaires → merge dans main
```

---

## Documentation

- [Architecture complète](docs/ARCHITECTURE.md)
- [Guide de contribution](.github/CONTRIBUTING.md)
- [Règles de protection des branches](.github/branch-protection.md)
