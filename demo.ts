import debug from "./debug.ts";

function sleep(ms: number) {
  return new Promise((r) => {
    setTimeout(() => r(), ms);
  });
}

// Not actually a test, more of a demo
// Should improve it

const msg1 = "Doing lots of work";
const msg2 = "Doing lots of other work";

async function demo() {
  const http = debug("http");
  const dotenv = debug("dotenv");
  const worker = debug("worker");
  const workerApi = worker.extend("api");
  const workerGen = worker.extend("gen");

  dotenv("env variables loaded");
  http("booting %s", `'My App'`);

  await sleep(200);
  workerApi(msg1);

  await sleep(44);
  workerGen(msg1);

  await sleep(99);

  workerApi(msg1);
  await sleep(1200);
  workerApi(msg1);
  await sleep(55);
  workerApi(msg1);
  await sleep(12);
  workerApi(msg1);
  await sleep(92);
  workerApi(msg1);

  await sleep(58);

  workerGen(msg1);

  workerApi(msg1);

  await sleep(233);

  workerGen(msg2);

  const nestedObj: any = { a: { b: { c: { d: { e: { f: 42 } } } } } };
  workerGen("event: %O", nestedObj);
  http("received event: %O", {
    bar: true,
    justify: "column",
    align: { center: true },
  });
  await sleep(100);
  http("received event: %O", {
    bar: true,
    justify: "column",
    align: { center: true },
  });

  // TODO
  // const obj = { a: 1 };
  // const obj2 = { b: 2 };
  // const weakSet = new WeakSet([obj, obj2]);
  // workerB("Object with hidden fields: %O", weakSet);

  workerApi(`${msg1}
request: /multi-line-comment
response: /working`);

  workerGen("wooooorking");

  await sleep(500);

  await sleep(220);

  workerGen(msg2);

  await sleep(88);

  workerGen(msg2);
  workerApi(msg2);
  workerGen(msg2);
  workerGen(msg2);

  sleep(55555);
  return;
}

demo();
