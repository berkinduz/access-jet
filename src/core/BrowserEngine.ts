import { chromium, Browser, BrowserContext } from "playwright";

export class BrowserEngine {
  private static instance: BrowserEngine;
  private browser: Browser | null = null;

  private constructor() {}

  static getInstance(): BrowserEngine {
    if (!BrowserEngine.instance) {
      BrowserEngine.instance = new BrowserEngine();
    }
    return BrowserEngine.instance;
  }

  async init(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.browser) throw new Error("Browser not initialized");
    return this.browser.newContext();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
