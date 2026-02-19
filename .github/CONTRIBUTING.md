# Contributing to TEDA — Collaboration Guide

## Architecture des branches

```
main                  ← Claude Code (backend, API, DB, auth, config)
lovable               ← Lovable (UI, composants, design)
feature/xxx           ← Features temporaires (mergées dans main ou lovable)
```

---

## 🔵 Règle #1 — Qui touche quoi

### Claude Code (branche `main`)
| Zone | Fichiers |
|------|----------|
| API Routes | `src/app/api/**` |
| Auth | `src/lib/auth*`, `src/middleware.ts` |
| DB / Prisma | `prisma/**`, `src/lib/db*` |
| Types globaux | `src/types/**` |
| Config | `next.config.*`, `tailwind.config.*`, `tsconfig.json`, `.env*` |
| Layout racine | `src/app/layout.tsx`, `src/app/globals.css` |
| Logic métier | `src/lib/**` (non-UI) |

### Lovable (branche `lovable`)
| Zone | Fichiers |
|------|----------|
| Pages UI | `src/app/(dashboard)/**`, `src/app/(landing)/**` |
| Composants | `src/components/**` |
| Styles locaux | CSS modules dans les composants |
| Assets | `public/**` |

---

## 🔴 Règle #2 — Jamais de merge direct

```
❌ lovable → main  (merge direct)
✅ lovable → PR → review → merge dans main
```

Tout changement de Lovable vers `main` passe par une **Pull Request**.

---

## 🟢 Règle #3 — Workflow Claude Code

```bash
# 1. Toujours partir de main à jour
git checkout main && git pull

# 2. Créer une feature branch
git checkout -b feature/nom-feature

# 3. Coder + commit
git add src/app/api/... src/lib/...
git commit -m "feat: description courte"

# 4. Push + PR vers main
git push origin feature/nom-feature
# → ouvrir PR sur GitHub → merge squash
```

---

## 🟠 Règle #4 — Workflow Lovable

1. Lovable travaille sur la branche **`lovable`**
2. Chaque session Lovable → 1 PR vers `main`
3. La PR est reviewée avant merge
4. Après merge, Lovable rebase sur `main` :
   ```bash
   git checkout lovable && git rebase main
   ```

---

## 🏷️ Convention de commits

```
feat:     nouvelle fonctionnalité
fix:      correction de bug
ui:       changement purement visuel (Lovable)
api:      changement d'API route
db:       migration ou schema DB
config:   configuration, env, tooling
docs:     documentation
```

---

## ⚡ Synchro rapide

### Claude → met à jour le backend
```bash
git checkout main
# ... modifications ...
git push origin main
# Lovable se rebase automatiquement via GitHub Actions
```

### Lovable → pousse du UI
```
Lovable pousse sur branche lovable
→ GitHub Actions crée une PR auto vers main
→ Review + merge
```
