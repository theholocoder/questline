# Plan is one Stage, not grill, spec and tickets

The default Workflow is Plan → Implement → Review. Grilling, writing the Spec and cutting tickets all happen in one Plan Stage, even though Pocock's workflow names them as three separate Skills. Pocock says to keep grill → spec → tickets in one context, so they share one Run and therefore one Model Profile. Splitting them into Stages would either break that context or make Runs span Stages. The XP Bar shows Grilled / Spec written / Tickets cut as checkpoints inside Plan, not as levels.

## Considered Options

- **Three Stages sharing one Run**: rejected. Runs spanning Stages muddies "a Stage has one or more Runs" and per-Stage Model Profiles, and it adds nothing because the model cannot change mid-context anyway.
- **Three Stages with fresh Runs and a handoff**: rejected. It loses the grilled understanding that the Spec and tickets are written from.

## Consequences

- Plugins that override or extend the default Workflow see Stage ids `plan`, `implement`, `review`; changing this later breaks them.
- The quick path is not a skipped Stage: Plan always yields a Spec with at least one ticket.
