# Free Deployment Setup

This project can run without your laptop by splitting it into:

- Frontend hosting on Vercel
- News collection every 5 minutes with GitHub Actions
- Shared data in Firestore

## 1. Push the project to GitHub

Create a GitHub repository and push this project to it.

## 2. Deploy the frontend on Vercel

1. Sign in to Vercel with GitHub.
2. Import this repository.
3. Add these environment variables in Vercel:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_DATABASE_ID`
   - `VITE_GEMINI_API_KEY` (optional if you want AI features)
   - `VITE_ENABLE_BACKGROUND_AI_REFRESH=false`
4. Deploy.

## 3. Add GitHub repository secrets

In GitHub, open:

`Settings` -> `Secrets and variables` -> `Actions`

Add these repository secrets:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
  Paste the full contents of your Firebase service account JSON file.
- `FIREBASE_DATABASE_ID`
  Set to your Firestore database id.
- `NEWS_FEEDS`
  Comma-separated RSS URLs.

## 4. Start the scheduled collector

The workflow file is:

`.github/workflows/collect-news.yml`

It runs every 5 minutes and can also be started manually from the GitHub Actions tab.

## 5. First manual run

After pushing the repository:

1. Open the `Actions` tab on GitHub.
2. Open `Collect News`.
3. Click `Run workflow`.

If the run succeeds, the website will start showing the latest data from Firestore.
