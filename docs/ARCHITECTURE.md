# TEDA — Architecture du projet

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Auth | Custom (JWT / session) |
| DB | PostgreSQL + Prisma |
| Deploy | Vercel |
| UI Tool | Lovable |
| Backend Tool | Claude Code |

---

## Structure des dossiers

```
verticalprop-clone/
├── src/
│   ├── app/
│   │   ├── (auth)/          ← Login, Register [Claude + Lovable]
│   │   ├── dashboard/       ← Dashboard app [Lovable UI + Claude API]
│   │   ├── api/             ← API Routes [Claude ONLY]
│   │   ├── layout.tsx       ← Root layout [Claude]
│   │   └── globals.css      ← Global styles [Claude]
│   │
│   ├── components/
│   │   ├── landing/         ← Landing page sections [Lovable]
│   │   ├── dashboard/       ← Dashboard components [Lovable]
│   │   ├── ui/              ← Design system primitives [Lovable]
│   │   └── layout/          ← Sidebar, nav [Claude + Lovable]
│   │
│   ├── lib/
│   │   ├── auth-context.tsx ← Auth state [Claude]
│   │   ├── db.ts            ← DB client [Claude]
│   │   └── utils.ts         ← Shared utils [Claude]
│   │
│   └── types/               ← TypeScript types [Claude]
│
├── prisma/
│   ├── schema.prisma        ← DB schema [Claude ONLY]
│   └── migrations/          ← Auto-generated [Claude]
│
├── public/
│   └── landing/             ← Static assets [Lovable]
│
├── .github/
│   ├── workflows/           ← CI/CD [Claude]
│   └── CONTRIBUTING.md      ← Ce document
│
└── docs/                    ← Documentation [Claude]
```

---

## Flux de données

```
User Browser
    ↓ HTTP
Next.js App Router
    ↓
├── Server Components  ← data fetching direct DB
├── Client Components  ← UI interactif
└── API Routes         ← mutations, auth, webhooks
         ↓
    PostgreSQL (Prisma)
```

---

## Variables d'environnement

```bash
# .env.local (jamais committé)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# .env.example (committé, sans valeurs)
DATABASE_URL=postgresql://user:password@localhost:5432/teda
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

---

## Pages actuelles

| Route | Description | Responsable |
|-------|-------------|-------------|
| `/` | Landing page | Lovable |
| `/login` | Connexion | Lovable + Claude |
| `/register` | Inscription | Lovable + Claude |
| `/dashboard/overview` | Vue d'ensemble | Lovable |
| `/dashboard/analytics` | Analytics | Lovable |
| `/dashboard/competitions` | Compétitions | Lovable |
| `/dashboard/leaderboard` | Classement | Lovable |
| `/dashboard/calendar` | Calendrier | Lovable |
| `/dashboard/payouts` | Paiements | Lovable + Claude |
| `/dashboard/affiliate` | Affiliation | Lovable + Claude |
| `/dashboard/settings` | Paramètres | Lovable + Claude |
| `/dashboard/admin/**` | Admin | Claude |
| `/trade` | Trading view | Lovable + Claude |
| `/help` | Académie | Lovable |
| `/api/**` | API Routes | Claude ONLY |
