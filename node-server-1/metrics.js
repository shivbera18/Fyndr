const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const httpRequests = new client.Counter({
  name: 'fyndr_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method','route','status']
});
const uploadDuration = new client.Histogram({
  name: 'fyndr_upload_duration_seconds',
  help: 'Upload processing time',
  buckets: [0.1,0.5,1,2,5,10]
});
const faceSearchDuration = new client.Histogram({
  name: 'fyndr_face_search_duration_seconds',
  help: 'Face search time',
  buckets: [0.05,0.1,0.2,0.5,1,2]
});

module.exports = { client, httpRequests, uploadDuration, faceSearchDuration };
