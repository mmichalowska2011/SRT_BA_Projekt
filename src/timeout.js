import { setGlobalDispatcher, Agent } from "undici";

setGlobalDispatcher(
  new Agent({
    headersTimeout: 10 * 60_000, // 10 Min
    bodyTimeout: 10 * 60_000,    // 10 Min
    connectTimeout: 30_000,
  })
);
