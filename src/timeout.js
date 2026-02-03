import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    headersTimeout: 600_000,
    bodyTimeout: 600_000,
    connectTimeout: 30_000,
  })
);

