# Email Manager - CMCAR

## Overview
Email management application for sending personalized HTML emails to company contacts. The app uses Supabase for database and authentication, and Resend for email delivery.

## Features
- Login authentication with session persistence
- Company contact management (from Supabase database)
- Bulk email sending with CSV/TXT file upload
- Personalized email templates with placeholders ([email], [fullname], [phone], [office], [location], [company])
- Email history tracking with real-time updates
- Throttling and warm-up controls for better deliverability
- Live HTML preview

## Project Structure
```
src/
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── EmailForm.tsx    # Email composition form
│   └── EmailHistory.tsx # Email history display
├── integrations/
│   └── supabase/        # Supabase client and types
├── pages/
│   ├── Index.tsx        # Main page with login and dashboard
│   └── NotFound.tsx     # 404 page
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
└── App.tsx              # Root component with routing

supabase/
├── functions/
│   └── send-email/      # Edge function for sending emails via Resend
└── migrations/          # Database schema migrations
```

## Database Schema
### companies table
- id: UUID (primary key)
- company_name: text
- full_name: text
- phone: text (nullable)
- email: text
- office: text (nullable)
- location: text (nullable)

### email_history table
- id: UUID (primary key)
- created_at: timestamp
- subject: text
- html_content: text
- from_address: text
- recipient_email: text
- recipient_name: text (nullable)
- status: text (success/failed)
- error_message: text (nullable)

## Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key
- `RESEND_API_KEY` - Resend API key (for Supabase Edge Function)

## Tech Stack
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS with Shadcn UI components
- Supabase for database and Edge Functions
- Resend for email delivery
- TanStack Query for data fetching
- React Router DOM for routing

## Recent Changes
- November 2025: Migrated from Lovable to Replit environment
- Updated Vite configuration for port 5000 and allowed hosts
- Fixed Supabase types to include companies table
- Added data-testid attributes for testing
- Removed emojis per design guidelines

## Development
Run `npm run dev` to start the development server on port 5000.

## User Preferences
- No emojis in UI
- Clean, professional design
- Simple authentication without external auth providers
