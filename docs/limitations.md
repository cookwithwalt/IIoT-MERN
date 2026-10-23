# Known limitations

- This is an educational software simulation, not a calibrated factory digital twin or safety system.
- Live simulation state, telemetry and incidents currently live in memory and reset on server restart; MongoDB is optional but durable persistence is not yet wired through the runtime.
- Full Mongoose schemas, persisted run archives, retention policies and versioned configuration remain future work.
- Availability and production-loss values are simplified teaching estimates, not certified industrial OEE.
- Authentication is not implemented. Use locally or add authentication and deployment hardening before exposing the service publicly.
- The UI currently focuses on an operations overview and fault lab; dedicated investigation, configuration and full analytics screens remain future work.
