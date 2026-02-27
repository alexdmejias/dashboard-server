import type { FastifyInstance, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { ZodError, z } from "zod/v4";
import type CallbackBase from "../base-callbacks/base";
import StateMachine from "../stateMachine";
import type { Playlist, PossibleCallbacks, ValidCallback } from "../types";
import { supportedLayouts } from "../types";

declare module "fastify" {
  interface FastifyInstance {
    getClient(clientName: string): StateMachine;
    getClients(): Record<string, StateMachine>;
    registerClient(
      clientName: string,
      playlist: Playlist,
    ): Promise<StateMachine | { error: string }>;
    updateClientPlaylist(
      clientName: string,
      playlist: Playlist,
    ): Promise<StateMachine | { error: string }>;
    broadcastClientsUpdate(): void;
    addSSEConnection(reply: FastifyReply): void;
    removeSSEConnection(reply: FastifyReply): void;
  }
}

// TODO should this move to a higher level fastify schema validation?
function validatePlaylist(
  _fastify: FastifyInstance,
  playlist: Playlist,
  possibleCallbacks: PossibleCallbacks,
) {
  const validPlaylist = z
    .array(
      z.object({
        id: z.string().min(1, "ID must be a non-empty string"),
        layout: z.enum(supportedLayouts, {
          message: `Layout must be one of: ${supportedLayouts.join(", ")}`,
        }),
        callbacks: z.union([
          z.object({
            content_left: z.object({
              name: z
                .string()
                .min(1, "Callback name must be a non-empty string"),
              options: z.record(z.string(), z.unknown()).optional(),
            }),
            content_right: z.object({
              name: z
                .string()
                .min(1, "Callback name must be a non-empty string"),
              options: z.record(z.string(), z.unknown()).optional(),
            }),
          }),
          z.object({
            content: z.object({
              name: z
                .string()
                .min(1, "Callback name must be a non-empty string"),
              options: z.record(z.string(), z.unknown()).optional(),
            }),
          }),
        ]),
      }),
    )
    .min(1, "Playlist must contain at least one item")
    .check((ctx) => {
      const callbackIds = ctx.value.map((item) => item.id);
      if (callbackIds.length !== new Set(callbackIds).size) {
        ctx.issues.push({
          code: "custom",
          message: "No duplicates playlist item IDs allowed.",
          input: ctx.value,
          continue: true,
        });
      }

      // Validate layout-specific callback structure and slot names
      for (const item of ctx.value) {
        const callbacks = item.callbacks as any;

        if (item.layout === "full") {
          // Full layout must have content slot
          if (!("content" in callbacks)) {
            ctx.issues.push({
              code: "custom",
              message: `Playlist item "${item.id}" with layout "full" must have a "content" callback slot`,
              input: item,
              continue: true,
            });
          }
          // Check for invalid slots in full layout
          const validFullSlots = ["content"];
          const actualSlots = Object.keys(callbacks);
          const invalidSlots = actualSlots.filter(
            (slot) => !validFullSlots.includes(slot),
          );
          if (invalidSlots.length > 0) {
            ctx.issues.push({
              code: "custom",
              message: `Playlist item "${item.id}" with layout "full" has invalid slots: ${invalidSlots.join(", ")}. Only "content" is allowed.`,
              input: item,
              continue: true,
            });
          }
        }

        if (item.layout === "2-col") {
          // 2-col layout must have both content_left and content_right
          const hasLeft = "content_left" in callbacks;
          const hasRight = "content_right" in callbacks;

          if (!hasLeft || !hasRight) {
            const missing = [];
            if (!hasLeft) missing.push("content_left");
            if (!hasRight) missing.push("content_right");
            ctx.issues.push({
              code: "custom",
              message: `Playlist item "${item.id}" with layout "2-col" is missing required callback slots: ${missing.join(", ")}`,
              input: item,
              continue: true,
            });
          }

          // Check for invalid slots in 2-col layout
          const valid2ColSlots = ["content_left", "content_right"];
          const actualSlots = Object.keys(callbacks);
          const invalidSlots = actualSlots.filter(
            (slot) => !valid2ColSlots.includes(slot),
          );
          if (invalidSlots.length > 0) {
            ctx.issues.push({
              code: "custom",
              message: `Playlist item "${item.id}" with layout "2-col" has invalid slots: ${invalidSlots.join(", ")}. Only "content_left" and "content_right" are allowed.`,
              input: item,
              continue: true,
            });
          }
        }

        // Validate that all callback names exist in possibleCallbacks
        const callbackEntries = Object.entries(callbacks) as [
          string,
          { name: string; options?: any },
        ][];
        for (const [slotName, callback] of callbackEntries) {
          if (!(callback.name in possibleCallbacks)) {
            ctx.issues.push({
              code: "custom",
              message: `Callback "${callback.name}" in slot "${slotName}" of playlist item "${item.id}" does not exist in available callbacks`,
              input: callback,
              continue: true,
            });
          }
        }
      }
    });

  return validPlaylist.safeParse(playlist);
}

async function createClientFromPlaylist(
  fastify: FastifyInstance,
  clientName: string,
  playlist: Playlist,
  possibleCallbacks: PossibleCallbacks,
): Promise<StateMachine | { error: string }> {
  fastify.log.info("validating playlist");
  const result = validatePlaylist(fastify, playlist, possibleCallbacks);
  if (!result.success) {
    return {
      error: `Error while validating playlist object, ${z.prettifyError(
        result.error,
      )} `,
    };
  }

  const validCallbacks: ValidCallback[] = [];

  let errors = "";
  for (const playlistItem of playlist) {
    // Get callback entries from the object
    const callbackEntries = Object.entries(playlistItem.callbacks) as [
      string,
      { name: string; options?: any },
    ][];

    for (const [slotName, callback] of callbackEntries) {
      try {
        const callbackDef = possibleCallbacks[callback.name];
        const callbackFn = callbackDef.callback;
        const ins = new callbackFn(callback.options) as CallbackBase;

        callbackFn.checkRuntimeConfig(
          callbackDef.expectedConfig,
          callback.options,
        );

        // Create unique ID: playlistItemId-slotName
        // Use slot name instead of index for clarity
        // const uniqueId = `${playlistItem.id}-${slotName}`;

        validCallbacks.push({
          instance: ins,
          // id: uniqueId,
          name: callbackDef.name,
          expectedConfig: callbackDef.expectedConfig,
        });
      } catch (e) {
        errors += `Error while validating callback "${callback.name}" in slot "${slotName}" of item "${playlistItem.id}": ${
          e instanceof ZodError
            ? z.prettifyError(e).replaceAll(/\n/g, "")
            : (e as Error).message
        } `;
      }
    }
  }

  if (errors) {
    return { error: errors };
  }

  const client = new StateMachine(playlist);
  await client.addCallbacks(validCallbacks);
  return client;
}

function clientsPlugin(
  fastify: FastifyInstance,
  options: {
    possibleCallbacks: PossibleCallbacks;
  },
  done: () => void,
) {
  const { possibleCallbacks } = options;
  const _clients: Record<string, StateMachine> = {};
  const _sseConnections: Set<FastifyReply> = new Set();

  fastify.decorate("getClients", () => {
    const data: Record<string, any> = {};

    Object.keys(_clients).forEach((clientName) => {
      data[clientName] = _clients[clientName].toString();
    });

    return data;
  });

  fastify.decorate("getClient", (clientName: string) => _clients[clientName]);

  fastify.decorate("addSSEConnection", (reply: FastifyReply) => {
    _sseConnections.add(reply);
  });

  fastify.decorate("removeSSEConnection", (reply: FastifyReply) => {
    _sseConnections.delete(reply);
  });

  fastify.decorate("broadcastClientsUpdate", () => {
    const clients = fastify.getClients();
    const message = `data: ${JSON.stringify({ clients })}\n\n`;

    // Create a copy of connections to avoid modification during iteration
    const connections = Array.from(_sseConnections);
    for (const connection of connections) {
      try {
        connection.raw.write(message);
      } catch (err) {
        fastify.log.error({ err }, "Error broadcasting to SSE connection");
        _sseConnections.delete(connection);
      }
    }
  });

  fastify.decorate(
    "registerClient",
    async (clientName: string, playlist: Playlist) => {
      fastify.log.info(`registering client: ${clientName}...`);

      const client = await createClientFromPlaylist(
        fastify,
        clientName,
        playlist,
        possibleCallbacks,
      );

      if ("error" in client) {
        return client;
      }

      _clients[clientName] = client;

      // Broadcast client update to all SSE connections
      fastify.broadcastClientsUpdate();

      return client;
    },
  );

  fastify.decorate(
    "updateClientPlaylist",
    async (clientName: string, playlist: Playlist) => {
      fastify.log.info(`updating playlist for client: ${clientName}...`);

      const client = await createClientFromPlaylist(
        fastify,
        clientName,
        playlist,
        possibleCallbacks,
      );

      if ("error" in client) {
        return client;
      }

      // Replace existing client with updated one
      _clients[clientName] = client;

      // Broadcast client update to all SSE connections
      fastify.broadcastClientsUpdate();

      return client;
    },
  );

  done();
}

export default fp(clientsPlugin, {
  name: "clients",
});
