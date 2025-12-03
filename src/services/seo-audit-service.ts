/**
 * SEO Audit Service
 * Analyzes pages and generates SEO reports with scoring
 */

import { PageAnalysis } from './seo-crawler-service';

export type IssueSeverity = 'error' | 'warning' | 'notice';

export interface SEOIssue {
  type: string;
  severity: IssueSeverity;
  message: string;
  affectedUrls: string[];
  recommendation: string;
}

export interface SEOAuditReport {
  url: string;
  crawledAt: string;
  totalPages: number;
  healthScore: number;
  issues: SEOIssue[];
  summary: {
    errors: number;
    warnings: number;
    notices: number;
  };
  pages: PageAnalysis[];
}

export class SEOAuditService {
  /**
   * Run full SEO audit on page analyses
   */
  audit(pages: PageAnalysis[], baseUrl: string): SEOAuditReport {
    const issues: SEOIssue[] = [];

    // Run all checks
    issues.push(...this.checkTitles(pages));
    issues.push(...this.checkMetaDescriptions(pages));
    issues.push(...this.checkH1Tags(pages));
    issues.push(...this.checkImages(pages));
    issues.push(...this.checkContent(pages));
    issues.push(...this.checkCanonical(pages));
    issues.push(...this.checkOpenGraph(pages));
    issues.push(...this.checkSchema(pages));
    issues.push(...this.checkBrokenLinks(pages));
    issues.push(...this.checkSSL(pages));
    issues.push(...this.checkDuplicates(pages));

    // Calculate summary
    const summary = {
      errors: issues.filter((i) => i.severity === 'error').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      notices: issues.filter((i) => i.severity === 'notice').length,
    };

    // Calculate health score
    const healthScore = this.calculateHealthScore(summary, pages.length);

    return {
      url: baseUrl,
      crawledAt: new Date().toISOString(),
      totalPages: pages.length,
      healthScore,
      issues,
      summary,
      pages,
    };
  }

  /**
   * Check title tags
   */
  private checkTitles(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const missingTitles = pages.filter((p) => !p.title);
    if (missingTitles.length > 0) {
      issues.push({
        type: 'missing_title',
        severity: 'error',
        message: `${missingTitles.length} page(s) missing title tag`,
        affectedUrls: missingTitles.map((p) => p.url),
        recommendation:
          'Add a unique, descriptive title tag to each page (30-60 characters)',
      });
    }

    const shortTitles = pages.filter((p) => p.title && p.title.length < 30);
    if (shortTitles.length > 0) {
      issues.push({
        type: 'title_too_short',
        severity: 'warning',
        message: `${shortTitles.length} page(s) with title tags shorter than 30 characters`,
        affectedUrls: shortTitles.map((p) => p.url),
        recommendation: 'Expand title tags to at least 30 characters for better SEO',
      });
    }

    const longTitles = pages.filter((p) => p.title && p.title.length > 60);
    if (longTitles.length > 0) {
      issues.push({
        type: 'title_too_long',
        severity: 'warning',
        message: `${longTitles.length} page(s) with title tags longer than 60 characters`,
        affectedUrls: longTitles.map((p) => p.url),
        recommendation: 'Shorten title tags to 60 characters or less to avoid truncation',
      });
    }

    return issues;
  }

  /**
   * Check meta descriptions
   */
  private checkMetaDescriptions(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const missingDesc = pages.filter((p) => !p.metaDescription);
    if (missingDesc.length > 0) {
      issues.push({
        type: 'missing_meta_description',
        severity: 'error',
        message: `${missingDesc.length} page(s) missing meta description`,
        affectedUrls: missingDesc.map((p) => p.url),
        recommendation:
          'Add a compelling meta description to each page (120-160 characters)',
      });
    }

    const shortDesc = pages.filter(
      (p) => p.metaDescription && p.metaDescription.length < 120
    );
    if (shortDesc.length > 0) {
      issues.push({
        type: 'meta_description_too_short',
        severity: 'warning',
        message: `${shortDesc.length} page(s) with meta description shorter than 120 characters`,
        affectedUrls: shortDesc.map((p) => p.url),
        recommendation: 'Expand meta descriptions to at least 120 characters',
      });
    }

    const longDesc = pages.filter(
      (p) => p.metaDescription && p.metaDescription.length > 160
    );
    if (longDesc.length > 0) {
      issues.push({
        type: 'meta_description_too_long',
        severity: 'warning',
        message: `${longDesc.length} page(s) with meta description longer than 160 characters`,
        affectedUrls: longDesc.map((p) => p.url),
        recommendation: 'Shorten meta descriptions to 160 characters or less',
      });
    }

    return issues;
  }

