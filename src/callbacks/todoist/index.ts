import { z } from "zod/v4";
import CallbackBase from "../../base-callbacks/base";

export const expectedConfig = z.object({
  projectId: z.string().optional(),
  filter: z.string().optional(),
  qty: z.number().positive().optional(),
  title: z.string().optional(),
  sections: z
    .array(z.object({ key: z.string(), name: z.string() }))
    .min(1)
    .default([]),
});

type Item = {
  user_id: string;
  id: string;
  project_id: string;
  section_id: string;
  parent_id: null;
  added_by_uid: string;
  assigned_by_uid: null;
  responsible_uid: null;
  labels: string[];
  deadline: null;
  duration: null;
  checked: boolean;
  is_deleted: boolean;
  added_at: string;
  completed_at: null;
  completed_by_uid: null;
  updated_at: string;
  due: null;
  priority: number;
  child_order: number;
  content: string;
  description: string;
  note_count: number;
  day_order: number;
  is_collapsed: boolean;
};

type Section = { key: string; name: string };
type SectionGroup = Section & { items: Item[] };
type Response = {
  results: Item[];
};

type ConfigType = z.infer<typeof expectedConfig>;

type TodoistTemplateData = {
  sections: SectionGroup[];
};

class CallbackTodoist extends CallbackBase<
  TodoistTemplateData,
  typeof expectedConfig
> {
  constructor(options: Partial<ConfigType> = {}) {
    super({
      name: "todoist",
      expectedConfig,
      envVariablesNeeded: ["TODOIST_APIKEY"],
      receivedConfig: options,
      template: "todoist",
      cacheable: false,
    });
  }

  async getData(config: ConfigType = { sections: [] }) {
    const token = process.env.TODOIST_APIKEY;

    try {
      const url = `https://api.todoist.com/api/v1/tasks/filter?query=${encodeURIComponent(config.sections.map((s) => `/${s.name}`).join(" | "))}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        return { error: `Todoist API error: ${res.status} ${text}` };
      }

      const json = (await res.json()) as Response;

      const qty = config.qty ?? 5;

      const items = Array.isArray(json.results)
        ? json.results.slice(0, qty)
        : [];

      const groupedItems: Record<string, Item[]> = {};
      config.sections.forEach((section) => {
        groupedItems[section.name] = [];
      });

      items.forEach((item) => {
        const matchingSection = config.sections.find(
          (section) => item.section_id === section.key,
        );
        if (matchingSection) {
          groupedItems[matchingSection.name].push(item);
          return;
        }
      });

      const orderedSections: SectionGroup[] = config.sections.map(
        (section) => ({
          ...section,
          items: groupedItems[section.name],
        }),
      );

      return {
        sections: orderedSections,
      };
    } catch (err: any) {
      return { error: `Todoist fetch failed: ${err.message ?? String(err)}` };
    }
  }
}

export default CallbackTodoist;
