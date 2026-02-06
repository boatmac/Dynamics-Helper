# Troubleshooting Logic

### 2026-02-06 05:45 UTC

## Initial Analysis
- **Issue**: `CalledProcessError` during pip install of `python-Levenshtein` and `zhconv`.
- **Exit Status**: 1 (Generic error).
- **Hypothesis**:
    1.  **Missing Build Dependencies**: `python-Levenshtein` often requires C++ compilation (gcc, python-dev) if a matching wheel is not found for the platform/python version.
    2.  **Network Issues**: Azure China (Mooncake) might have connectivity issues to default PyPI.
    3.  **Wheel Availability**: `zhconv` or `python-Levenshtein` might not have wheels for the specific Databricks Runtime version.

## Action Plan
1.  **Check Logs**: Need the full pip output to identify if it's a compilation error ("command 'gcc' failed") or network error ("Connection timed out").
2.  **Repro/Fix**:
    - Use init scripts to install compilation tools.
    - Or use a pre-compiled wheel.
    - Check if using `%pip install` in notebook works vs cluster library installation.
