# Crypto Flow Admin

An administrative panel for managing users, trades, and platform operations.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Database, Authentication, Real-time subscriptions)
- **State Management**: TanStack React Query
- **Routing**: React Router v6

## Features

- User management and authentication
- Trade management and monitoring
- Admin role management
- Balance and recharge code management
- Withdrawal request processing
- Real-time notifications
- Contact and user messaging

## Getting Started

### Prerequisites

- Node.js 18+ (recommended via [nvm](https://github.com/nvm-sh/nvm))
- npm or yarn

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations (Supabase)
├── lib/            # Utility functions
├── pages/          # Page components
└── main.tsx        # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

Proprietary
