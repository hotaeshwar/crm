# Monk CRM - Codebase Development Rules

These rules are for any assistant developer working on the Monk CRM project. Always adhere to these standards when creating or modifying files in this workspace.

## Tech Stack & Constraints

1. **Vite + React (V19)**: Build UI using functional components, standard React hooks (`useState`, `useEffect`, `useMemo`, `useRef`), and type safety where appropriate.
2. **Tailwind CSS v4**: All styles must use standard utility classes from Tailwind v4. Prefer gradients, sleek shadows, modern borders, custom rounded layouts, and micro-interactions.
3. **Lucide React Icons**: Use Lucide icons for all UI iconography.
4. **Firebase Firestore & Auth**: Use Firebase client-side SDK for user session management and live data listeners (`onSnapshot`). Ensure offline persistence remains enabled.

## Design & Aesthetics

1. **Premium Appearance**: Always aim for a visually stunning design. Use curated color palettes (indigo, slate, teal, emerald, sky, and amber), glassmorphism styles, subtle hover scale transitions, and rounded layouts (`rounded-2xl`).
2. **Component Structure**: Keep components modular, self-contained, and reusable. Avoid putting too much CSS or layout logic inside `App.jsx`. Use discrete files in `src/components/`.

## Naming Conventions

- **Components**: Use PascalCase (e.g. `LeadPipeline.jsx`, `UnifiedCalendar.jsx`).
- **Collections & Fields**: Stored database fields should be camelCase (e.g. `representative`, `contactInfo`, `followUpDate`). Keep collection names plural (e.g. `leads`, `clients`, `projects`, `calendar_events`).

## Firestore Syncing

- Utilize live database listeners (`onSnapshot`) to update local states in real-time, especially for multi-stage boards (Leads Pipeline) and schedules (Unified Calendar).
- Ensure document updates contain timestamps (`serverTimestamp`) for audits.
