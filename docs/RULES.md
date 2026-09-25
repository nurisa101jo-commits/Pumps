# Engineering Rules

Rules are first-class records and are evaluated separately from product data.

Supported foundation rule kinds:
- motor_compatibility
- temperature_limit
- fluid_compatibility
- flow_limit
- npsh_limit
- application
- configuration

A failed rule can have severity error or warning. Production selection will distinguish hard engineering exclusions from review warnings and will retain the rule result in the selection trace.
