# Context Map

## Contexts

- [Backend](./backend/CONTEXT.md) — the API owning the domain model: users, expenses, the social graph
- [Mobile](./mobile/CONTEXT.md) — the Expo app: screens, tabs, and presentation vocabulary

## Relationships

- **Mobile → Backend**: the mobile app consumes the backend API and uses the backend's domain vocabulary; mobile's own terms are presentation-only (tab names, screen names)
