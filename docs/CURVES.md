# Performance Curves

Every performance curve is stored as structured numeric data, not only as an image.

A configuration may have independent datasets for:
- Head (Q-H)
- Efficiency
- Power
- NPSH

Each dataset records:
- configuration
- curve kind
- unit
- speed
- frequency
- ordered Q/value points
- optional source reference

The selection engine interpolates structured points and refuses a duty point outside the available Q range. Curve images may still be retained as source documentation, but calculations use the structured dataset.
