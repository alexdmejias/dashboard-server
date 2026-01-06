import {
  BrowserRenderer,
  RenderOptions,
  RenderResult,
} from "../types/browser-renderer";
import logger from "../logger";

export interface ServiceConfig {
  name: string;
  renderer: BrowserRenderer;
}

class ServiceRotator implements BrowserRenderer {
  private services: ServiceConfig[];
  private currentIndex: number;

  constructor(services: ServiceConfig[]) {
    if (services.length === 0) {
      throw new Error("ServiceRotator requires at least one service");
    }
    this.services = services;
    this.currentIndex = 0;
  }

  async renderPage(options: RenderOptions): Promise<RenderResult> {
    const errors: Array<{ service: string; error: Error }> = [];
    const totalServices = this.services.length;

    // Try each service in round-robin order
    for (let attempt = 0; attempt < totalServices; attempt++) {
      const service = this.services[this.currentIndex];
      
      // Move to next service for next request
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
          { error: err, service: service.name },
          `Service ${service.name} failed, trying next service`
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
