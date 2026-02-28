import fs from "node:fs";
import path from "node:path";
import type { Logger } from "pino";
import { z } from "zod/v4";

import logger from "../logger";
import { getSettings } from "../settings";
import type {
  PossibleTemplateData,
  ScreenshotSizeOption,
  SupportedImageViewType,
  SupportedLayout,
  SupportedViewType,
  TemplateDataError,
} from "../types";
import { renderLiquidFile } from "../utils/getRenderedTemplate";
import { PROJECT_ROOT } from "../utils/projectRoot";

export type CallbackConstructor<ExpectedConfig extends z.ZodTypeAny> = {
  name: string;
  template?: string;
  inRotation?: boolean;
  screenshotSize?: ScreenshotSizeOption;
  cacheable?: boolean;
  envVariablesNeeded?: string[];
  dbSettingsNeeded?: string[];
  receivedConfig?: unknown;
  expectedConfig?: ExpectedConfig;
};

export type RenderResponse =
  | {
      viewType: SupportedImageViewType;
      imagePath: string;
    }
  | {
      viewType: "html";
      html: string;
    }
  | {
      viewType: "json";
      json: object;
    }
  | {
      viewType: "error";
      error: string;
    };

class CallbackBase<
  TemplateData extends object = object,
  ExpectedConfig extends z.ZodObject = z.ZodObject,
