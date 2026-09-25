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


## Hydraulic checks

The deterministic engine evaluates every requested duty point against the structured head curve and optional configuration operating range. It also interpolates efficiency, NPSH and absorbed power curves when available, and calculates hydraulic power from density, gravity, flow and required head. Hydraulic power is reported separately from motor rated power; it is not treated as a substitute for the manufacturer power curve.
