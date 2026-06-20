# Phase G Implementation

Phase G adds Bloomia AI per tab.

## Implemented

- Added per-tab assistant types.
- Added card registry for each route.
- Added context service that reads real tab data from repositories.
- Added result service for MVP advice.
- Added popup UI opened from the topbar.
- Added session repository that saves assistant sessions into the existing `settings` table as JSON.
- Added styling for popup cards and result area.

## Main files

```txt
src/features/ai/types.ts
src/features/ai/cardRegistry.ts
src/features/ai/contextService.ts
src/features/ai/resultService.ts
src/features/ai/TabAssistantPopup.tsx
src/db/repositories/assistantSessionRepository.ts
src/app/Topbar.tsx
src/styles/components.css
```

## Behavior

```txt
1. User opens a tab.
2. User clicks Bloomia AI in the topbar.
3. Popup shows small advice cards for that tab.
4. User selects a card.
5. App reads real context for the current tab.
6. App produces a local MVP advisory result.
7. App saves the session to settings JSON.
```

## Tab coverage

- Dashboard
- POS
- Flower orders
- Inventory
- Purchase
- Recipes
- Customers
- Reports
- Settings

## Notes

- This phase uses local rule-based MVP advice, not external AI provider yet.
- Session storage uses the existing `settings` table to avoid an additional database migration in this pass.
- A later phase can move sessions into dedicated tables and connect to an AI provider.

## Issue coverage

- #36 Build per-tab assistant popup and cards
- #37 Add per-tab context/data store layer
- #38 Generate advice from real local context
- #39 Persist assistant sessions
