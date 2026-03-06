import logger from "../logger";
import type {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../types/browser-renderer";

export interface ServiceConfig {
  name: string;
  renderer: BrowserRenderer;
}

class ServiceRotator implements BrowserRenderer {
  private services: ServiceConfig[];
  private currentIndex: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(services: ServiceConfig[]) {
    if (services.length === 0) {
      throw new Error("ServiceRotator requires at least one service");
    }
    this.services = services;
    this.currentIndex = 0;
  }

  // Enqueue requests so only one runs at a time. Each call waits for the
  // previous to finish before starting, preserving strict round-robin order.
  async renderPage(options: RenderOptions): Promise<RenderResult> {
    return new Promise<RenderResult>((resolve, reject) => {
      this.queue = this.queue.then(() =>
        this.executeRender(options).then(resolve, reject),
      );
    });
  }

  private async executeRender(options: RenderOptions): Promise<RenderResult> {
    const errors: Array<{ service: string; error: Error }> = [];
    const totalServices = this.services.length;
    const maxAttempts = Math.min(totalServices, 3);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const service = this.services[this.currentIndex];

      // Advance index after each attempt so the next request (or next retry)
      // always picks up from where we left off.
      this.currentIndex = (this.currentIndex + 1) % totalServices;

      try {
        logger.info(`Attempting to render with service: ${service.name}`);
        const result = await service.renderer.renderPage(options);
        logger.info(`Successfully rendered with service: ${service.name}`);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ service: service.name, error: err });
        logger.warn(
          { err, service: service.name },
          `Service ${service.name} failed, trying next service`,
        );
      }
    }

    // All services failed
    const errorMessages = errors
      .map((e) => `${e.service}: ${e.error.message}`)
      .join("; ");
    throw new Error(`All rendering services failed: ${errorMessages}`);
  }

  getServices(): string[] {
    return this.services.map((s) => s.name);
  }
}

export default ServiceRotator;
