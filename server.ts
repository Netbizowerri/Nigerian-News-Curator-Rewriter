import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Resend } from "resend";
import cors from "cors";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.APP_URL || '*'
      : 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }));
  app.use(express.json());

  // NewsAPI keys from environment variable (comma-separated list)
  const newsApiKeysStr = process.env.NEWS_API_KEYS || '';
  const NEWS_API_KEYS = newsApiKeysStr
    .split(',')
    .map(key => key.trim())
    .filter(key => key.length > 0);

  if (NEWS_API_KEYS.length === 0) {
    console.error('WARNING: No NewsAPI keys configured. Set NEWS_API_KEYS environment variable.');
  }

  // Resend initialization from environment variable
  const resend = new Resend(process.env.RESEND_API_KEY);

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/news", async (req, res) => {
    let lastError = null;

    for (const apiKey of NEWS_API_KEYS) {
      try {
        console.log(`Attempting to fetch news with key: ${apiKey.substring(0, 5)}...`);
        
        // Try top-headlines first
        let response = await axios.get(`https://newsapi.org/v2/top-headlines`, {
          params: {
            country: 'ng',
            category: 'politics',
            apiKey: apiKey
          }
        });

        // If top-headlines is empty, try a broader search
        if (!response.data.articles || response.data.articles.length === 0) {
          console.log("Top headlines empty, trying broader search...");
          response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
              q: 'politics Nigeria',
              sortBy: 'publishedAt',
              language: 'en',
              pageSize: 20,
              apiKey: apiKey
            }
          });
        }

        console.log(`Successfully fetched ${response.data.articles?.length || 0} articles.`);
        return res.json(response.data);
      } catch (error: any) {
        lastError = error;
        console.error(`Error with key ${apiKey.substring(0, 5)}...:`, error.response?.data || error.message);
        
        if (error.response?.status === 429) {
          console.warn(`Rate limit reached for one API key, trying next...`);
          continue;
        }
        break;
      }
    }

    console.error("Final NewsAPI Error:", lastError?.response?.data || lastError?.message);
    res.status(lastError?.response?.status || 500).json(lastError?.response?.data || { error: "Failed to fetch news" });
  });

  app.post("/api/send-digest", async (req, res) => {
    const { articles, email } = req.body;
    
    if (!articles || articles.length === 0) {
      return res.status(400).json({ error: "No articles to send" });
    }

    try {
      const date = new Date().toLocaleDateString('en-NG', { dateStyle: 'long' });
      const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #008751; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0;">🇳🇬 Political Digest</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">${date}</p>
          </div>
          <div style="padding: 24px;">
            ${articles.map((a: any) => `
              <div style="margin-bottom: 24px; border-bottom: 1px solid #f3f4f6; padding-bottom: 16px;">
                <h3 style="margin: 0 0 8px 0; color: #111827;">${a.title}</h3>
                <p style="margin: 0 0 12px 0; color: #4b5563; font-size: 14px; line-height: 1.5;">${a.description || 'No description available.'}</p>
                <a href="${a.url}" style="color: #008751; text-decoration: none; font-weight: 600; font-size: 14px;">Read Full Story →</a>
              </div>
            `).join('')}
          </div>
          <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px;">
            Sent by NewsrAIt • Automated Nigerian Politics News
          </div>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: "Politics Agent <onboarding@resend.dev>",
        to: email || "netbiz0925@gmail.com",
        subject: `🇳🇬 Political Digest: ${date}`,
        html: htmlContent,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // For local development
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
}

startServer().catch(console.error);
