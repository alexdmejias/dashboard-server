import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import StateMachine from "../stateMachine";
import CallbackBase from "../base-callbacks/base";
import { Playlist, PossibleCallbacks } from "../types";

declare module "fastify" {
  interface FastifyInstance {
    getClient(clientName: string): StateMachine;
    getClients(): Record<string, StateMachine>;
    registerClient(
      clientName: string,
      playlist: Playlist
    ): Promise<StateMachine>;
  }
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
      fastify.log.info(`registering client: ${clientName}`);

      clients[clientName] = new StateMachine(playlist);
      const client = clients[clientName];

      fastify.log.info(`created new client: ${clientName}`);

      const validCallbacks: CallbackBase[] = [];

      playlist.forEach((playlistItem) => {
        try {
          fastify.log.debug(
            `found matching callback between possible callbacks and playlist item, instantiating it`
          );

          const callbackFn = possibleCallbacks[playlistItem.callbackName];
          const ins = new callbackFn(playlistItem.options);

          validCallbacks.push(ins);
        } catch (e) {
          if (process.env.NODE_ENV !== "production") {
            console.error(e);
          }
        }
      });

      await client.addCallbacks(validCallbacks);
      return client;
    }
  );

  done();
}

export default fp(clientsPlugin, {
  name: "clients",
});
