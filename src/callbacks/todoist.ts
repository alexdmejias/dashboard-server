import CallbackBase from "./base";
import base64Encode from "../utils/base64Encode";
// import { TodoistResponseRoot } from "../types";
import logger from "../logger";

type TodoistTask = {
  creator_id: string;
  created_at: string;
  assignee_id: string;
  assigner_id: string;
  comment_count: number;
  is_completed: boolean;
  content: string;
  description: string;
  due: {
    date: string;
    is_recurring: boolean;
    datetime: string;
    string: string;
    timezone: string;
  };
  deadline: {
    date: string;
  };
  duration: any;
  id: string;
  labels: string[];
  order: number;
  priority: number;
  project_id: string;
  section_id: string;
  parent_id: string;
  url: string;
};

type TodoistTasks = TodoistTask[];

class CallbackTodoist extends CallbackBase<{ markdown: string }> {
  constructor() {
    super({
      name: "Todoist",
      template: "markdown",
      envVariablesNeeded: ["TODOIST_API_TOKEN"],
    });
  }

  getEnvVariables() {
    const apiToken = process.env.TODOIST_API_TOKEN;
    // const secret = process.env.TODOIST_SECRET;
    // const clientId = process.env.Todoist_CLIENTID;
    // const secret = process.env.Todoist_SECRET;

    return {
      apiToken,
      // username,
      // password,
      // clientId,
      // secret,
    };
  }

  async auth() {
    const { apiToken } = this.getEnvVariables();

    // const data = new URLSearchParams({
    //   scope: "data:read",
    //   client_id: clientId as string,
    //   state: 'wasdawasd',
    // });

    // const res = await fetch(`https://todoist.com/oauth/authorize?${data.toString()}`, {
    //   method: "POST",
    //   headers: {
    //     Authorization: "Basic " + base64Encode(`${clientId}:${secret}`),
    //   },
    //   body: data,
    // });

    // const json = await res.json();

    // if (json.error) {
    //   throw new Error(json.error);
    // }

    // return json;
  }

  async getData() {
    try {
      const { apiToken } = this.getEnvVariables();
      // const authJSON = await this.auth();
      // const subTodoist = process.env.Todoist_SUBTodoist;
      // const qty = process.env.Todoist_POST_QTY;

      // if (!qty || !subTodoist) {
      //   throw new Error("missing Todoist subTodoist or Todoist post qty");
      // }

      const dataRes = await fetch(
        `https://api.todoist.com/rest/v2/tasks?project_id=2191472617`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        }
      );

      const json: TodoistTasks = await dataRes.json();
      // const posts = json.data.children.map((p) => ({
      //   title: p.data.title,
      // }));

      // return json;

      console.log("alexalex @@@@@@@@", { apiToken, json });
      return {
        markdown: `# Tasks
${this.buildMarkdown(json)}`,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : (e as string) };
    }
  }

  buildMarkdown(data: TodoistTasks) {
    return data.reduce((acc, curr) => {
      return acc + `\n- ${curr.content}`;
    }, "");
  }
}

export default CallbackTodoist;
