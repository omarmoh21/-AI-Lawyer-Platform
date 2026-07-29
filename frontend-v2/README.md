# Frontend — المستشار (Al-Mustashar)

This is the web interface for **المستشار**, an Arabic legal-assistant app: users ask
legal questions, upload documents for analysis, or search Egyptian law, and get back
answers backed by cited legal articles. This README is written for someone who
has never used React before — it walks through the tools, the folder layout,
and the core React ideas *using the actual code in this project* as examples.

For the backend, evaluation results, and full setup, see the
[root README](../README.md).

## 1. The tech stack, in plain terms

| Tool | What it's for |
|---|---|
| **React** | A JavaScript library for building UIs out of reusable "components" (see §4). |
| **TypeScript** | JavaScript with types. Catches bugs like "you forgot a prop" before you run the app. |
| **Vite** | The dev server + build tool. Runs `npm run dev` and gives you instant reload on save. |
| **react-router-dom** | Lets one page app show different "pages" (Consultation, Login, ...) without full page reloads. |
| **Tailwind CSS v4** | Utility classes for styling directly in JSX (`className="px-4 py-2 bg-gold-400"`) instead of separate CSS files. |
| **lucide-react** | The icon library used everywhere (`<Search />`, `<Scale />`, etc.). |

## 2. Running it locally

```bash
cd frontend-v2
npm install    # install dependencies (only needed once, or after package.json changes)
npm run dev    # starts the dev server at http://localhost:5174
```

The backend must be running on port `8000` for anything beyond the landing page to
work — see the [root README](../README.md) for the full startup order.

Other scripts:
- `npm run build` — type-checks everything then produces a production build in `dist/`.
- `npm run lint` — runs Oxlint to catch style/correctness issues.
- `npm run preview` — serves the production build locally so you can sanity-check it.

## 3. Folder structure

```
frontend-v2/
├─ index.html            # the single HTML page the whole app is injected into
├─ vite.config.ts        # Vite config: React + Tailwind plugins, and the /api proxy
├─ src/
│  ├─ main.tsx           # the entry point — mounts <App /> into the page (see §5)
│  ├─ App.tsx            # defines every route/page in the app (see §6)
│  ├─ index.css          # imports Tailwind + defines the color theme (charcoal/gold)
│  ├─ types/index.ts     # shared TypeScript types
│  ├─ lib/
│  │  ├─ api.ts          # every backend call lives here (see §8)
│  │  └─ auth.tsx        # auth context: current user, login/signup/logout
│  ├─ data/guides.ts     # authored content for the procedure-guides page
│  ├─ pages/             # one file per screen: Landing, Login, Consultation, Contracts...
│  └─ components/
│     ├─ ui/             # small generic building blocks: Button, Card, Field...
│     ├─ layout/         # page scaffolding: AppShell, PublicNav
│     ├─ landing/        # sections used only on the public landing page (Hero, CTA...)
│     ├─ consultation/   # chat-specific pieces, e.g. ChatHistorySidebar
│     └─ auth/           # shared layout + route guards for Login/Signup
```

**Rule of thumb:** `pages/` = a full screen tied to a URL. `components/` = reusable
pieces that pages assemble together.

## 4. What is a "component"?

In React, everything you see on screen is built from **components** — plain
functions that return HTML-like markup (called **JSX**). Here's the smallest
one in the project, [Badge.tsx](src/components/ui/Badge.tsx)-style example,
using [Button.tsx](src/components/ui/Button.tsx):

```tsx
export default function Button({ variant = 'primary', size = 'md', icon, children, ...rest }) {
  return (
    <button className={`... ${variantClasses[variant]} ${sizeClasses[size]}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}
```

- It's just a function named `Button` that returns JSX (looks like HTML, but it's JavaScript).
- `{ variant = 'primary', size = 'md', icon, children }` are its **props** — the
  inputs you pass in, exactly like function arguments. TypeScript's
  `ButtonProps` interface at the top of the file documents what's allowed.
- You *use* it elsewhere like an HTML tag:
  ```tsx
  <Button variant="secondary" icon={<Send size={16} />}>إرسال</Button>
  ```
- `children` is a special prop: whatever you put *between* the opening and
  closing tags (here, the Arabic text "إرسال") is passed in automatically.

Components can render other components. [AppShell.tsx](src/components/layout/AppShell.tsx)
is a good example: it renders the sidebar nav, a header, and then whatever page
content is passed to it as `children` — that's how every logged-in page
(Consultation, Contracts, etc.) gets the same sidebar/header without repeating
the code.

## 5. How the app boots up

[main.tsx](src/main.tsx) is the entry point — the very first code that runs:

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Step by step:
1. `document.getElementById('root')` finds the empty `<div id="root">` in [index.html](index.html).
2. `createRoot(...).render(...)` tells React "put the app inside this div".
3. `<BrowserRouter>` wraps everything so the app can use URL-based routing (§6).
4. `<StrictMode>` is a development-only helper that warns about common mistakes; it doesn't affect production.
5. `<App />` is the actual app — defined in [App.tsx](src/App.tsx).

## 6. Routing — how URLs map to pages

[App.tsx](src/App.tsx) lists every page and the URL that shows it:

```tsx
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
  <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
  <Route path="/consultation" element={<ProtectedRoute><Consultation /></ProtectedRoute>} />
  <Route path="/search" element={<ProtectedRoute><LegalSearch /></ProtectedRoute>} />
  <Route path="/guides" element={<ProtectedRoute><Guides /></ProtectedRoute>} />
  <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
