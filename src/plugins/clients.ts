import type { FastifyInstance } from "fastify";
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

function clientsPlugin(
  fastify: FastifyInstance,
  options: {
    possibleCallbacks: PossibleCallbacks;
  },
  done: () => void,
) {
  const { possibleCallbacks } = options;
  const clients: Record<string, StateMachine> = {};

  fastify.decorate("getClients", () => clients);

  fastify.decorate("getClient", (clientName: string) => clients[clientName]);

  fastify.decorate(
    "registerClient",
    async (clientName: string, playlist: Playlist) => {
      fastify.log.info(`registering client: ${clientName}...`);
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
      clients[clientName] = new StateMachine(playlist);
      const client = clients[clientName];

      await client.addCallbacks(validCallbacks);
      return client;
    },
  );

  done();
}

export default fp(clientsPlugin, {
  name: "clients",
});
