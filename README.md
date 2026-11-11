# Skills Swap (Final MVP)

A React single-page app where college students share skills and learn from each other.

## Features
- Browse skills, search by keyword, filter by category
- Skill details page with related books from the [Open Library Search API](https://openlibrary.org/search.json)
- Save / unsave skills and view them on the Saved page
- Add your own skill and see it on My Skills

## Routes
`/` Home, `/skills` Browse, `/skills/:id` Details, `/saved` Saved, `/my-skills` My Skills, `*` 404

## Tech
React, React Router, Context API (`useContext`), `useState` / `useEffect`, Vite, Vitest + React Testing Library.

## Run it
```
npm install
npm run dev
npm test
```

## Reused from earlier assignments
The skill data shape (title, category, price, description), the category filter idea, and the color palette.
The Unit 9 Express backend was replaced with local sample data so the app can be deployed on Vercel.
