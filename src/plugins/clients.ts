import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import StateMachine from "../stateMachine";
import CallbackBase from "../base-callbacks/base";
import CallbackBaseDB from "../base-callbacks/base-db";

declare module "fastify" {
  interface FastifyInstance {
    getClient(clientName: string): StateMachine;
    registerClient(clientName: string): Promise<StateMachine>;
  }
}

function clientsPlugin(
  fastify: FastifyInstance,
  options: { possibleCallbacks: any[] },
  done: () => void
) {
  const { possibleCallbacks } = options;
  const clients: Record<string, StateMachine> = {};

  fastify.decorate("getClient", function (clientName: string) {
    return clients[clientName];
  });

  fastify.decorate("registerClient", async function (clientName: string) {
    fastify.log.info(`registering client: ${clientName}`);
    clients[clientName] = new StateMachine();
    const client = clients[clientName];
    fastify.log.info(`created new client: ${clientName}`);

    const validCallbacks: (CallbackBase | CallbackBaseDB)[] = [];
    possibleCallbacks.forEach((callback) => {
      try {
        const ins = new callback();
        validCallbacks.push(ins);
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error(e);
        }
      }
    });

    await client.addCallbacks(validCallbacks);
    return client;
  });

  done();
}

export default fp(clientsPlugin, {
  name: "clients",
});
