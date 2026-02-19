# GitHub Branch Protection Rules

> ⚙️ À configurer manuellement sur GitHub : **Settings → Branches → Add rule**

## Branche `main` (protégée)

```
Branch name pattern: main

☑ Require a pull request before merging
  ☑ Require approvals: 1
  ☑ Dismiss stale pull request approvals when new commits are pushed

☑ Require status checks to pass before merging
  Required checks:
  → "Build & Type Check" (CI workflow)

☑ Require branches to be up to date before merging

☑ Do not allow bypassing the above settings

☐ Allow force pushes    ← DÉSACTIVÉ
☐ Allow deletions       ← DÉSACTIVÉ
```

## Branche `lovable` (semi-protégée)

```
Branch name pattern: lovable

☑ Require status checks to pass before merging
  Required checks:
  → "Build & Type Check" (CI workflow)

☑ Allow Lovable app to push directly
☐ Require pull request   ← Lovable a besoin de push direct
```

---

## Labels GitHub à créer

| Label | Couleur | Usage |
|-------|---------|-------|
| `backend` | `#0075ca` | Tâche backend/Claude |
| `lovable` | `#e4e669` | Tâche UI/Lovable |
| `ui` | `#d93f0b` | Changement visuel |
| `bug` | `#ee0701` | Bug |
| `priority: high` | `#b60205` | Urgence |
| `priority: low` | `#0e8a16` | Pas urgent |

---

## Connecter Lovable à GitHub

1. Aller sur **lovable.dev** → votre projet
2. Settings → **GitHub Integration**
3. Connecter le repo `julesrenesson/teda-prop` (ou le nom de votre repo)
4. Sélectionner la branche **`lovable`** (pas `main`)
5. Lovable pushe ses changements sur `lovable` → GitHub Actions crée la PR auto
