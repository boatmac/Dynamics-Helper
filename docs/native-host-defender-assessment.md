# Native Host Defender Assessment

Research date: September 12, 2026. Public documentation review only; no Host,
browser, build, security-policy change or sample upload was performed for this
assessment. This is not a determination that the quarantined executable is safe
or malicious, nor authorization to resume its execution.

## Test Route

The user's current route table in [AGENTS.md](../AGENTS.md#native-host-mode-selection)
is authoritative. Published upgrade tests use the Extension updater. Unreleased
Extension changes use the checkout's built `extension/dist`; Host changes use
`dev_switch.py dev`; combined changes use both. A local full installer is not a
feature-test substitute. Dev mode changes registration, not the security status
of code, and is not a sandbox or a remedy for a Defender detection.

## What The Sources Establish

| Layer | Documented behavior | Interpretation for DH |
| --- | --- | --- |
| Native Messaging | Edge officially supports registered native apps communicating over stdio; Edge does not manage their installation. [1] | The architecture itself is supported, not inherently malware and not antivirus-exempt. |
| Process launch | Edge can launch executable hosts directly or through `cmd.exe`, depending on policy/rollout. [2] | A non-browser immediate parent is possible in a legitimate launch. This does not identify the historical parent PID in this incident. |
| Defender Antivirus | Real-time scanning combines file/process behavior, heuristics, cloud protection and machine-learning-based updates. [3] | New files, loaded dependencies and running behavior can be inspected. Detection after startup does not by itself distinguish static file classification from behavior classification. |
| ASR policies | Configured rules can block low-prevalence/new executables or specified risky script/process behaviors. [4] | Applicable rule and audit/block event evidence are necessary. Do not interpret every browser child process as an ASR violation or confuse browser JavaScript with Windows Script Host. |
| SmartScreen | Publisher and file-hash reputation influence warnings; a signed new binary can still warn. [5] | Reputation warnings differ from the observed Trojan classification and quarantine. Signing is not an antivirus exemption. |
| PyInstaller | Both packaging modes use a bootloader and bundled interpreter. Startup extraction to `_MEI...` is a onefile behavior. [6] | DH uses onedir. Its detection cannot be explained by assuming onefile extraction. |

Updater operations such as downloading an executable package, replacing product
files, loading new libraries, registering a host and launching helper processes
provide scanning opportunities and behavioral context. They are legitimate
operations, not sufficient conditions for malware classification. Microsoft does
not publish a deterministic list saying that a Native Messaging updater performing
these steps will trigger Bearfoos. No such cause was established for this incident.

The observed local event was an installed Host Trojan detection followed by
quarantine, not merely a SmartScreen unknown-publisher prompt. Public sources
cannot fill the missing historical process chain or identify the quarantined
file's hash. Do not infer a false positive from the threat name, `!ml`, or `FastPath`.

## Rust Versus Python

A complete native Rust implementation could remove the Python interpreter,
Python package collection and PyInstaller bootloader from DH. It might reduce
classification problems tied specifically to those artifacts. This is an
engineering hypothesis, not a measured reduction for DH. PyInstaller maintainers
document recurring antivirus reports, but that experience does not establish a
false positive here. [7]

Changing language does not remove Native Messaging registration, file access,
updater replacement, network access or child-process behavior. Microsoft publishes
detections for Rust malware, so Rust is not exempt from inspection. [8]

The current GitHub-owned Copilot SDK repository includes Rust documentation. [9]
Its `main` README is not a pinned-release compatibility guarantee: API parity has
documented differences, and a migration would require version-specific checks of
permissions, prompt isolation, deterministic sessions, attachments and recovery.
Its default bundled-runtime behavior includes build-time downloads, embedded
runtime assets and later extraction. Therefore a Rust rewrite is not automatically
a single self-contained binary with no extraction or child processes. A thin Rust
launcher that retains the Python backend would retain most of the original
packaging/runtime concerns and add another process boundary.

Recommendation: do not undertake a full rewrite solely to make this detection
disappear. Treat Rust as a separate packaging/maintenance architecture decision.
For either language, preserve reviewable build provenance and exact release
identity, evaluate consistent code signing through the organization's normal
process, and investigate detections with the security team. Microsoft does not
offer developers a guaranteed false-positive prevention program. [10]

No changes to AV settings, sample restoration/upload, browser enterprise policy,
compiler randomization or rebuild-until-undetected experiments are recommended.
Some PyInstaller maintainer text suggests disabling antivirus; that advice is
explicitly rejected here and does not override repository safety rules.

## Sources

1. [Microsoft Edge Native Messaging](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging)
2. [NativeHostsExecutablesLaunchDirectly](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/nativehostsexecutableslaunchdirectly)
3. [Defender behavioral, heuristic and real-time protection](https://learn.microsoft.com/en-us/defender-endpoint/configure-protection-features-microsoft-defender-antivirus)
4. [Attack surface reduction rules reference](https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference)
5. [SmartScreen reputation for developers](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
6. [PyInstaller operating modes](https://pyinstaller.org/en/stable/operating-mode.html)
7. [PyInstaller maintainer antivirus report guidance](https://github.com/pyinstaller/pyinstaller/blob/develop/.github/ISSUE_TEMPLATE/antivirus.md) (maintainer experience, not Microsoft's detection specification)
8. [Microsoft analysis of Rust-based DeadLock](https://www.microsoft.com/en-us/security/blog/2026/08/10/deadlock-ransomware-breaking-down-a-rust-based-encryptor-with-decentralized-recovery-infrastructure/)
9. [GitHub Copilot SDK Rust README](https://github.com/github/copilot-sdk/blob/main/rust/README.md) (moving main branch)
10. [Microsoft software developer FAQ](https://learn.microsoft.com/en-us/defender-xdr/developer-faq)
