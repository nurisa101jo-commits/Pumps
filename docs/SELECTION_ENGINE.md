# Selection Engine

The Selection Engine is deterministic and independent of AI.

Input:
- one or more duty points (flow + head)
- optional fluid properties
- engineering constraints

Process:
- filter permitted configurations
- evaluate structured performance curves
- interpolate hydraulic values at requested flow
- reject configurations outside available curve ranges
- apply NPSH/efficiency constraints
- calculate a deterministic score from head error
- return configuration-level candidates

Future production rules will also evaluate motor compatibility, temperature, fluid compatibility, operating range and other engineering constraints before a final selection.
