# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend 


### Python Voice Agent
- `python -m pip install -r requirements.txt` - Install Python dependencies
- `python setup.py` - Setup Python environment
- `python zora_agent.py start` - Start the voice agent
- `python test_calcom_api.py` - Test Cal.com API integration

## Architecture Overview

This is a bilingual (French/English) AI voice assistant platform combining:

1. **React Web Interface** (`src/`) - Dashboard for managing voice assistants
2. **Python Voice Agent** (`zora_agent.py`) - LiveKit-based voice processing
3. **Supabase Backend** (`supabase/`) - Database and Edge Functions
4. **Third-party Integrations** - Twilio, Cal.com, ElevenLabs, OpenAI

### Key Components

- **Assistant Management** (`src/components/Assistants/`) - Create and configure AI assistants
- **Phone Number Management** (`src/components/Assistants/NumberManagement.tsx`) - Twilio phone number provisioning
- **Voice Processing** (`zora_agent.py`) - Real-time voice conversation handling
- **Calendar Integration** (`calendar_api.py`) - Cal.com appointment booking

### Database Schema (Supabase)

Primary tables:
- `assistants` - AI assistant configurations (name, prompt, voice_id, tools_config)
- `phone_numbers` - Twilio phone numbers linked to assistants
- `sip_trunks` - SIP trunk configurations for voice routing

**Important Development Note:**
To unblock a critical development workflow, Row Level Security (RLS) has been **temporarily disabled** on the `assistants` and `phone_numbers` tables. Additionally, a static `user_id` (`00000000-0000-0000-0000-000000000001`) is used when creating new assistants.

**This is a temporary measure.** The next major step before production is to implement full Supabase Authentication and re-enable RLS with proper user-based policies.

### Tech Stack

- **Frontend**: 
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Voice AI**: LiveKit Agents + OpenAI GPT-4o-mini + ElevenLabs + Deepgram
- **Telephony**: Twilio SIP Trunks
- **Calendar**: Cal.com API

### File Structure

```
src/
├── components/
│   ├── Assistants/           # Assistant management UI
│   ├── Dashboard/           # Analytics and stats
│   └── ui/                  # shadcn/ui components
├── pages/                   # Main application pages
├── services/                # API service layers
└── integrations/supabase/   # Supabase client and types

supabase/
├── functions/               # Edge Functions for API integrations
└── migrations/             # Database schema changes
```

### Environment Variables

Frontend (auto-configured):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Backend secrets (stored in Supabase):
- `ELEVENLABS_API_KEY`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `CAL_COM_API_KEY`

### Path Aliases

- `@/` maps to `./src/` (configured in vite.config.ts and tsconfig.json)

### TypeScript Configuration

- Relaxed settings for rapid development (noImplicitAny: false, strictNullChecks: false)
- Path aliases configured for clean imports
- Database types auto-generated in `src/integrations/supabase/types.ts`

### Voice Agent Architecture

The voice agent (`zora_agent.py`) handles:
- Real-time speech-to-text (Deepgram)
- LLM conversation processing (OpenAI)
- Text-to-speech synthesis (ElevenLabs)
- Calendar booking logic (Cal.com API)
- Call routing and management (Twilio SIP)
