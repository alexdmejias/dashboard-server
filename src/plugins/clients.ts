import type { FastifyInstance, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { ZodError, z } from "zod/v4";
import type CallbackBase from "../base-callbacks/base";
import StateMachine from "../stateMachine";
import type { Playlist, PossibleCallbacks, ValidCallback } from "../types";

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
        callbackName: z.literal(Object.keys(possibleCallbacks)),
        options: z.object().optional().default({}),
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
    try {
      const a = possibleCallbacks[playlistItem.callbackName];
      const callbackFn = a.callback;
      const ins = new callbackFn(playlistItem.options) as CallbackBase;

      callbackFn.checkRuntimeConfig(a.expectedConfig, playlistItem.options);

      validCallbacks.push({
        instance: ins,
        id: playlistItem.id,
        name: a.name,
        expectedConfig: a.expectedConfig,
      });
    } catch (e) {
      errors += `Error while validating item "${playlistItem.id}" ${
        e instanceof ZodError
          ? z.prettifyError(e).replaceAll(/\n/g, "")
          : (e as Error).message
      }}`;
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
