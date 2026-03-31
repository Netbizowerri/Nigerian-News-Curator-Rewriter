<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/7aad6b30-07c4-4462-a3f8-2ff5902ae85b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create a `.env.local` file in the root directory and add the following environment variables:
   - `VITE_GEMINI_API_KEY`: Your Gemini API key for AI rewriting.
   - `RESEND_API_KEY`: Your Resend API key for sending emails.
   - `NEWS_API_KEYS`: Comma-separated list of your NewsAPI keys (e.g., "key1,key2,key3").
   - `APP_URL`: The URL where the app is hosted (optional, defaults to http://localhost:3000).
3. Run the app:
   `npm run dev`
