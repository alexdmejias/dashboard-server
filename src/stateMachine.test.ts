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
  it("#addCallback", () => {
    const stateMachine = new StateMachine();
    const samples: (DummyCallbackConstructor | string)[] = [
      "abc",
      "def",
      { name: "ghi", inRotation: false },
    ];
    const [cb1, cb2, cb3] = getDummyCallbacks(...samples);
    stateMachine.addCallback(cb1);
    stateMachine.addCallback(cb2);
    stateMachine.addCallback(cb3);

    const callbacksKeys = Object.keys(stateMachine.callbacks);
    expect(callbacksKeys.length).toEqual(3);

    expect(callbacksKeys).toEqual(["abc", "def", "ghi"]);
    expect(stateMachine.rotation.length).toEqual(2);
    expect(stateMachine.rotation).toEqual(["abc", "def"]);
  });

  it("#addCallbacks", () => {
    const stateMachine = new StateMachine();
    const samples: (DummyCallbackConstructor | string)[] = ["abc", "def"];
    const [cb1, cb2] = getDummyCallbacks(...samples);
    stateMachine.addCallbacks([cb1, cb2]);

    const callbacks = Object.keys(stateMachine.callbacks);
    expect(callbacks.length).toEqual(2);
    expect(callbacks).toEqual(samples);
  });

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

  // it("#getCAllbackInstance", () => {
  //   const stateMachine = new StateMachine();
  //   const cbs = getAndAddDummyCallbacks(stateMachine, "a", "b", "c");

  //   expect(stateMachine.getCallbackInstance("a")!.name).toEqual("a");
  //   expect(stateMachine.getCallbackInstance("z")).toBeUndefined();
  // });

  // it("#advanceCallbackIndex", () => {
  //   const stateMachine = new StateMachine();
  //   const cbs = getAndAddDummyCallbacks(stateMachine, "a", "b", "c");

  //   expect(stateMachine.currCallbackIndex).toEqual(0);
  //   stateMachine.advanceCallbackIndex();
  //   expect(stateMachine.currCallbackIndex).toEqual(1);
  //   stateMachine.advanceCallbackIndex();
  //   expect(stateMachine.currCallbackIndex).toEqual(2);
  //   stateMachine.advanceCallbackIndex();
  //   expect(stateMachine.currCallbackIndex).toEqual(0);
  // });
});
