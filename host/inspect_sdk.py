import inspect
import copilot
from copilot import CopilotClient

print("--- Copilot Package Contents ---")
print(dir(copilot))

print("\n--- CopilotClient Methods ---")
print([m for m in dir(CopilotClient) if not m.startswith("_")])

if hasattr(copilot, "CopilotClientOptions"):
    print("\n--- CopilotClientOptions found ---")
    print(inspect.signature(copilot.CopilotClientOptions))
else:
    print("\n--- CopilotClientOptions NOT found ---")

# Check if we can see signature of create_session
# and then inspect the Session object if possible (harder without instance)
