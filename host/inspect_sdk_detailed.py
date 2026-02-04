import inspect
from copilot import CopilotClient, CopilotSession

print("--- CopilotClient.__init__ Signature ---")
print(inspect.signature(CopilotClient.__init__))

print("\n--- CopilotSession Methods ---")
print([m for m in dir(CopilotSession) if not m.startswith("_")])

print("\n--- CopilotSession.send_and_wait Signature (if exists) ---")
if hasattr(CopilotSession, "send_and_wait"):
    print(inspect.signature(CopilotSession.send_and_wait))

print("\n--- CopilotSession.send_messages Signature (if exists) ---")
if hasattr(CopilotSession, "send_messages"):
    print(inspect.signature(CopilotSession.send_messages))
