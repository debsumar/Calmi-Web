# Project Steering — Calmi-Web

## Tech Stack

- **Framework**: Angular 21 (standalone components, zoneless change detection)
- **UI Library**: PrimeNG 21 with PrimeUI Tailwind integration
- **Styling**: Tailwind CSS 4 (utility-first, no separate .scss unless needed for animations/PrimeNG overrides)
- **State**: Angular Signals for all reactive state
- **Forms**: Signal Forms (`@angular/forms/signals`) for all new forms
- **Routing**: Lazy-loaded standalone components via `loadComponent`
- **Build**: Angular CLI 21

## Architecture Rules

### Folder Structure (Feature Modules)

```
features/<feature-name>/
├── <feature-name>.routes.ts
├── services/
│   └── <feature-name>.service.ts
├── pages/
│   └── <page-name>/
│       ├── <page-name>.component.ts
│       ├── <page-name>.component.html
│       └── <page-name>.component.scss  ← only if needed
├── components/
│   └── <component-name>/
│       ├── <component-name>.component.ts
│       ├── <component-name>.component.html
│       └── <component-name>.component.scss  ← only if needed
└── models/
```

### Component Rules

- **Always** use `standalone: true` components
- **Always** use `templateUrl` and `styleUrl` (separate files) for page-level components (>30 lines of template)
- **Always** use `inject()` function over constructor injection
- Small components can use inline templates

### Zoneless Change Detection

This project uses `provideZonelessChangeDetection()`. Key rules:

1. Use signals (`signal()`, `computed()`, `linkedSignal()`) for all reactive state
2. Never rely on Zone.js — it does not exist in this app
3. Prefer `resource()` or `rxResource()` for async data fetching

### Styling

- Use Tailwind utility classes directly in templates
- Only create `.scss` files when you need `:host` styles or PrimeNG overrides
- Use PrimeUI semantic tokens: `text-primary`, `bg-primary`, `border-surface-200`, etc.

### Naming Conventions

- Feature folders: kebab-case
- Components: kebab-case files, PascalCase classes
- Services: kebab-case files, PascalCase classes

### Signals & Reactivity

- All component state uses `signal()`
- Derived state uses `computed()`
- Side effects use `effect()` sparingly
- Services return `Observable<T>`, components subscribe and push into signals

### Routing

- All routes use `loadComponent` for lazy loading
- Route files named `<feature>.routes.ts`

## Code Flow: API Call → Signal → Template

```
Component.ngOnInit()
  → Service.method()
    → HttpClient
  ← Observable<T>
  ← .subscribe({ next: data => signal.set(data) })
→ Signal notifies Angular (zoneless)
  → Template re-renders via signal getter: `items()`
```

## References

- [DI Fundamentals](references/di-fundamentals.md)
- [Signals Overview](references/signals-overview.md)
- [Tailwind CSS](references/tailwind-css.md)
