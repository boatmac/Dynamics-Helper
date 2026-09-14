param([ValidateSet('success')][string]$Scenario)

# Baseline only: no dot-sourcing, imports, filesystem or product operations.
'POWERSHELL_STARTUP_BASELINE'
exit 0
