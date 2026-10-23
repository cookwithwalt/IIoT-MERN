# API reference

- GET /api/health
- GET /api/dashboard/summary
- GET /api/machines and GET /api/machines/:id
- GET /api/machines/:id/telemetry and GET /api/telemetry?limit=100
- GET /api/events?limit=50
- GET /api/incidents and GET /api/incidents/:id
- GET /api/analytics/production and GET /api/analytics/downtime
- GET /api/simulation/status and GET /api/simulation/config
- POST /api/simulation/start, /pause, /resume, /reset
- POST /api/simulation/faults; DELETE /api/simulation/faults/:id
- POST /api/simulation/scenarios with {"name":"downstream-failure"}, {"name":"quality-degradation"}, {"name":"conveyor-jam"} or {"name":"normal-production"}
- GET /api/reports/production and GET /api/reports/telemetry.csv

Socket.IO emits simulation:status, machine:state, telemetry:update, incident:created and incident:updated.
