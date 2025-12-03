# SEO Crawler - Frontend Integration Guide

> **For MiniMax/Lovable Frontend Integration**
> Railway Backend API: `https://seo-crawler-production-12b2.up.railway.app`

---

## Overview

This backend provides **JavaScript-rendering SEO analysis** using Puppeteer + Cheerio, designed to integrate seamlessly with your existing MiniMax frontend while preserving all current functionality including PDF generation.

**Integration Strategy**: Progressive Enhancement
- Keep your existing browser-based analyzer and PDF generation
- Use Railway backend for JavaScript-heavy sites (React, Next.js, Shopify headless)
- Maintain all current UI, data structures, and user experience

---

## API Endpoints

### Base URL
```
https://seo-crawler-production-12b2.up.railway.app
```

### 1. Health Check
```bash
GET /health
GET /api/seo/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "SEO Crawler API",
  "version": "1.0.0"
}
```

### 2. Single Page Analysis (Fast - Recommended for Testing)
```bash
POST /api/seo/analyze-page
Content-Type: application/json

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
    "issues": [
      {
        "type": "missing_h1",
        "severity": "error",
        "message": "Page missing H1 tag",
        "affectedUrls": ["https://kctmenswear.com/about"],
        "recommendation": "Add exactly one H1 tag to each page"
      }
    ],
    "pages": [
      {
        "url": "https://kctmenswear.com",
        "title": "KCT Menswear - Custom Suits & Tuxedos",
        "metaDescription": "...",
        "h1Tags": ["Welcome to KCT"],
        "h2Tags": ["Our Services", "Featured Products"],
        "wordCount": 1250,
        "images": [
          {
            "src": "https://kctmenswear.com/hero.jpg",
            "alt": "Custom suits",
            "width": 1920,
            "height": 1080
          }
        ],
        "links": [
          {
            "href": "/about",
            "text": "About Us",
            "isInternal": true,
            "isNofollow": false
          }
        ],
        "canonical": "https://kctmenswear.com",
        "ogTags": {
          "og:title": "KCT Menswear",
          "og:image": "https://kctmenswear.com/og.jpg"
        },
        "twitterTags": {
          "twitter:card": "summary_large_image"
        },
        "schemaMarkup": [
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "KCT Menswear"
          }
        ],
        "loadTime": 2345,
        "statusCode": 200
      }
    ]
  }
}
```

### 3. Full Site Audit (Crawls Entire Site)
```bash
POST /api/seo/audit
Content-Type: application/json

{
  "url": "https://kctmenswear.com",
  "maxPages": 100,              // Default: 100
  "followSitemap": true,        // Default: true
  "respectRobotsTxt": true,     // Default: true
  "waitForSelector": ".content" // Optional
}
```

**Response:** Same structure as analyze-page, but with multiple pages in the `pages` array.

**Note:** Full audits take 2-3 minutes for 100 pages (1 second delay between pages for respectful crawling).

---

## Data Structure Mapping

### Your Current Frontend → Railway Backend

| Your Structure | Railway Response | Notes |
|---------------|------------------|-------|
| `PageAnalysis.url` | `pages[].url` | ✅ Full URL with domain |
| `PageAnalysis.full_url` | `pages[].url` | ✅ Same as url |
| `PageAnalysis.status_code` | `pages[].statusCode` | ✅ Direct match |
| `PageAnalysis.title` | `pages[].title` | ✅ Direct match |
| `PageAnalysis.meta_description` | `pages[].metaDescription` | ✅ Direct match |
| `PageAnalysis.h1_tags` | `pages[].h1Tags` | ✅ Array of strings |
| `PageAnalysis.word_count` | `pages[].wordCount` | ✅ Direct match |
| `PageAnalysis.canonical_url` | `pages[].canonical` | ✅ Direct match |
| `PageAnalysis.load_time_ms` | `pages[].loadTime` | ✅ Direct match |
| `PageAnalysis.internal_links_count` | Calculate from `pages[].links.filter(l => l.isInternal).length` | ⚠️ Calculate |
| `PageAnalysis.external_links_count` | Calculate from `pages[].links.filter(l => !l.isInternal).length` | ⚠️ Calculate |
| `PageAnalysis.issues` | Transform from `issues` array | ⚠️ Transform needed |
| `CrawlSummary.total_pages` | `totalPages` | ✅ Direct match |
| `CrawlSummary.pages_crawled` | `pages.length` | ✅ Direct match |
| `CrawlSummary.errors` | `summary.errors` | ✅ Direct match |
| `CrawlSummary.warnings` | `summary.warnings` | ✅ Direct match |
| `CrawlSummary.notices` | `summary.notices` | ✅ Direct match |
| `CrawlSummary.site_health_score` | `healthScore` | ✅ Direct match |