> {
  // static defaults can be overridden by child classes
  static defaultOptions?: unknown;
  name: string;
  template: string;
  dataFile?: string;
  inRotation: boolean;
  logger: Logger;
  screenshotSize: ScreenshotSizeOption;
  cacheable = false;
  oldDataCache = "";
  envVariablesNeeded: string[] = [];
  dbSettingsNeeded: string[] = [];
  receivedConfig?: unknown;
  expectedConfig?: ExpectedConfig;

  constructor({
    name,
    template,
    inRotation = false,
    screenshotSize,
    cacheable = false,
    envVariablesNeeded = [],
    dbSettingsNeeded = [],
    receivedConfig,
    expectedConfig,
  }: CallbackConstructor<ExpectedConfig>) {
    this.name = name;
    this.inRotation = inRotation;
    this.template = this.#resolveTemplate(name, template);
    this.logger = logger;
    this.screenshotSize = screenshotSize || {
      width: 1200,
      height: 825,
    };
    this.cacheable = cacheable;
    this.envVariablesNeeded = envVariablesNeeded;
    this.dbSettingsNeeded = dbSettingsNeeded;
    this.expectedConfig = expectedConfig;

    // Merge defaults from the child's static defaultOptions with receivedConfig.
    const ctor = this.constructor as typeof CallbackBase & {
      defaultOptions?: unknown;
    };
    const defaults = (ctor.defaultOptions ?? {}) as unknown;

    if (expectedConfig) {
      // Use zod to validate and fill defaults
      try {
        this.receivedConfig = (
          this.constructor as typeof CallbackBase
        ).mergeWithDefaults(
          expectedConfig as any,
          defaults as any,
          receivedConfig as any,
        );
      } catch (e) {
        // rethrow to surface config validation errors during construction
        throw e;
      }
    } else {
      // shallow merge when no schema is provided
      this.receivedConfig = {
        ...(defaults as Record<string, unknown>),
        ...(typeof receivedConfig === "object" && receivedConfig
          ? (receivedConfig as Record<string, unknown>)
          : {}),
      };
    }

    if (this.envVariablesNeeded.length) {
      this.checkEnvVariables();
    }

    if (this.dbSettingsNeeded.length) {
      this.checkDBSettings();
    }
  }

  toString() {
    const data: Record<string, any> = {
      cacheable: this.cacheable,
      screenshotSize: this.screenshotSize,
      envVariablesNeeded: this.envVariablesNeeded,
      dbSettingsNeeded: this.dbSettingsNeeded,
      template: this.template,
      receivedConfig: this.receivedConfig,
    };

    if (
      this.expectedConfig &&
      typeof this.expectedConfig.transform !== "function"
    ) {
      data.expectedConfig = z.toJSONSchema(this.expectedConfig);
    }
    return data;
  }

  getData(_config: any): PossibleTemplateData<TemplateData> {
    throw new Error(
      `getData method not implemented for callback: ${this.name}`,
    );
  }

  getEnvVariables(): Record<string, string | undefined> {
    return {};
  }

  checkEnvVariables() {
    const missingKeys: string[] = [];
    for (const key of this.envVariablesNeeded) {
      if (!process.env[key]) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length) {
      const message = `${
        this.name
      } callback requires the following environment variable(s): ${missingKeys.join(
        ", ",
      )}`;
      this.logger.error(message);
      throw new Error(message);
    }

    return true;
  }

  checkDBSettings() {
    const missingKeys: string[] = [];
    const settings = getSettings();
    for (const key of this.dbSettingsNeeded) {
      if (!settings[key as keyof typeof settings]) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length) {
      const message = `${
        this.name
      } callback requires the following settings to be configured: ${missingKeys.join(
        ", ",
      )}`;
      this.logger.error(message);
      throw new Error(message);
    }

    return true;
  }

  static checkRuntimeConfig(
    expectedConfig?: z.ZodTypeAny,
    receivedConfig?: unknown,
  ) {
    if (expectedConfig) {
      const result = expectedConfig.safeParse(receivedConfig, {
        reportInput: true,
      });
      if (!result.success) {
        throw result.error;
      }
    }
    return true;
  }

  /**
   * Utility to merge default config with provided options, using zod for type safety.
   */
  static mergeWithDefaults<ConfigType extends object>(
    expectedConfig: z.ZodType,
    defaults: ConfigType,
    options?: Partial<ConfigType>,
  ): ConfigType {
    const merged = { ...defaults, ...(options || {}) };
    const result = expectedConfig.safeParse(merged);
    if (!result.success) {
      throw result.error;
    }
    return result.data as ConfigType;
  }

  async render(
    viewType: SupportedViewType,
    options?: unknown,
    layout?: SupportedLayout,
  ): Promise<RenderResponse> {
    // TODO validate viewType
    this.logger.info(`rendering: ${this.name} as viewType: ${viewType}`);

    // allow callers to supply runtime options (e.g. from a playlist item).
    const runtimeConfig = this.#buildRuntimeConfig(options);
    this.logger.debug(
      { runtimeConfig, options },
      `Built runtimeConfig for ${this.name}`,
    );
    const data = await this.getData(
      runtimeConfig as unknown as Record<string, unknown>,
    );

    let templateOverride: string | undefined;

    if ("error" in data) {
      templateOverride = "error";
      return {
        viewType: "error",
        error: data.error,
      };
    }

    // Resolve layout-specific template if layout is provided
    this.logger.debug(
      { layout, hasLayout: !!layout },
      `Resolving template for ${this.name}`,
    );
    const templateToUse = layout
      ? this.resolveLayoutTemplate(layout)
      : this.template;

    if (viewType === "html") {
      // TODO should also implement a caching strategy?
      return {
        viewType,
        html: await this.#renderAsHTML({
          data,
          template: templateOverride,
          runtimeConfig: runtimeConfig as ExpectedConfig,
          templateToUse,
        }),
      };
    }

    return { viewType: "json", json: data as object };
  }

  async #renderAsHTML({
    data,
    template,
    runtimeConfig,
    templateToUse,
  }: {
    data: TemplateDataError | TemplateData;
    template?: string;
    runtimeConfig?: ExpectedConfig;
    templateToUse?: string;
    includeWrapper?: boolean;
  }) {
    return renderLiquidFile(
      template ? template : templateToUse || this.template,
      { data, runtimeConfig },
    );
  }

  #buildRuntimeConfig(options?: unknown) {
    const merged =
      typeof options === "undefined"
        ? this.receivedConfig
        : this.#mergeWithReceivedConfig(options);

    if (!this.expectedConfig) {
      return merged;
    }

    return this.expectedConfig.loose().parse(merged);
  }

  #mergeWithReceivedConfig(options: unknown) {
    if (
      typeof options === "object" &&
      options !== null &&
      typeof this.receivedConfig === "object" &&
      this.receivedConfig !== null
    ) {
      return {
        ...(this.receivedConfig as Record<string, unknown>),
        ...(options as Record<string, unknown>),
      };
    }

    return options;
  }

  /**
   * Resolve a layout-specific template for this callback
   * For 2-col layout, tries to load template.2col.{ext} first
   * Falls back to the default template if layout-specific template doesn't exist
   */
  resolveLayoutTemplate(layout: SupportedLayout): string {
    // Try to find layout-specific template: template.{layout}.liquid
    const layoutFileName = layout; // "2-col" or "full"
    const layoutSpecific = path.join(
      PROJECT_ROOT,
      `src/callbacks/${this.name}/template.${layoutFileName}.liquid`,
    );

    if (fs.existsSync(layoutSpecific)) {
      this.logger.info(
        `Using layout-specific template for ${this.name}: ${layoutSpecific}`,
      );
      return layoutSpecific;
    }

    this.logger.debug(
      `No layout-specific template found for ${this.name} at: ${layoutSpecific}, using default`,
    );

    // Fallback to default template
    return this.template;
  }

  #resolveTemplate(name: string, template?: string): string {
    // 1) If a specific template was requested, prefer resolving that first
    if (template) {
      // try exact resolution in callbacks folder if the template includes an ext or matches a preference
      const candidate = path.join(
        PROJECT_ROOT,
        `src/callbacks/${name}/${template}`,
      );
      if (fs.existsSync(candidate)) return candidate;
      const viewsCandidate = path.join(PROJECT_ROOT, `views/${template}`);
      if (fs.existsSync(viewsCandidate)) return viewsCandidate;

      // try templates folder (views) with preferred extensions
      const viewsPath = path.join(PROJECT_ROOT, `views/${template}.liquid`);
      if (fs.existsSync(viewsPath)) return viewsPath;
    }

    // 2) Look for callback-local templates (template.liquid)
    const local = path.join(
      PROJECT_ROOT,
      `src/callbacks/${name}/template.liquid`,
    );
    if (fs.existsSync(local)) return local;

    // 3) Fallback to views/{name}.{ext}
    const viewsPath = path.join(PROJECT_ROOT, `views/${name}.liquid`);
    if (fs.existsSync(viewsPath)) return viewsPath;

    throw new Error(`No valid template found for callback: ${name}`);
  }
}

export default CallbackBase;
