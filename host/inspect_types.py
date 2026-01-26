import inspect
import copilot.types

print("--- copilot.types contents ---")
print(dir(copilot.types))

if hasattr(copilot.types, "CopilotClientOptions"):
    print("\n--- CopilotClientOptions signature ---")
    print(inspect.signature(copilot.types.CopilotClientOptions))

if hasattr(copilot.types, "MessageOptions"):
    print("\n--- MessageOptions signature ---")
    print(inspect.signature(copilot.types.MessageOptions))