### Data Transformation Helper

```typescript
// Transform Railway response to your PageAnalysis format
function transformToPageAnalysis(railwayPage: any): PageAnalysis {
  const internalLinksCount = railwayPage.links.filter((l: any) => l.isInternal).length;
  const externalLinksCount = railwayPage.links.filter((l: any) => !l.isInternal).length;

  return {
    url: railwayPage.url,
    full_url: railwayPage.url,
    status_code: railwayPage.statusCode,
    title: railwayPage.title || '',
    meta_description: railwayPage.metaDescription || '',
    h1_tags: railwayPage.h1Tags,
    word_count: railwayPage.wordCount,
    internal_links_count: internalLinksCount,
    external_links_count: externalLinksCount,
    canonical_url: railwayPage.canonical,
    load_time_ms: railwayPage.loadTime,
    crawled_at: new Date().toISOString(),
    issues: [], // Transform separately from issues array
    content_length: railwayPage.wordCount * 5, // Approximate
    has_javascript: true // Railway always renders JS
  };
}

// Transform Railway issues to your SEOIssue format
function transformIssues(railwayIssues: any[]): SEOIssue[] {
  return railwayIssues.map(issue => ({
    id: crypto.randomUUID(),
    issue_type: issue.type,
    severity: issue.severity,
    description: issue.message,
    recommendation: issue.recommendation
  }));
}
```

---

## Integration Approach: Progressive Enhancement

### Option 1: Smart Detection (Recommended)

Detect if a site needs JavaScript rendering, then decide which backend to use:

```typescript
async function analyzeSiteIntelligent(url: string, progressCallback: Function) {
  // Quick check: Does this site need JavaScript?
  const needsJS = await detectJavaScriptSite(url);

  if (needsJS) {
    console.log('🚀 Using Railway backend (JavaScript rendering)');
    return await analyzeWithRailway(url, progressCallback);
  } else {
    console.log('⚡ Using browser-based analyzer (faster)');
    return await analyzeWithBrowser(url, progressCallback);
  }
}

async function detectJavaScriptSite(url: string): Promise<boolean> {
  const domain = new URL(url).hostname.toLowerCase();

  // Known JavaScript frameworks/platforms
  const jsIndicators = [
    'shopify.com',
    'vercel.app',
    'netlify.app',
    'pages.dev'
  ];

  // Check if domain uses known JS platforms
  if (jsIndicators.some(indicator => domain.includes(indicator))) {
    return true;
  }

  // Quick HEAD request to check for React/Next.js indicators
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const headers = response.headers;

    // Check server headers
    if (headers.get('x-powered-by')?.includes('Next.js') ||
        headers.get('server')?.includes('Vercel')) {
      return true;
    }
  } catch {
    // If HEAD fails, assume needs JS
    return true;
  }

  return false;
}
```

### Option 2: User Choice

Let users select which backend to use:

```typescript
// Add to your UI
<select value={backend} onChange={(e) => setBackend(e.target.value)}>
  <option value="auto">Auto-detect (Recommended)</option>
  <option value="browser">Browser-based (Faster)</option>
  <option value="railway">Railway (JavaScript Rendering)</option>
</select>
```

### Option 3: Railway-First

Always use Railway backend for all analysis:

```typescript
async function analyzeSite(url: string, progressCallback: Function) {
  return await analyzeWithRailway(url, progressCallback);
}
```

---

## Railway API Integration Example

### Complete Implementation

