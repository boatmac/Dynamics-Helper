import asyncio
import logging
import os
import shutil
from copilot import CopilotClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")


async def test_prompt(session, prompt):
    logging.info(f"Testing prompt: {prompt}")
    try:
        # Short timeout for bisecting - if it hangs, it hangs quickly usually
        await session.send_and_wait({"prompt": prompt}, timeout=10)
        logging.info("SUCCESS")
        return True
    except Exception as e:
        logging.error(f"FAILED: {e}")
        return False


async def main():
    copilot_path = None
    if os.name == "nt":
        appdata = os.environ.get("APPDATA", "")
        npm_path = os.path.join(appdata, "npm", "copilot.cmd")
        if os.path.exists(npm_path):
            copilot_path = npm_path

    client = CopilotClient({"cli_path": copilot_path} if copilot_path else None)
    session = await client.create_session()

    parts = ["Hello", "Title"]

    # Test individual parts
    for i, part in enumerate(parts):
        logging.info(f"--- Part {i + 1} ---")
        if not await test_prompt(session, part):
            logging.error(f"Part {i + 1} caused failure!")
            await session.destroy()
            return

    # Test combined (incremental)
    logging.info("--- Testing Incremental Combination ---")
    combined = ""
    for part in parts:
        combined += part + " "
        logging.info(f"Testing combined length: {len(combined)}")
        if not await test_prompt(session, combined):
            logging.error(f"Failed at length {len(combined)}")
            break

    await session.destroy()


if __name__ == "__main__":
    asyncio.run(main())
