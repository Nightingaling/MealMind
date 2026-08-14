# MealMind

<img width="2752" height="1536" alt="Project Image 2" src="https://github.com/user-attachments/assets/26ab3c6c-d306-4b16-9115-7a95b8b2cab3" />


MealMind is a mobile-first meal-planning web application built with Next.js, React, TypeScript, and Tailwind CSS. It guides users through a personal nutrition onboarding flow, saves their meal profile in the browser, accepts fridge or pantry photos, and uses OpenAI vision-capable responses to generate two practical meal options with nutrition estimates and step-by-step cooking timers.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Available scripts](#available-scripts)
- [How the app works](#how-the-app-works)
- [API behavior](#api-behavior)
- [Mobile-first UX notes](#mobile-first-ux-notes)
- [Development notes](#development-notes)
- [License](#license)

## Features

- **Guided onboarding** for body metrics, activity level, fitness goal, diet type, allergies, excluded foods, cuisine preference, and cooking time budget.
- **Browser-local profile storage** using `localStorage`, so a user can complete onboarding once and return to the dashboard later in the same browser.
- **BMI calculation** during onboarding to help personalize meal planning context.
- **Mobile-first application shell** capped at a 420px maximum width and centered on wider screens.
- **Fridge and pantry image upload** with support for up to 10 JPG, PNG, or WebP images.
- **Client-side image compression** to JPEG before submission, with a 512px maximum image dimension.
- **Vision-backed meal generation** through the OpenAI Responses API.
- **Structured meal output** containing detected ingredients, two meal options, estimated calories, macros, ingredient amounts, allergen notes, and recipe steps.
- **Step-by-step cooking mode** with per-step timers and previous/next navigation.
- **Sticky bottom dashboard tabs** for primary mobile navigation.
- **Server-side request validation** with Zod schemas, upload limits, basic rate limiting, and structured error responses.

## Tech stack

- [Next.js](https://nextjs.org/) 16
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [OpenAI JavaScript SDK](https://github.com/openai/openai-node)
- [Zod](https://zod.dev/)
- [Lucide React](https://lucide.dev/)

## Project structure

```text
.
├── app/
│   ├── api/meals/route.ts      # Server route for image/profile validation and meal generation
│   ├── dashboard/page.tsx      # Dashboard route
│   ├── globals.css             # Global styles and mobile-first shell rules
│   ├── layout.tsx              # Root layout, metadata, and fonts
│   └── page.tsx                # Onboarding route
├── components/
│   ├── dashboard.tsx           # Photo upload, meal results, bottom tabs, and cooking mode
│   └── onboarding.tsx          # Multi-step profile onboarding flow
├── lib/
│   └── meal-plan.ts            # Shared meal-plan TypeScript types
├── .env.example                # Required environment variable template
├── next.config.ts              # Next.js image host configuration
├── package.json                # Scripts and dependencies
└── tsconfig.json               # TypeScript configuration
```

## Getting started

### Prerequisites

- Node.js 20 or newer is recommended.
- npm, which is used by the lockfile in this repository.
- An OpenAI API key for meal generation.

### Install dependencies

```bash
npm install
```

### Configure environment variables

Copy the example environment file and add your server-only OpenAI key:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
```

Do not prefix this variable with `NEXT_PUBLIC_`; it must only be available on the server.

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

If you are running inside Docker, a codespace, or a remote development container, expose or forward port `3000` and open the forwarded URL.

### Build for production

```bash
npm run build
npm run start
```

## Environment variables

| Variable | Required | Scope | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes for meal generation | Server only | Used by `app/api/meals/route.ts` to call the OpenAI Responses API. |

When `OPENAI_API_KEY` is missing, the app still loads, but the meal generation endpoint returns a configuration error instead of calling OpenAI.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Creates a production build. |
| `npm run start` | Starts the production server after a successful build. |
| `npm run lint` | Runs ESLint across the project. |

## How the app works

### 1. Onboarding

The home route renders the onboarding flow. Users enter profile data across multiple steps:

1. Body baseline: age, weight, and height.
2. Direction: activity level and fitness goal.
3. Food preferences: diet type, allergies, and excluded foods.
4. Kitchen routine: cuisine preference and cooking time budget.

After validation, the profile is saved in `localStorage` under the `mealmind-onboarding` key and the user is routed to the dashboard.

### 2. Dashboard

The dashboard reads the saved profile from browser storage. Users can upload up to 10 kitchen photos. The client validates file type and size, compresses images to JPEG, and submits the compressed data URLs to the meal generation API.

### 3. Meal generation

The `/api/meals` route validates the request payload, verifies each image is a JPEG data URL within size and dimension limits, builds a prompt from the user's profile, and calls the OpenAI Responses API. The response is parsed against a Zod schema so the UI receives consistent structured data.

### 4. Cooking mode

Each generated meal can be opened in a step-by-step cooking mode. Instructions include `timerSeconds`, allowing the UI to show countdown timers for steps like boiling, baking, simmering, resting, or marinating.

## API behavior

The meal generation endpoint is implemented at:

```text
POST /api/meals
```

### Request shape

```ts
type MealRequest = {
  images: string[];
  profile: {
    age: number;
    weight: number;
    height: number;
    activityLevel: "sedentary" | "light" | "moderate" | "very-active";
    fitnessGoal: "cut" | "bulk" | "maintain";
    allergies: string[];
    dietType: string;
    excludedFoods: string;
    cuisinePreference: string;
    cookTimeBudget: "15" | "30" | "45" | "60+";
    bmi: number;
    completedAt: string;
  };
};
```

### Response shape

```ts
type MealPlanResponse = {
  detectedIngredients: string[];
  meals: [
    {
      title: string;
      description: string;
      estimatedCalories: number;
      totalTimeMinutes: number;
      nutrition: {
        proteinGrams: number;
        carbohydrateGrams: number;
        fatGrams: number;
      };
      ingredients: { name: string; amount: string }[];
      instructions: { text: string; timerSeconds: number }[];
      goalAlignment: string;
      allergenNotes: string;
    },
    {
      title: string;
      description: string;
      estimatedCalories: number;
      totalTimeMinutes: number;
      nutrition: {
        proteinGrams: number;
        carbohydrateGrams: number;
        fatGrams: number;
      };
      ingredients: { name: string; amount: string }[];
      instructions: { text: string; timerSeconds: number }[];
      goalAlignment: string;
      allergenNotes: string;
    },
  ];
};
```

### Validation and limits

- Maximum of 10 images per request.
- Server accepts JPEG data URLs after client-side compression.
- Each image must be at most 1 MB and no larger than 512 by 512 pixels.
- Request body must be JSON.
- Request body must not exceed the configured maximum request size.
- Basic in-memory rate limiting allows 5 requests per minute per detected client address.
- The endpoint rejects model responses that exceed the user's selected cooking time budget.

## Mobile-first UX notes

MealMind is intentionally styled as a mobile app viewport even when opened on desktop:

- Main application shells use a 420px maximum width.
- The shell is horizontally centered on wider screens.
- Horizontal overflow is hidden to avoid sideways scrolling.
- Tap targets and form controls are scaled for touch usage.
- Onboarding grids collapse to a single column.
- Dashboard primary navigation uses a fixed bottom tab bar.

This makes the app suitable for phone-first use while still being testable on desktop browsers.

## Development notes

- `app/globals.css` contains both the visual design system and the forced mobile shell rules.
- `components/onboarding.tsx` owns the profile setup flow and local profile persistence.
- `components/dashboard.tsx` owns photo upload, image compression, meal-plan submission, meal rendering, and cooking mode.
- `lib/meal-plan.ts` keeps the shared meal-plan response types available to client components.
- `next.config.ts` allows remote images from Unsplash for the onboarding hero image.
- The OpenAI API key is only read on the server in `app/api/meals/route.ts`.

## License

This project is licensed under the terms in [LICENSE](./LICENSE).
