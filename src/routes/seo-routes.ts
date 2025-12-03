/**
 * SEO Audit API Routes
 */

import { Router, Request, Response } from 'express';
import { seoCrawlerService } from '../services/seo-crawler-service';
import { seoAuditService } from '../services/seo-audit-service';

const router = Router();

/**
 * POST /api/seo/audit
 * Run full SEO audit on a website
 */
router.post('/audit', async (req: Request, res: Response) => {
  try {
    const {
      url,
      maxPages = 100,
      followSitemap = true,
      respectRobotsTxt = true,
      waitForSelector,
    } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    console.log(`Starting SEO audit for: ${url}`);

    // Crawl the site
    const pages = await seoCrawlerService.crawlSite({
      url,
      maxPages,
      followSitemap,
      respectRobotsTxt,
      waitForSelector,
    });

    console.log(`Crawled ${pages.length} pages, running analysis...`);

    // Run audit
    const report = seoAuditService.audit(pages, url);

    // Close browser to free resources
    await seoCrawlerService.closeBrowser();

    console.log(`Audit complete. Health score: ${report.healthScore}/100`);

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('SEO audit error:', error);

    // Make sure to close browser on error
    await seoCrawlerService.closeBrowser().catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete SEO audit',
    });
  }
});

/**
 * POST /api/seo/analyze-page
 * Analyze a single page (faster, no crawling)
 */
router.post('/analyze-page', async (req: Request, res: Response) => {
  try {
    const { url, waitForSelector } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    console.log(`Analyzing single page: ${url}`);

    // Analyze single page
    const analysis = await seoCrawlerService.analyzePage(url, waitForSelector);

    // Run audit on single page
    const report = seoAuditService.audit([analysis], url);

    // Close browser
    await seoCrawlerService.closeBrowser();

    res.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    console.error('Page analysis error:', error);

    await seoCrawlerService.closeBrowser().catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze page',
    });
  }
});

/**
 * GET /api/seo/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'SEO Crawler API',
    version: '1.0.0',
  });
});

export default router;
