# Copilot Integration & Configuration Guide

This document details how the **Dynamics Helper** extension integrates with the **GitHub Copilot SDK**, how instructions and prompts are constructed, and how you can customize the behavior for your own workflows.

## 1. High-Level Architecture

The integration follows a linear pipeline:
1.  **User Input:** The user provides error text, context, and case metadata via the Chrome Extension UI.
2.  **Native Messaging:** This data is sent to the `dh_native_host.exe` (Python backend) as a JSON payload (`analyze_error` action).
3.  **Preprocessing:** The backend scrubs PII and applies heuristic optimizations.
4.  **SDK Execution:** The backend initializes a `CopilotSession` with a specific configuration (Instructions + Skills) and sends the prompt.
5.  **Response:** The LLM's response is streamed back, saved to a Markdown file, and displayed in the UI.

---

## 2. The Prompt Pipeline (User Request)

This pipeline handles the specific task (e.g., "Analyze this error"). The user's input becomes the `prompt` parameter in the `send_and_wait` API call.

### A. PII Scrubbing
*   **Module:** `host/pii_scrubber.py`
*   **Action:** The user's input `text` and `context` are passed through a regex-based scrubber.
*   **What it removes:** Email addresses, IP addresses (partial), phone numbers.

```python
# host/dh_native_host.py

self.send_progress("Scrubbing PII...")
# Scrub PII from text and context
scrubbed_text = self.scrubber.scrub(text)
scrubbed_context = self.scrubber.scrub(context) if context else ""
```

### B. Sending the Prompt (`send_and_wait`)
The final scrubbed and optimized string is passed to `session.send_and_wait`.

```python
# host/dh_native_host.py

# 1. Prepare MessageOptions
# The 'prompt' key contains the user's specific request.
message_options: MessageOptions = {"prompt": safe_prompt}

# 2. Call the API
# This sends the prompt to the LLM within the current session context.
# Timeout: Frontend has 310s safety, Backend has 600s.
timeout_seconds = 600.0
response_event = await self.session.send_and_wait(
    message_options, timeout=timeout_seconds
)
```

---

## 3. System Instructions (The Context)

The "System Prompt" defines the AI's role, tone, and available tools. This is passed to the SDK **when the session is created**, not with every message.

Dynamics Helper uses a **Three-Layer Hierarchy** to build this configuration in `_get_session_config`.

### Layer 1: System Instructions (Immutable)
*   **Source:** `host/system_prompt.md`.
*   **Content:** Defines the base persona ("Dynamics Helper AI"), core capabilities (Kusto, WorkIQ), and critical safety rules.

*   **Note:** This file also contains the **Efficiency Protocol** which instructs the AI when to use tools vs. internal knowledge, replacing previous hardcoded logic.

```python
# host/dh_native_host.py

system_instr_path = os.path.join(install_dir, "system_prompt.md")
with open(system_instr_path, "r", encoding="utf-8") as f:
    sys_content = f.read()
```

### Layer 2: User Instructions (Customizable)
*   **Source:** `%LOCALAPPDATA%\DynamicsHelper\copilot-instructions.md`.
*   **Managed By:** The User via the Extension Options Page.

```python
# host/dh_native_host.py

user_instr_path = os.path.join(USER_DATA_DIR, "copilot-instructions.md")
with open(user_instr_path, "r", encoding="utf-8") as f:
    user_content = f.read()

# Combine System + User
final_content = sys_content
if user_content.strip():
    final_content += "\n\n" + user_content
```

### Layer 3: Workspace Instructions (Project-Specific)
*   **Source:** `[Root Path]/.github/copilot-instructions.md`
*   **Content:** Instructions specific to the repository/project.

```python
# host/dh_native_host.py

# Append Workspace Instructions
if self.root_path and os.path.exists(self.root_path):
    ws_instr_path = os.path.join(self.root_path, ".github", "copilot-instructions.md")
    if os.path.exists(ws_instr_path):
        with open(ws_instr_path, "r", encoding="utf-8") as f:
            ws_instr_content = f.read()
        
        # Append to existing content
        new_content = current_content + "\n\n" + ws_instr_content
        
        # Assign to session config
        session_config["system_message"] = {
            "mode": "append",
            "content": new_content,
        }
```

### D. Setting the Context (`create_session`)
The merged instructions are set as the `system_message` in the session configuration. This is sent to GitHub Copilot **when the session is created**, effectively "pre-prompting" the agent before any user messages are sent.

```python
# host/dh_native_host.py

# 1. Build the Configuration
config = self._get_session_config()
# config now contains {"system_message": {"content": "Merged Instructions..."}}

# 2. Create the Session
# This establishes the context for all subsequent interactions.
self.session = await self.client.create_session(config)

# 3. (Later) Send the User Request
# When self.session.send_and_wait() is called (Section 2.C), 
# it runs within this pre-configured context.
```

---

## 4. Skills & Tools Configuration

Capabilities are provided to the LLM via **Skills** defined in `skill_directories`.

### Loading Logic (`_get_session_config`)
The configuration is merged additively from three sources.

```python
# host/dh_native_host.py

# 1. Default Config (Bundled)
default_data = load_config_file(default_config_path)

# 2. User Config (AppData)
user_data = load_config_file(user_config_path)

# 3. Merge Skills (Additive)
default_skills = default_data.get("skill_directories", [])
user_skills = user_data.get("skill_directories", [])
final_data["skill_directories"] = list(set(default_skills + user_skills))

# 4. Workspace Config (.github/copilot.config.json)
if self.root_path:
    ws_config_path = os.path.join(self.root_path, ".github", "copilot.config.json")
    # ... load ws_data ...
    ws_skills = ws_data.get("skill_directories", [])
    
    # Merge again
    current_skills = session_config.get("skill_directories", [])
    session_config["skill_directories"] = list(set(current_skills + ws_skills))
```

**Behavior:**
*   The session will have access to *all* skills found in default, user, and workspace configs.
*   **Sanitization:** When saving user config updates, the system carefully filters out Default and Workspace skills to prevent polluting the user's `config.json`.

---

## 5. Customization Workflow

To set up your own workflow:

### A. Custom Instructions
1.  Open the Dynamics Helper extension.
2.  Go to **Options** -> **Prompt**.
3.  Edit the **User Instructions**.
4.  Click **Save**. This updates `copilot-instructions.md` and instantly refreshes the Copilot session.

### B. Workspace-Specific Rules
1.  Set your **Root Path** in the extension (e.g., `C:\MyWorkbench\Repository\ProjectX`).
2.  Create `.github/copilot-instructions.md` in that folder.
3.  Add specific rules: "For this project, never suggest restarting the server. We use hot-patching."

### C. Adding New Skills (Advanced)
1.  Develop a Copilot Skill (Python).
2.  Edit your user `config.json` at `%LOCALAPPDATA%\DynamicsHelper\config.json`.
3.  Add the path to `skill_directories`.
4.  Restart the Native Host (reload the extension).
