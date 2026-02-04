import asyncio
import os
import shutil
import logging
import json
from copilot import CopilotClient
from copilot.types import CopilotClientOptions, PermissionRequestResult

# Setup basic logging to console
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def find_copilot_cli():
    """Finds the Copilot CLI executable path."""
    if os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        npm_path_cmd = os.path.join(appdata, "npm", "copilot.cmd")
        if os.path.exists(npm_path_cmd):
            logging.info(f"Found Copilot CLI at npm location: {npm_path_cmd}")
            return npm_path_cmd

    copilot_path = shutil.which("copilot")
    if copilot_path:
        logging.info(f"Found Copilot CLI in PATH: {copilot_path}")
        return copilot_path
    return None


def permission_handler(request, context) -> PermissionRequestResult:
    print(f"\n[PERMISSION REQUEST] The SDK is asking for permission:")
    print(f"Request: {request}")
    print(f"Context: {context}")
    print("Auto-approving for debug purposes...\n")
    return {"kind": "approved"}


async def main():
    print("--- Dynamics Helper Debug Auth Script ---")

    # 1. Initialize Client
    cli_path = find_copilot_cli()
    if not cli_path:
        print(
            "ERROR: Could not find 'copilot' CLI. Please install it globally via npm."
        )
        return

    options: CopilotClientOptions = {"cli_path": cli_path}
    client = CopilotClient(options)

    # 1.5 Start the client explicitly
    print("\nStarting Copilot Client...")
    try:
        await client.start()
        print("Client started.")
    except Exception as e:
        print(f"Failed to start Copilot Client: {e}")
        return

    # 2. Check Auth Status
    print("\nChecking Auth Status...")
    try:
        auth_status = await client.get_auth_status()
        print(f"Auth Status: {json.dumps(auth_status, indent=2)}")

        if not auth_status.get("isAuthenticated"):
            print("\n❌ NOT AUTHENTICATED. Please run 'copilot auth' in this terminal.")
            return
        else:
            print("\n✅ Authenticated.")

    except Exception as e:
        print(f"Error checking auth: {e}")
        # Don't return here, try to create session anyway as it might trigger auth flow

    # 3. Create Session
    print("\nCreating Session...")
    try:
        session = await client.create_session(
            {"on_permission_request": permission_handler}
        )
        print("Session created successfully.")
    except Exception as e:
        print(f"Error creating session: {e}")
        return

    # 4. Send Test Message
    print("\nSending Test Message ('Hello')...")
    try:
        # 30 second timeout for debug
        response = await session.send_and_wait(
            {"prompt": "Hello! Just checking if you are working."}, timeout=30
        )

        print("\nResponse Received:")
        if response and response.data and response.data.content:
            print(f"---\n{response.data.content}\n---")
        else:
            print(f"Raw Response: {response}")

    except asyncio.TimeoutError:
        print(
            "\n❌ TIMEOUT: The request timed out. This likely means the CLI is stuck waiting for input or a browser login."
        )
    except Exception as e:
        print(f"\n❌ ERROR: {e}")


if __name__ == "__main__":
    asyncio.run(main())
