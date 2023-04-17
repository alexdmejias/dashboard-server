import StateMachine from "./stateMachine";
import BaseCallback from "./callbacks/base";
import { DataFromCallback } from "./types";

type DummyCallbackConstructor = {
  name: string;
  template?: string;
  inRotation?: boolean;
  data?: DataFromCallback;
};

class DummyCallback extends BaseCallback {
  data: DataFromCallback;

  constructor({
    name = "dummy",
    template = "",
    inRotation = true,
    data = {},
  }: DummyCallbackConstructor) {
    super(name, template);
    this.inRotation = inRotation;
    this.data = data;
  }

  getData(): Promise<DataFromCallback> {
    return Promise.resolve(this.data);
  }
}

function getDummyCallbacks(
  ...callbacks: (DummyCallbackConstructor | string)[]
) {
  return callbacks.map((args) => {
    if (typeof args === "string") {
      return new DummyCallback({ name: args });
    }
    return new DummyCallback(args);
  });
}

function getAndAddDummyCallbacks(
  machine: StateMachine,
  ...callbacks: (DummyCallbackConstructor | string)[]
) {
  const cbs = getDummyCallbacks(...callbacks);

  cbs.forEach((cb) => machine.addCallback(cb));

  return cbs;
}

describe("StateMachine", () => {
  it("#validateRotation", () => {
    const stateMachine = new StateMachine();
    const cbs = getAndAddDummyCallbacks(stateMachine, "a", "b", "c");

    expect(stateMachine.validateRotation(["a"])).toBe(true);
    expect(stateMachine.validateRotation(["a", "a"])).toBe(true);
    expect(stateMachine.validateRotation(["b", "a"])).toBe(true);
    expect(stateMachine.validateRotation(["x", "a"])).toBe(false);
  });

  it("#setRotation", () => {
    const stateMachine = new StateMachine();
    const cbs = getAndAddDummyCallbacks(stateMachine, "a", "b", "c");

    const newRotation = ["b", "c", "a"];

    stateMachine.setRotation(newRotation);
    expect(stateMachine.rotation).toEqual(newRotation);

    // stateMachine.addCallback(dummy3);
    stateMachine.setRotation(["x"]);
    expect(stateMachine.rotation).toEqual(newRotation);

    stateMachine.setRotation(["a", "a"]);
    expect(stateMachine.rotation).toEqual(["a", "a"]);
  });
});
