# Demo scenarios

1. Normal production: POST /api/simulation/scenarios with {"name":"normal-production"}.
2. Downstream failure: use {"name":"downstream-failure"}; observe capper fault and buffer-driven blocking as buffers fill.
3. Quality degradation: use {"name":"quality-degradation"}; rejected units rise while the line may continue moving.
4. Conveyor jam: use {"name":"conveyor-jam"}; infeed speed falls to zero and upstream flow stops.

Fault duration uses simulated seconds. Clearing a fault records a recovery event.
