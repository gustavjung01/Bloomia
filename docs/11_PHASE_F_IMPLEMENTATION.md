# Phase F Implementation

Phase F adds flower templates and connects them to POS.

## Implemented

- Added recipe database migration in `src/db/recipeMigrations.ts`.
- Updated migration runner to include recipe migration.
- Added recipe repository.
- Added `Mẫu hoa` route and page.
- Added recipe create/edit/archive flow.
- Recipe lines can use existing items and services.
- POS now loads recipes.
- Selecting a recipe in POS adds a main product line and editable component lines.

## Main files

```txt
src/db/recipeMigrations.ts
src/db/migrate.ts
src/db/repositories/recipesRepository.ts
src/features/recipes/RecipesPage.tsx
src/app/routes.ts
src/features/pos/POSPage.tsx
```

## POS behavior

```txt
1. Staff selects a recipe.
2. POS adds the main recipe sale line.
3. POS adds the recipe component lines below it.
4. Staff can edit quantity and price before checkout.
5. Existing inventory logic handles tracked component items during checkout.
```

## Issue coverage

- #34 Create product recipe schema and CRUD
- #35 Add recipe products into POS with editable composition
