import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper, 
  Send, 
  RefreshCw, 
  ExternalLink, 
  Calendar, 
  ChevronRight,
  Home,
  Info,
  Mail,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Share2,
  Copy
} from 'lucide-react';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";

interface Article {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: { name: string };
}

interface RewrittenArticle extends Article {
  recreatedContent: string;
}

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [rewrittenArticles, setRewrittenArticles] = useState<RewrittenArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  
  // New states for AI Recreation
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [recreatedContent, setRecreatedContent] = useState<string>("");
  const [isRecreating, setIsRecreating] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/news');
      
      // Data processing: Filter for unique titles and truncate descriptions
      const uniqueArticles = response.data.articles.reduce((acc: Article[], current: Article) => {
        const x = acc.find(item => item.title === current.title);
        if (!x) {
          return acc.concat([{
            ...current,
            description: current.description ? current.description.substring(0, 200) + (current.description.length > 200 ? '...' : '') : ''
          }]);
        } else {
          return acc;
        }
      }, []);

      setArticles(uniqueArticles);
    } catch (error) {
      console.error("Error fetching news:", error);
      setStatus({ type: 'error', message: 'Failed to fetch news. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const recreateNews = async (article: Article) => {
    setSelectedArticle(article);
    setRecreatedContent("");
    setIsRecreating(true);
    
     try {
       const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
       const response = await ai.models.generateContent({
         model: "gemini-3-flash-preview",
         contents: `You are a professional Nigerian political journalist. 
         Rewrite the following news article based on its title and snippet. 
         Maintain absolute factual accuracy. Do not distort the news in any way. 
         Use a clear, engaging, and professional tone suitable for a high-end daily digest.
         
         Title: ${article.title}
         Snippet: ${article.description}
         Source URL: ${article.url}
         
         Provide a well-structured report with a headline and body text.`,
         config: {
           tools: [{ urlContext: {} }]
         }
       });

      const content = response.text || "Failed to recreate news.";
      setRecreatedContent(content);

      // Add to rewritten articles queue if not already there
      setRewrittenArticles(prev => {
        const exists = prev.find(a => a.url === article.url);
        if (exists) {
          return prev.map(a => a.url === article.url ? { ...a, recreatedContent: content } : a);
        }
        return [...prev, { ...article, recreatedContent: content }];
      });
    } catch (error) {
      console.error("Gemini Error:", error);
      setRecreatedContent("Sorry, I couldn't recreate this article right now. Please try again later.");
    } finally {
      setIsRecreating(false);
    }
  };

  const sendDigest = async () => {
    if (rewrittenArticles.length === 0) {
      setStatus({ type: 'error', message: 'Please recreate some articles first to add them to your digest.' });
      return;
    }
    setSending(true);
    setStatus(null);
    try {
      const response = await axios.post('/api/send-digest', {
        articles: rewrittenArticles.map(a => ({
          ...a,
          description: a.recreatedContent // Use the rewritten content as the description
        })),
        email: 'netbiz0925@gmail.com'
      });
      if (response.data.success) {
        setStatus({ type: 'success', message: `Digest with ${rewrittenArticles.length} rewritten articles sent successfully!` });
        setRewrittenArticles([]); // Clear queue after sending
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to send digest. Please check your API key.' });
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async () => {
    if (!recreatedContent) return;
    try {
      await navigator.clipboard.writeText(recreatedContent);
      setStatus({ type: 'success', message: 'Text copied to clipboard!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = (platform: 'whatsapp' | 'facebook' | 'x' | 'lekeleke') => {
    if (!recreatedContent || !selectedArticle) return;
    
    const text = encodeURIComponent(`🇳🇬 *${selectedArticle.title}*\n\n${recreatedContent}\n\nRead more on NewsrAIt`);
    const url = encodeURIComponent(window.location.href);
    
    let shareUrl = '';
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${text}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
        break;
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
        break;
      case 'lekeleke':
        shareUrl = `https://www.lekeelekee.com/share?text=${text}`;
        break;
    }
    
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-gray-900 font-sans pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#008751] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white p-1.5 rounded-lg">
              <Newspaper className="text-[#008751] w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">NewsrAIt</h1>
          </div>
          <button 
            onClick={fetchNews}
            disabled={loading}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Status Messages */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                status.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-medium">{status.message}</p>
              <button onClick={() => setStatus(null)} className="ml-auto text-sm font-bold">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Daily Political Digest</h2>
            <p className="text-gray-600 mb-6 max-w-lg">
              Stay informed with the latest political developments across Nigeria. 
              Curated, cleaned, and delivered daily.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchNews}
                disabled={loading}
                className="bg-white border-2 border-[#008751] text-[#008751] hover:bg-[#008751]/5 px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Newspaper className="w-5 h-5" />}
                Scan for News
              </button>
              <button
                onClick={sendDigest}
                disabled={sending || rewrittenArticles.length === 0}
                className="bg-[#008751] hover:bg-[#007043] text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-md relative"
              >
                {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send Email Digest
                {rewrittenArticles.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {rewrittenArticles.length}
                  </span>
                )}
              </button>
            </div>
            {rewrittenArticles.length > 0 && (
              <p className="mt-4 text-xs font-bold text-[#008751] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {rewrittenArticles.length} articles ready in your custom digest queue.
              </p>
            )}
          </div>
          <div className="absolute top-0 right-0 w-32 h-full bg-[#008751]/5 -skew-x-12 transform translate-x-16" />
        </div>

        {/* News Feed */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#008751]" />
              Latest Updates
            </h3>
            <span className="text-sm text-gray-500 font-medium">
              {articles.length} stories found
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 h-48 animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid gap-6">
              {articles.map((article, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4 }}
                  onClick={() => recreateNews(article)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-200 group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row">
                    {article.urlToImage && (
                      <div className="md:w-48 h-48 md:h-auto overflow-hidden">
                        <img 
                          src={article.urlToImage} 
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#008751] uppercase tracking-wider mb-2">
                        <span>{article.source.name}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold mb-2 leading-tight group-hover:text-[#008751] transition-colors">
                        {article.title}
                      </h4>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {article.description}
                      </p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="text-xs font-bold text-[#008751] flex items-center gap-1 bg-[#008751]/5 px-2 py-1 rounded-md">
                          <Sparkles className="w-3 h-3" />
                          AI Recreate
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#008751] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No major political updates today.</p>
              <button onClick={fetchNews} className="mt-4 text-[#008751] font-bold hover:underline">
                Refresh Feed
              </button>
            </div>
          )}
        </div>
      </main>

      {/* AI Recreation Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="bg-[#008751] text-white p-6 flex justify-between items-start">
                <div className="flex-1 pr-8">
                  <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-widest mb-2">
                    <Sparkles className="w-4 h-4" />
                    AI Recreated Version
                  </div>
                  <h3 className="text-xl font-bold leading-tight">
                    {selectedArticle.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {isRecreating ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="relative">
                      <RefreshCw className="w-12 h-12 text-[#008751] animate-spin" />
                      <Sparkles className="w-6 h-6 text-[#008751] absolute -top-2 -right-2 animate-pulse" />
                    </div>
                    <p className="text-gray-500 font-medium animate-pulse">
                      Gemini is analyzing and recreating the news...
                    </p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="prose prose-slate max-w-none"
                  >
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed text-lg">
                      {recreatedContent}
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-gray-100">
                      <div className="flex flex-wrap gap-4 mb-6">
                        <a 
                          href={selectedArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm font-bold text-[#008751] hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Original Source
                        </a>
                        <button 
                          onClick={handleCopy}
                          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#008751] transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Text
                        </button>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Share to</p>
                        <div className="flex flex-wrap gap-3">
                          <button 
                            onClick={() => handleShare('whatsapp')}
                            className="bg-[#25D366] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            WhatsApp
                          </button>
                          <button 
                            onClick={() => handleShare('facebook')}
                            className="bg-[#1877F2] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            Facebook
                          </button>
                          <button 
                            onClick={() => handleShare('x')}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            X
                          </button>
                          <button 
                            onClick={() => handleShare('lekeleke')}
                            className="bg-[#008751] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                          >
                            Lekeleke
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Navigation Tray */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center md:hidden z-50">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#008751]' : 'text-gray-400'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('news')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'news' ? 'text-[#008751]' : 'text-gray-400'}`}
        >
          <Newspaper className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Feed</span>
        </button>
        <button 
          onClick={() => setActiveTab('mail')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'mail' ? 'text-[#008751]' : 'text-gray-400'}`}
        >
          <Mail className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Digest</span>
        </button>
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'info' ? 'text-[#008751]' : 'text-gray-400'}`}
        >
          <Info className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">About</span>
        </button>
      </nav>
    </div>
  );
}

