# ElshalflowAI

> Plateforme SaaS d'agents IA — BYOK, Composio, MCP, et Chatbot conversationnel

## 🧠 Architecture

- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** : Next.js API Routes + Server Actions
- **Base de données** : Supabase (PostgreSQL 17)
- **Auth** : NextAuth.js v5 (Auth.js) avec Supabase Adapter
- **LLM** : OpenRouter SDK + AI SDK (streaming)
- **Déploiement** : Vercel

## 🚀 Démarrage rapide

```bash
# Installation
npm install

# Copier les variables d'environnement
cp .env.example .env.local
# Remplir les variables dans .env.local

# Lancer en développement
npm run dev
```

## 📁 Structure

```
src/
├── app/                    # Pages & API Routes (App Router)
│   ├── (auth)/             # Login / Register
│   ├── (dashboard)/        # Interface principale
│   │   ├── chat/           # Chatbot conversationnel
│   │   ├── byok/           # Gestion des clés API LLM
│   │   ├── composio/       # Connecteurs Composio
│   │   └── mcp/            # Serveurs MCP
│   └── api/                # Route Handlers
├── components/             # Composants React
├── lib/                    # Logique métier
├── hooks/                  # Hooks React personnalisés
└── types/                  # Types TypeScript
```

## 🔑 Modules

### BYOK (Bring Your Own Key)
Gestion sécurisée des clés API LLM personnelles (OpenRouter, OpenAI, Anthropic, etc.)

### Composio
Intégration avec l'API Composio pour connecter des apps tierces (Gmail, Slack, GitHub, etc.)

### MCP (Model Context Protocol)
Ajout et configuration de serveurs MCP pour étendre les capacités de contexte

### Chatbot
Interface conversationnelle avec streaming, sélection de modèle, et historique
