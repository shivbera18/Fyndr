import axios from "axios";
import http from "http";
import https from "https";

// Shared keep-alive agents: every ML/Drive call currently opens a fresh TCP
// connection (SYN+TLS per photo). Reuse sockets across ingest ticks.
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

export const httpClient = axios.create({
  httpAgent,
  httpsAgent,
  // Sane default so a stalled peer never pins a caller forever; hot paths
  // (ML 120s, Drive ops) all pass explicit timeouts and are unaffected.
  timeout: 30000,
});

export default httpClient;
