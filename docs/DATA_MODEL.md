# Engineering Data Model

The catalog is company-owned and intentionally has no manufacturer hierarchy.

## Relationship
Series -> Model -> Configuration -> Motor / Dimensions / Curves / Materials / Seal / Connection.

A configuration is the engineering identity used for selection. Two configurations of the same model may legitimately have different motors, dimensions, curves, weights, materials or codes.

## Curve storage
Curves are stored as numerical datasets. A dataset may represent head, efficiency, absorbed power or NPSH and contains Q/value points plus speed, frequency and source reference.

## Source traceability
Imported values can retain document, page, table and region references so an engineer can inspect where a value came from.

## Rules
Rules are independent from product data and cover compatibility, limits, application restrictions and configuration availability.
