# Using Tailwind CSS with Angular

**CRITICAL: Use Tailwind CSS v4 patterns only. No `tailwind.config.js`, no `@tailwind` directives.**

## Setup (v4)

In global styles:
```css
@import 'tailwindcss';
```

PostCSS config (`.postcssrc.json`):
```json
{ "plugins": { "@tailwindcss/postcss": {} } }
```

## Usage

Use utility classes directly in templates:
```html
<h1 class="text-3xl font-bold underline">Hello world!</h1>
```

## Rules

- Do NOT use `@tailwind base; @tailwind components; @tailwind utilities;`
- Do NOT create `tailwind.config.js`
- Use `@import 'tailwindcss';` in CSS
- Configuration via CSS theme variables