```typescript
// api/railway-analyzer.ts
export class RailwayAnalyzer {
  private baseUrl = 'https://seo-crawler-production-12b2.up.railway.app';

  async analyzeSite(
    url: string,
    maxPages: number = 100,
    progressCallback?: (progress: CrawlProgress) => void
  ): Promise<CrawlResult> {
    // Start analysis
    progressCallback?.({
      current: 0,
      total: maxPages,
      url: url,
      status: 'Starting Railway crawler...',
      phase: 'discovery'
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/seo/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          maxPages,
          followSitemap: true,
          respectRobotsTxt: true
        })
      });

      if (!response.ok) {
        throw new Error(`Railway API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Transform Railway response to your format
      return this.transformResponse(data.data, url);

    } catch (error) {
      console.error('Railway analysis failed:', error);
      throw error;
    }
  }

  async analyzePage(
    url: string,
    progressCallback?: (progress: CrawlProgress) => void
  ): Promise<CrawlResult> {
    progressCallback?.({
      current: 0,
      total: 1,
      url: url,
      status: 'Analyzing single page with Railway...',
      phase: 'analyzing'
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/seo/analyze-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Railway API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      return this.transformResponse(data.data, url);

    } catch (error) {
      console.error('Railway analysis failed:', error);
      throw error;
    }
  }

  private transformResponse(railwayData: any, domain: string): CrawlResult {
    const pages: PageAnalysis[] = railwayData.pages.map((page: any) => {
      const internalLinks = page.links.filter((l: any) => l.isInternal).length;
      const externalLinks = page.links.filter((l: any) => !l.isInternal).length;

      // Find issues for this specific page
      const pageIssues = railwayData.issues
        .filter((issue: any) => issue.affectedUrls?.includes(page.url))
        .map((issue: any) => ({
          id: crypto.randomUUID(),
          issue_type: issue.type,
          severity: issue.severity,
          description: issue.message,
          recommendation: issue.recommendation
        }));

      return {
        url: page.url,
        full_url: page.url,
        status_code: page.statusCode,
        title: page.title || '',
        meta_description: page.metaDescription || '',
        h1_tags: page.h1Tags,
        word_count: page.wordCount,
        internal_links_count: internalLinks,
        external_links_count: externalLinks,
        canonical_url: page.canonical,
        load_time_ms: page.loadTime,
        crawled_at: new Date().toISOString(),
        issues: pageIssues,
        content_length: page.wordCount * 5,
        has_javascript: true
      };
    });

    // Calculate aggregated issues
    const allIssues = railwayData.issues.map((issue: any) => ({
      id: crypto.randomUUID(),
      issue_type: issue.type,
      severity: issue.severity,
      description: issue.message,
      recommendation: issue.recommendation
    }));

    const summary: CrawlSummary = {
      total_pages: railwayData.totalPages,
      pages_crawled: pages.length,
      errors: railwayData.summary.errors,
      warnings: railwayData.summary.warnings,
      notices: railwayData.summary.notices,
      site_health_score: railwayData.healthScore,
      avg_load_time: pages.reduce((sum, p) => sum + p.load_time_ms, 0) / pages.length,
      issues_by_type: this.groupIssuesByType(allIssues)
    };

    return {
      domain: new URL(domain).hostname,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      pages,
      summary
    };
  }

  private groupIssuesByType(issues: SEOIssue[]): Record<string, number> {
    return issues.reduce((acc, issue) => {
      acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
```

### Usage in Your App.tsx

```typescript
// Update your handleAnalyze function
const handleAnalyze = async () => {
  if (!url) {
    toast({ title: "Please enter a URL", variant: "destructive" });
    return;
  }

  setIsAnalyzing(true);
  setProgress({ current: 0, total: 0, url: "", status: "Initializing..." });

  try {
    // Option 1: Always use Railway
    const railwayAnalyzer = new RailwayAnalyzer();
    const result = await railwayAnalyzer.analyzeSite(url, maxPages, (prog) => {
      setProgress(prog);
    });

    // Option 2: Smart detection
    // const needsJS = await detectJavaScriptSite(url);
    // const analyzer = needsJS
    //   ? new RailwayAnalyzer()
    //   : new SEOAnalyzer(maxPages, (prog) => setProgress(prog));
    // const result = await analyzer.analyzeSite(url);

    setResult(result);
    toast({
      title: "Analysis Complete!",
      description: `Analyzed ${result.summary.pages_crawled} pages with health score: ${result.summary.site_health_score}/100`
    });

  } catch (error) {
    console.error('Analysis error:', error);
    toast({
      title: "Analysis Failed",
      description: error.message,
      variant: "destructive"
    });
  } finally {
    setIsAnalyzing(false);
  }
};
```

---

## Progress Updates Implementation

Since Railway API doesn't support real-time streaming (yet), simulate progress:

```typescript
async analyzeSite(url: string, maxPages: number, progressCallback?: Function) {
  // Simulate progress during API call
  let simulatedProgress = 0;
  const interval = setInterval(() => {
    simulatedProgress += 5;
    if (simulatedProgress < 90) {
      progressCallback?.({
        current: Math.floor((simulatedProgress / 100) * maxPages),
        total: maxPages,
        url: url,
        status: `Analyzing with Railway... ${simulatedProgress}%`,
        phase: 'analyzing',
        estimatedTimeRemaining: `${Math.ceil((100 - simulatedProgress) / 5)}s`
      });
    }
  }, 1000);

  try {
    const response = await fetch(`${this.baseUrl}/api/seo/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, maxPages, followSitemap: true })
    });

    clearInterval(interval);

    // Final progress
    progressCallback?.({
      current: maxPages,
      total: maxPages,
      url: url,
      status: 'Complete!',
      phase: 'complete'
    });

    const data = await response.json();
    return this.transformResponse(data.data, url);

  } catch (error) {
    clearInterval(interval);
    throw error;
  }
}
```

---

## Keep Your PDF Generation

**No changes needed!** Your existing `generatePDF()` function works with both backends:

```typescript
// This still works exactly the same
const generatePDF = () => {
  if (!result) return;

  const doc = new jsPDF();

  // Your existing PDF code...
  // It reads from the same CrawlResult structure

  doc.save(`seo-analysis-${result.domain}-${Date.now()}.pdf`);
};
```

The Railway backend returns data in a compatible structure, so your PDF generation, charts, tables, and all UI components continue working without modification.

---

## Error Handling

```typescript
// Add to your Railway analyzer
try {
  const response = await fetch(`${this.baseUrl}/api/seo/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, maxPages })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  return this.transformResponse(data.data, url);

} catch (error) {
  // Log for debugging
  console.error('Railway API error:', error);

  // Show user-friendly message
  if (error.message.includes('Failed to fetch')) {
    throw new Error('Cannot connect to Railway backend. Please try again.');
  } else if (error.message.includes('timeout')) {
    throw new Error('Analysis timed out. Try reducing maxPages or analyzing a smaller site.');
  } else {
    throw error;
  }
}
```

---

## Testing Checklist

Before deploying to production:

- [ ] Test health endpoint: `GET /health`
- [ ] Test single page: `POST /api/seo/analyze-page` with kctmenswear.com
- [ ] Test full audit: `POST /api/seo/audit` with maxPages: 10
- [ ] Verify data transformation works correctly
- [ ] Confirm PDF generation still works
- [ ] Test error handling (invalid URL, timeout, etc.)
- [ ] Verify progress updates display correctly
- [ ] Test with JavaScript-heavy site (React/Next.js)
- [ ] Test with simple HTML site
- [ ] Compare results: Railway vs Browser-based

---

## Quick Start Integration

**5-Minute Integration:**

1. **Install Railway analyzer:**
   ```bash
   # Copy railway-analyzer.ts to your project
   cp INTEGRATION.md railway-analyzer.ts
   ```

2. **Update App.tsx:**
   ```typescript
   import { RailwayAnalyzer } from './lib/railway-analyzer';

   const handleAnalyze = async () => {
     const analyzer = new RailwayAnalyzer();
     const result = await analyzer.analyzeSite(url, maxPages, setProgress);
     setResult(result);
   };
   ```

3. **Test:**
   ```bash
   npm run dev
   # Try analyzing: https://kctmenswear.com
   ```

That's it! 🎉 Your frontend now uses Railway for JavaScript rendering while keeping all existing features.

---

## Support

- **GitHub**: https://github.com/IbrahimAyad/seo-crawler
- **Railway Dashboard**: https://railway.app
- **API Base URL**: https://seo-crawler-production-12b2.up.railway.app

## Next Steps

1. **Phase 1**: Integrate Railway analyzer alongside existing analyzer (Progressive enhancement)
2. **Phase 2**: Add user choice or auto-detection logic
3. **Phase 3**: Collect feedback and optimize
4. **Future**: Add real-time streaming with Server-Sent Events

---

**Built for MiniMax by Ibrahim Ayad | KCT Menswear**