</Routes>
```

Note the two wrappers: `<ProtectedRoute>` bounces you to `/login` if you're not signed
in, and `<GuestRoute>` does the reverse — it keeps an already-signed-in user off the
login/signup pages. Both read the current user from `lib/auth.tsx`.

- Visiting `/consultation` renders the `<Consultation />` component (from [pages/Consultation.tsx](src/pages/Consultation.tsx)), nothing else.
- To navigate *between* pages without a full browser reload, code uses `<Link to="/consultation">` instead of `<a href="...">` (see [AppShell.tsx](src/components/layout/AppShell.tsx)). `<NavLink>` is the same thing but also tells you whether it's the currently active page, which is how the sidebar highlights the current section.
- **To add a new page:** create a file in `src/pages/`, then add one `<Route path="..." element={<YourPage />} />` line in `App.tsx`.

## 7. State — how the UI reacts to user input

Plain variables don't cause React to re-render. To make the screen update when
data changes, components use the `useState` **hook**. [Consultation.tsx](src/pages/Consultation.tsx)
(the chat-style legal Q&A page) shows this well:

```tsx
const [turns, setTurns] = useState<ConsultationTurn[]>([])
const [question, setQuestion] = useState('')
const [isThinking, setIsThinking] = useState(false)
```

- `useState(initialValue)` returns a pair: the current value (`question`) and a
  function to update it (`setQuestion`).
- Calling `setQuestion('new text')` tells React "re-render this component with
  the new value" — you never mutate `question` directly.
- The `<textarea>` is wired to this state (a "controlled input"):
  ```tsx
  <textarea value={question} onChange={(e) => setQuestion(e.target.value)} />
  ```
  Every keystroke fires `onChange`, which updates state, which re-renders the
  textarea with the new value. This is the standard React pattern for forms.
- `handleSubmit` calls `setTurns((prev) => [...prev, newTurn])` to append a new
  question/answer pair to the conversation, which is what causes the new
  message bubble to appear on screen.

## 8. Where the data comes from (important!)

Every call to the backend lives in one file: [lib/api.ts](src/lib/api.ts). Pages never
call `fetch` directly — they import a function from there:

```tsx
import { streamChat, downloadContract, transcribeAudio } from '../lib/api'
```

Two details worth knowing:

- **`credentials: 'include'`** is set on every request. Auth is a `HttpOnly` cookie the
  backend sets at login, and without that flag the browser wouldn't send it — so every
  request would come back `401 Not authenticated`.
- **The base URL is usually empty.** `VITE_API_BASE_URL` defaults to blank, making
  requests hit a relative `/api/...` path that the Vite dev server proxies to
  `localhost:8000` (see `vite.config.ts`). The browser therefore only ever sees one
  origin, which keeps the auth cookie same-site — this is what makes login work on
  mobile browsers that block third-party cookies.

Answers stream in rather than arriving all at once: `streamChat` is an async generator
over Server-Sent Events, so `Consultation.tsx` can `for await` over it and append text
to the screen as each chunk arrives.

The current signed-in user comes from [lib/auth.tsx](src/lib/auth.tsx) via the
`useAuth()` hook — call it from any component to read `user`, or to trigger
`login` / `signup` / `loginAsGuest` / `logout`.

## 9. Styling with Tailwind

Instead of writing separate `.css` files per component, classes are applied
directly in JSX: `className="rounded-[4px] bg-gold-400 px-5 py-3 text-field-deep"`.
Each word is a small, composable utility (`rounded-xl` = border radius,
`bg-gold-400` = background color, `px-5` = horizontal padding, etc.).

The custom color palette (`gold-*`, `field-*`, `rubric-*`) and the Arabic font
(Naskh/Arabic display faces) are defined once in [index.css](src/index.css) under
`@theme`, so every component can use `text-paper` or `bg-gold-300` and get
a consistent design system.

Note the app is RTL (right-to-left) — you'll see logical properties like
`border-e` (border-end) instead of `border-r`, which automatically flips
correctly for Arabic.

## 10. Icons

Icons come from `lucide-react` and are used as components:
```tsx
import { Search } from 'lucide-react'
<Search size={18} strokeWidth={2} />
```

## 11. A practical exercise: adding a new page

To see all these pieces work together, try this:
1. Create `src/pages/Notifications.tsx` copying the shape of `Contracts.tsx`
   (wrap content in `<AppShell title="...">`).
2. In `App.tsx`, import it and add `<Route path="/notifications" element={<Notifications />} />`.
3. In `AppShell.tsx`, add an entry to `navItems` pointing to `/notifications`.
4. Run `npm run dev` and click the new sidebar link — no full page reload, and
   the sidebar highlights automatically because of `NavLink`'s active-state styling.