  /**
   * Check H1 tags
   */
  private checkH1Tags(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const missingH1 = pages.filter((p) => p.h1Tags.length === 0);
    if (missingH1.length > 0) {
      issues.push({
        type: 'missing_h1',
        severity: 'error',
        message: `${missingH1.length} page(s) missing H1 tag`,
        affectedUrls: missingH1.map((p) => p.url),
        recommendation: 'Add exactly one H1 tag to each page with the main heading',
      });
    }

    const multipleH1 = pages.filter((p) => p.h1Tags.length > 1);
    if (multipleH1.length > 0) {
      issues.push({
        type: 'multiple_h1',
        severity: 'error',
        message: `${multipleH1.length} page(s) with multiple H1 tags`,
        affectedUrls: multipleH1.map((p) => p.url),
        recommendation: 'Use only one H1 tag per page for proper heading structure',
      });
    }

    return issues;
  }

  /**
   * Check images
   */
  private checkImages(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const pagesWithMissingAlt: string[] = [];
    pages.forEach((page) => {
      const missingAlt = page.images.filter((img) => !img.alt);
      if (missingAlt.length > 0) {
        pagesWithMissingAlt.push(page.url);
      }
    });

    if (pagesWithMissingAlt.length > 0) {
      issues.push({
        type: 'missing_image_alt',
        severity: 'warning',
        message: `${pagesWithMissingAlt.length} page(s) with images missing alt text`,
        affectedUrls: pagesWithMissingAlt,
        recommendation:
          'Add descriptive alt text to all images for accessibility and SEO',
      });
    }

    return issues;
  }

  /**
   * Check content length
   */
  private checkContent(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const thinContent = pages.filter((p) => p.wordCount < 300);
    if (thinContent.length > 0) {
      issues.push({
        type: 'thin_content',
        severity: 'warning',
        message: `${thinContent.length} page(s) with less than 300 words`,
        affectedUrls: thinContent.map((p) => p.url),
        recommendation:
          'Add more substantive content (at least 300 words) to improve SEO value',
      });
    }

    return issues;
  }

  /**
   * Check canonical tags
   */
  private checkCanonical(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const missingCanonical = pages.filter((p) => !p.canonical);
    if (missingCanonical.length > 0) {
      issues.push({
        type: 'missing_canonical',
        severity: 'notice',
        message: `${missingCanonical.length} page(s) missing canonical tag`,
        affectedUrls: missingCanonical.map((p) => p.url),
        recommendation:
          'Add canonical tags to prevent duplicate content issues',
      });
    }

    return issues;
  }

  /**
   * Check Open Graph tags
   */
  private checkOpenGraph(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const missingOG = pages.filter(
      (p) => !p.ogTags['og:title'] || !p.ogTags['og:description']
    );
    if (missingOG.length > 0) {
      issues.push({
        type: 'missing_open_graph',
        severity: 'notice',
        message: `${missingOG.length} page(s) missing Open Graph tags`,
        affectedUrls: missingOG.map((p) => p.url),
        recommendation:
          'Add og:title, og:description, og:image for better social sharing',
      });
    }

    return issues;
  }

