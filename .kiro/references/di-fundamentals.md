# Dependency Injection (DI) Fundamentals

## How DI Works in Angular

1. **Providing**: Making values available to the DI system.
2. **Injecting**: Asking the DI system for those values.

## Services

```ts
@Injectable({ providedIn: 'root' })
export class AnalyticsLogger {
  trackEvent(category: string, value: string) {
    console.log('Analytics event logged:', { category, value });
  }
}
```

## Injecting Dependencies

Use `inject()` function (not constructor injection):

```ts
@Component({ selector: 'app-navbar', template: `...` })
export class Navbar {
  private router = inject(Router);
  private analytics = inject(AnalyticsLogger);
}
```

### Where can `inject()` be used?

1. **Class field initializers** (Recommended)
2. **Constructor body**
3. **Route guards and resolvers**
4. **Factory functions** used in providers
