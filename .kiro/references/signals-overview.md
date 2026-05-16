# Angular Signals Overview

## Writable Signals (`signal`)

```ts
const count = signal(0);
count();           // read
count.set(3);      // set directly
count.update(v => v + 1); // update from previous
```

## Computed Signals (`computed`)

Lazily evaluated, memoized, auto-tracks dependencies:

```ts
const count = signal(0);
const doubleCount = computed(() => count() * 2);
```

## Reactive Contexts

Angular monitors signal reads in: `computed`, `effect`, `linkedSignal`, component templates.

### Untracked Reads

```ts
effect(() => {
  console.log(`User: ${currentUser()}, Count: ${untracked(counter)}`);
});
```

## Key Rules

- All component state → `signal()`
- Derived state → `computed()`
- Side effects → `effect()` sparingly
- Services return `Observable<T>`, components push into signals
