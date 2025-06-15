import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import StateMachine from "../stateMachine";
import { Playlist, PossibleCallbacks, WASDWASD } from "../types";
import { z } from "zod/v4";

declare module "fastify" {
  interface FastifyInstance {
    getClient(clientName: string): StateMachine;
    getClients(): Record<string, StateMachine>;
    registerClient(
      clientName: string,
      playlist: Playlist
    ): Promise<StateMachine | { error: string }>;
  }
}

// TODO should this move to a higher level fastify schema validation?
function validatePlaylist(
  fastify: FastifyInstance,
  playlist: Playlist,
  possibleCallbacks: PossibleCallbacks
) {
  const validPlaylist = z
    .array(
      z.object({
        id: z
          .string()
          .min(1, "ID must be a non-empty string")
          .check((ctx) => {
            if (ctx.value.length !== new Set(ctx.value).size) {
              ctx.issues.push({
                code: "custom",
                message: `No duplicates allowed.`,
                input: ctx.value,
                continue: true,
              });
            }
          }),
        callbackName: z.literal(Object.keys(possibleCallbacks)),
        options: z.object().optional().default({}),
      })
    )
    .min(1, "Playlist must contain at least one item");

  return validPlaylist.safeParse(playlist);
}

function clientsPlugin(
  fastify: FastifyInstance,
  options: {
    possibleCallbacks: PossibleCallbacks;
  },
  done: () => void
) {
  const { possibleCallbacks } = options;
  const clients: Record<string, StateMachine> = {};

  fastify.decorate("getClients", function () {
    return clients;
  });

  fastify.decorate("getClient", function (clientName: string) {
    return clients[clientName];
  });

  fastify.decorate(
    "registerClient",
    async function (clientName: string, playlist: Playlist) {
      fastify.log.info(`registering client: ${clientName}...`);
      fastify.log.info(`validating playlist`);
      const result = validatePlaylist(fastify, playlist, possibleCallbacks);
      if (!result.success) {
        return {
          error: `Error while validating playlist object, ${z.prettifyError(
            result.error
          )} `,
        };
      }

      const validCallbacks: WASDWASD[] = [];

      let error: undefined | Error;
      playlist.forEach((playlistItem) => {
        try {
          const callbackFn = possibleCallbacks[playlistItem.callbackName];
          const ins = new callbackFn(playlistItem.options);

          validCallbacks.push({ instance: ins, id: playlistItem.id });
        } catch (e) {
          error = e as Error;
        }
      });

      if (error) {
        if (error instanceof z.ZodError) {
          return {
            // TODO should say the name of the callback that failed
            error: `Error while validating the passed options ${z
              .prettifyError(error)
              .replaceAll(/\n/g, "")}`,
          };
        } else {
          return { error: error.message };
        }
      } else {
        clients[clientName] = new StateMachine(playlist);
        const client = clients[clientName];

        await client.addCallbacks(validCallbacks);
        return client;
      }
    }
  );

  done();
}

export default fp(clientsPlugin, {
  name: "clients",
});
