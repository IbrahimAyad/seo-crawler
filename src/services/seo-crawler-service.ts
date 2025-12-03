/**
 * SEO Crawler Service
 * Handles JavaScript-rendered site crawling with Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

export interface CrawlConfig {
  url: string;
  maxPages?: number;
  followSitemap?: boolean;
  respectRobotsTxt?: boolean;
  waitForSelector?: string;
  timeout?: number;
}

export interface PageAnalysis {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1Tags: string[];
  h2Tags: string[];
  wordCount: number;
  images: ImageInfo[];
  links: LinkInfo[];
  canonical: string | null;
  ogTags: Record<string, string>;
  twitterTags: Record<string, string>;
  schemaMarkup: any[];
  loadTime: number;
  statusCode: number;
}

export interface ImageInfo {
  src: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  sizeKB?: number;
}

export interface LinkInfo {
  href: string;
  text: string;
  isInternal: boolean;
  isNofollow: boolean;
}

export class SEOCrawlerService {
  private browser: Browser | null = null;

  /**
   * Initialize browser instance
   */
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Fetch and render a single page
   */
  async fetchPage(url: string, waitForSelector?: string, timeout = 30000): Promise<{
    html: string;
    statusCode: number;
    loadTime: number;
  }> {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    const startTime = Date.now();

    try {
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (compatible; KCT-SEO-Crawler/1.0; +https://kctmenswear.com)'
      );

      // Navigate and wait for network to be idle
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout,
      });

      // Wait for specific selector if provided
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: 5000 }).catch(() => {
          console.warn(`Selector ${waitForSelector} not found, continuing...`);
        });
      }

      // Additional wait for JavaScript to execute
      await page.waitForTimeout(2000);

      const html = await page.content();
      const statusCode = response?.status() || 0;
      const loadTime = Date.now() - startTime;

      await page.close();

      return { html, statusCode, loadTime };
    } catch (error) {
      await page.close();
      throw error;
    }
  }

  /**
   * Analyze a single page for SEO issues
   */
  async analyzePage(url: string, waitForSelector?: string): Promise<PageAnalysis> {
    const { html, statusCode, loadTime } = await this.fetchPage(url, waitForSelector);
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() || null;

    // Extract meta description
    const metaDescription =
      $('meta[name="description"]').attr('content')?.trim() || null;

    // Extract H1 tags
    const h1Tags: string[] = [];
    $('h1').each((_, el) => {
      h1Tags.push($(el).text().trim());
    });

    // Extract H2 tags
    const h2Tags: string[] = [];
    $('h2').each((_, el) => {
      h2Tags.push($(el).text().trim());
    });

    // Count words in body
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(' ').filter((w) => w.length > 0).length;

    // Extract images
    const images: ImageInfo[] = [];
    $('img').each((_, el) => {
      images.push({
        src: $(el).attr('src') || '',
        alt: $(el).attr('alt') || null,
        width: parseInt($(el).attr('width') || '0') || null,
        height: parseInt($(el).attr('height') || '0') || null,
      });
    });

    // Extract links
    const baseDomain = new URL(url).hostname;
    const links: LinkInfo[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      const rel = $(el).attr('rel') || '';

      let isInternal = false;
      try {
        const linkUrl = new URL(href, url);
        isInternal = linkUrl.hostname === baseDomain;
      } catch {
        isInternal = href.startsWith('/') || !href.startsWith('http');
      }

      links.push({
        href,
        text,
        isInternal,
        isNofollow: rel.includes('nofollow'),
      });
    });

    // Extract canonical
    const canonical = $('link[rel="canonical"]').attr('href') || null;

    // Extract Open Graph tags
    const ogTags: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const property = $(el).attr('property');
      const content = $(el).attr('content');
      if (property && content) {
        ogTags[property] = content;
      }
    });

    // Extract Twitter Card tags
    const twitterTags: Record<string, string> = {};
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name');
      const content = $(el).attr('content');
      if (name && content) {
        twitterTags[name] = content;
      }
    });

    // Extract schema markup
    const schemaMarkup: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        schemaMarkup.push(json);
      } catch {
        // Invalid JSON, skip
      }
    });

    return {
      url,
      title,
      metaDescription,
      h1Tags,
      h2Tags,
      wordCount,
      images,
      links,
      canonical,
      ogTags,
      twitterTags,
      schemaMarkup,
      loadTime,
      statusCode,
    };
  }

  /**
   * Fetch and parse sitemap.xml
   */
  async fetchSitemap(sitemapUrl: string): Promise<string[]> {
    try {
      const { html } = await this.fetchPage(sitemapUrl);
      const $ = cheerio.load(html, { xmlMode: true });

      const urls: string[] = [];

      // Handle sitemap index
      $('sitemap loc').each((_, el) => {
        urls.push($(el).text().trim());
      });

      // Handle URL set
      $('url loc').each((_, el) => {
        urls.push($(el).text().trim());
      });

      // If sitemap index, recursively fetch child sitemaps
      if ($('sitemap').length > 0) {
        const childUrls: string[] = [];
        for (const childSitemap of urls) {
          const childSitemapUrls = await this.fetchSitemap(childSitemap);
          childUrls.push(...childSitemapUrls);
        }
        return childUrls;
      }

      return urls;
    } catch (error) {
      console.error('Error fetching sitemap:', error);
      return [];
    }
  }

  /**
   * Fetch and parse robots.txt
   */
  async fetchRobotsTxt(baseUrl: string): Promise<{
    sitemaps: string[];
    disallowed: string[];
    crawlDelay: number | null;
  }> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const { html } = await this.fetchPage(robotsUrl);

      const lines = html.split('\n');
      const sitemaps: string[] = [];
      const disallowed: string[] = [];
      let crawlDelay: number | null = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('sitemap:')) {
          sitemaps.push(trimmed.substring(8).trim());
        } else if (trimmed.toLowerCase().startsWith('disallow:')) {
          disallowed.push(trimmed.substring(9).trim());
        } else if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
          crawlDelay = parseInt(trimmed.substring(12).trim()) || null;
        }
      }

      return { sitemaps, disallowed, crawlDelay };
    } catch (error) {
      console.error('Error fetching robots.txt:', error);
      return { sitemaps: [], disallowed: [], crawlDelay: null };
    }
  }

  /**
   * Crawl multiple pages from a site
   */
  async crawlSite(config: CrawlConfig): Promise<PageAnalysis[]> {
    const {
      url,
      maxPages = 100,
      followSitemap = true,
      respectRobotsTxt = true,
    } = config;

    const baseUrl = new URL(url).origin;
    const results: PageAnalysis[] = [];
    const urlsToCrawl: Set<string> = new Set([url]);
    const crawledUrls: Set<string> = new Set();

    // Fetch robots.txt
    let robotsTxt = { sitemaps: [], disallowed: [], crawlDelay: null };
    if (respectRobotsTxt) {
      robotsTxt = await this.fetchRobotsTxt(baseUrl);
      console.log(`Crawl delay from robots.txt: ${robotsTxt.crawlDelay || 0}ms`);
    }

    // Fetch sitemap if enabled
    if (followSitemap) {
      const sitemapUrls =
        robotsTxt.sitemaps.length > 0
          ? robotsTxt.sitemaps
          : [`${baseUrl}/sitemap.xml`];

      for (const sitemapUrl of sitemapUrls) {
        const urls = await this.fetchSitemap(sitemapUrl);
        urls.forEach((u) => urlsToCrawl.add(u));
      }
    }

    console.log(`Found ${urlsToCrawl.size} URLs to crawl`);

    // Crawl pages
    for (const pageUrl of Array.from(urlsToCrawl)) {
      if (crawledUrls.size >= maxPages) {
        console.log(`Reached max pages limit: ${maxPages}`);
        break;
      }

      if (crawledUrls.has(pageUrl)) {
        continue;
      }

      try {
        console.log(`Crawling: ${pageUrl}`);
        const analysis = await this.analyzePage(pageUrl);
        results.push(analysis);
        crawledUrls.add(pageUrl);

        // Add internal links to crawl queue
        analysis.links
          .filter((link) => link.isInternal && !link.isNofollow)
          .forEach((link) => {
            try {
              const absoluteUrl = new URL(link.href, pageUrl).toString();
              if (!crawledUrls.has(absoluteUrl)) {
                urlsToCrawl.add(absoluteUrl);
              }
            } catch {
              // Invalid URL, skip
            }
          });

        // Respect crawl delay
        if (robotsTxt.crawlDelay) {
          await new Promise((resolve) =>
            setTimeout(resolve, robotsTxt.crawlDelay! * 1000)
          );
        } else {
          // Default 1 second delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error crawling ${pageUrl}:`, error);
      }
    }

    return results;
  }
}

// Singleton instance
export const seoCrawlerService = new SEOCrawlerService();
