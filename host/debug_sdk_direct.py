import asyncio
import logging
import os
import shutil
from copilot import CopilotClient

# Setup logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s"
)


async def main():
    try:
        logging.info("Starting SDK Direct Debug...")

        # Manually find CLI to be sure
        copilot_path = None
        if os.name == "nt":
            appdata = os.environ.get("APPDATA", "")
            npm_path = os.path.join(appdata, "npm", "copilot.cmd")
            if os.path.exists(npm_path):
                copilot_path = npm_path
                logging.info(f"Selected CLI: {copilot_path}")

        if not copilot_path:
            copilot_path = shutil.which("copilot")
            logging.info(f"Fallback CLI: {copilot_path}")

        options = {"cli_path": copilot_path} if copilot_path else None

        client = CopilotClient(options)

        logging.info("Creating session...")
        session = await client.create_session()
        logging.info("Session created.")

        scraped_title = "Case #12345: Solution Import Failed"
        scraped_product = "Dynamics 365 Sales"
        scraped_error = "Error code: 80040216. An unexpected error occurred. Dependency calculation failed for solution 'SalesPatch_1_0_0_0'. Missing dependency: 'Entity: account' (Id: 70816501-edb9-4740-a16c-6a5efbc05d84)"

        raw_prompt = f"Title: {scraped_title}\nProduct: {scraped_product}\nDescription/Error: {scraped_error}"

        # Apply the AGGRESSIVE sanitization: replace quotes with spaces
        prompt = (
            raw_prompt.replace('"', " ")
            .replace("'", " ")
            .replace("\n", " ")
            .replace("\r", "")
        )

        logging.info(f"Sending prompt: {prompt}")

        message_options = {"prompt": prompt}

        # Use send_and_wait directly
        response = await session.send_and_wait(message_options, timeout=120)

        if response and response.data:
            print("\n--- Response ---")
            print(response.data.content)
            print("----------------")
        else:
            print("No response data.")

        await session.destroy()
        logging.info("Session destroyed.")

    except Exception as e:
        logging.error(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
