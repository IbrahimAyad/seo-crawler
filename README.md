# KCT SEO Crawler

> Lightweight Node.js API for crawling JavaScript-rendered websites and performing comprehensive SEO audits.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/seo-crawler)

## Features

✅ **JavaScript Rendering** - Renders React, Next.js, Shopify headless sites with Puppeteer
✅ **Sitemap Discovery** - Automatically follows sitemap.xml
✅ **robots.txt Compliance** - Respects crawl delays and disallow rules
✅ **Comprehensive SEO Analysis** - 20+ checks across errors, warnings, and notices
✅ **Health Scoring** - 0-100 score based on issue severity
✅ **Stateless API** - No database required, returns JSON reports

## Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/IbrahimAyad/seo-crawler.git
cd seo-crawler

# Install dependencies
npm install

# Start development server
npm run dev

# Server runs on http://localhost:3000
```

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Click "Deploy on Railway"
2. Connect your GitHub account
3. Select this repository
4. Railway automatically detects `nixpacks.toml` and installs Chromium
5. Your API is live! 🚀

## API Endpoints

### Health Check
```bash
GET /health
GET /api/seo/health
```

### Single Page Analysis (Fast)
```bash
POST /api/seo/analyze-page

Body:
{
  "url": "https://kctmenswear.com",
  "waitForSelector": ".product-grid"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://kctmenswear.com",
    "healthScore": 85,
    "totalPages": 1,
    "summary": {
      "errors": 0,
      "warnings": 2,
      "notices": 3
    },
    "issues": [...]
  }
}
```

### Full Site Audit
```bash
POST /api/seo/audit

Body:
{
  "url": "https://kctmenswear.com",
  "maxPages": 100,              // Default: 100
  "followSitemap": true,        // Default: true
  "respectRobotsTxt": true,     // Default: true
  "waitForSelector": ".content" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://kctmenswear.com",
    "crawledAt": "2025-12-02T20:00:00Z",
    "totalPages": 87,
    "healthScore": 82,
    "summary": {
      "errors": 3,
      "warnings": 12,
      "notices": 8
    },
    "issues": [
      {
        "type": "missing_h1",
        "severity": "error",
        "message": "2 page(s) missing H1 tag",
        "affectedUrls": ["/about", "/contact"],
        "recommendation": "Add exactly one H1 tag to each page"
      }
    ],
    "pages": [...]
  }
}
```

## SEO Checks

### ❌ Errors (Critical)
- Missing title tag
- Missing H1 tag
- Multiple H1 tags
- Missing meta description
- Missing SSL/HTTPS
- Broken pages (404, 500)

### ⚠️ Warnings (Important)
- Title too short (<30) or too long (>60)
- Meta description too short (<120) or too long (>160)
- Thin content (<300 words)
- Missing image alt text
- Duplicate titles/meta descriptions

### ℹ️ Notices (Improvements)
- Missing canonical tag
- Missing Open Graph tags
- Missing Twitter Card tags
- Missing schema markup
- No sitemap.xml

## Health Score

```
Starting Score: 100

Deductions:
- Errors: -10 points each (max -40)
- Warnings: -5 points each (max -30)
- Notices: -2 points each (max -20)

Final Score: 0-100
```

**Grading:**
- 90-100: Excellent ✅
- 75-89: Good 👍
- 60-74: Fair ⚠️
- 40-59: Poor 🔴
- 0-39: Critical 🚨

## Frontend Integration

### React/TypeScript Example

```typescript
async function runSEOAudit(url: string) {
  const response = await fetch('https://your-railway-url.railway.app/api/seo/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      maxPages: 100,
      followSitemap: true
    })
  });

  const { data } = await response.json();
  return data;
}

// Usage
const report = await runSEOAudit('https://kctmenswear.com');
console.log(`Health Score: ${report.healthScore}/100`);
```

### Download Report as JSON

```typescript
function downloadReport(report: any) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seo-audit-${new Date().toISOString()}.json`;
  a.click();
}
```

## Configuration

Environment variables (optional):

```bash
PORT=3000                    # Server port
NODE_ENV=production          # Environment
SEO_MAX_PAGES=100           # Max pages to crawl
SEO_CRAWL_DELAY=1000        # Delay between requests (ms)
```

## Performance

- **Single page analysis**: ~3-5 seconds
- **100 page crawl**: ~2-3 minutes (1 second delay between pages)
- **Memory usage**: ~300-500MB (Chromium overhead)

## Tech Stack

- **Node.js** - Runtime
- **TypeScript** - Type safety
- **Express** - Web framework
- **Puppeteer** - Headless Chrome for JS rendering
- **Cheerio** - HTML parsing
- **Railway** - Deployment platform

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clean build files
npm run clean
```

## Troubleshooting

### "Browser launch failed"
Make sure `nixpacks.toml` is present for Railway deployment. It installs Chromium automatically.

### "Timeout waiting for selector"
The `waitForSelector` is optional. Remove it or increase timeout if the element doesn't exist.

### "Rate limited"
Default: 30 requests/minute. Adjust `SEO_CRAWL_DELAY` or reduce `maxPages`.

## Architecture

```
Frontend (MiniMax/Lovable)
    ↓ POST /api/seo/audit
Backend (Railway + Puppeteer)
    ↓ Render with Chromium
Target Site (kctmenswear.com)
    ↓ Parse HTML
SEO Analysis (20+ checks)
    ↓ Calculate score
JSON Report
    ↓ Return to frontend
Display + Download
```

## Limitations

- Max 100 pages per audit (configurable)
- 1 second delay between pages (respectful crawling)
- No authentication/user accounts
- No historical data storage
- Reports not persisted (download only)

## Roadmap

- [ ] Lighthouse integration
- [ ] Mobile vs Desktop comparison
- [ ] Competitor analysis
- [ ] Scheduled audits
- [ ] Email reports
- [ ] Historical tracking

## License

MIT

## Author

Built for **KCT Menswear** by Ibrahim Ayad

## Support

For issues or questions:
- GitHub Issues: https://github.com/IbrahimAyad/seo-crawler/issues
- Email: support@kctmenswear.com