  /**
   * Check schema markup
   */
  private checkSchema(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const missingSchema = pages.filter((p) => p.schemaMarkup.length === 0);
    if (missingSchema.length > 0) {
      issues.push({
        type: 'missing_schema',
        severity: 'notice',
        message: `${missingSchema.length} page(s) missing structured data (schema.org)`,
        affectedUrls: missingSchema.map((p) => p.url),
        recommendation:
          'Add JSON-LD structured data (Organization, LocalBusiness, Product, etc.)',
      });
    }

    return issues;
  }

  /**
   * Check for broken links
   */
  private checkBrokenLinks(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Check for pages with status code errors
    const brokenPages = pages.filter(
      (p) => p.statusCode >= 400 && p.statusCode < 600
    );
    if (brokenPages.length > 0) {
      issues.push({
        type: 'broken_pages',
        severity: 'error',
        message: `${brokenPages.length} page(s) returning error status codes`,
        affectedUrls: brokenPages.map((p) => `${p.url} (${p.statusCode})`),
        recommendation: 'Fix or redirect broken pages to improve user experience',
      });
    }

    return issues;
  }

  /**
   * Check SSL/HTTPS
   */
  private checkSSL(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    const httpPages = pages.filter((p) => p.url.startsWith('http://'));
    if (httpPages.length > 0) {
      issues.push({
        type: 'missing_ssl',
        severity: 'error',
        message: `${httpPages.length} page(s) not using HTTPS`,
        affectedUrls: httpPages.map((p) => p.url),
        recommendation:
          'Implement SSL certificate and redirect all HTTP traffic to HTTPS',
      });
    }

    return issues;
  }

  /**
   * Check for duplicate content
   */
  private checkDuplicates(pages: PageAnalysis[]): SEOIssue[] {
    const issues: SEOIssue[] = [];

    // Check duplicate titles
    const titleMap = new Map<string, string[]>();
    pages.forEach((page) => {
      if (page.title) {
        if (!titleMap.has(page.title)) {
          titleMap.set(page.title, []);
        }
        titleMap.get(page.title)!.push(page.url);
      }
    });

    const duplicateTitles = Array.from(titleMap.entries()).filter(
      ([_, urls]) => urls.length > 1
    );
    if (duplicateTitles.length > 0) {
      const affectedUrls = duplicateTitles.flatMap(([title, urls]) =>
        urls.map((url) => `${url} (${title})`)
      );
      issues.push({
        type: 'duplicate_titles',
        severity: 'warning',
        message: `${duplicateTitles.length} duplicate title tag(s) found`,
        affectedUrls,
        recommendation: 'Create unique title tags for each page',
      });
    }

    // Check duplicate meta descriptions
    const descMap = new Map<string, string[]>();
    pages.forEach((page) => {
      if (page.metaDescription) {
        if (!descMap.has(page.metaDescription)) {
          descMap.set(page.metaDescription, []);
        }
        descMap.get(page.metaDescription)!.push(page.url);
      }
    });

    const duplicateDescs = Array.from(descMap.entries()).filter(
      ([_, urls]) => urls.length > 1
    );
    if (duplicateDescs.length > 0) {
      const affectedUrls = duplicateDescs.flatMap(([_, urls]) => urls);
      issues.push({
        type: 'duplicate_meta_descriptions',
        severity: 'warning',
        message: `${duplicateDescs.length} duplicate meta description(s) found`,
        affectedUrls,
        recommendation: 'Write unique meta descriptions for each page',
      });
    }

    return issues;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(
    summary: { errors: number; warnings: number; notices: number },
    totalPages: number
  ): number {
    // Start with perfect score
    let score = 100;

    // Deduct points based on issues per page
    const errorsPerPage = summary.errors / totalPages;
    const warningsPerPage = summary.warnings / totalPages;
    const noticesPerPage = summary.notices / totalPages;

    // Errors: -10 points each (max -40)
    score -= Math.min(errorsPerPage * 10, 40);

    // Warnings: -5 points each (max -30)
    score -= Math.min(warningsPerPage * 5, 30);

    // Notices: -2 points each (max -20)
    score -= Math.min(noticesPerPage * 2, 20);

    return Math.max(0, Math.round(score));
  }
}

// Singleton instance
export const seoAuditService = new SEOAuditService();
