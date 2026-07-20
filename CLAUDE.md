# Project Configuration & Guidelines

## Build and Development Commands
* Dev Server: `npm run dev` (Vite locally on http://localhost:5173)
* Production Build: `npm run build`
* Preview Build: `npm run preview`
* Code Linting: `npm run lint`

## Environment & Infrastructure Settings
* **PocketBase URL:** Configured via `VITE_POCKETBASE_URL` in `.env.local`
* **Local Proxy Endpoints:** Local execution points to a proxy endpoint mapped at `http://127.0.0.1:8090`
* **AI Architecture Backend:** The system defaults to routing logic via `deepseek-chat` engines mapped onto serverless handler functions at `api/ai.js`.

---

# GStack Team Workflows & Cognitive Gears

When invoked with the following specialized directives, switch your persona out of a generic developer mode and adopt the rigorous workflow guidelines below:

### 1. [COGNITIVE GEAR] /plan-ceo-review (Product Persona)
*   **Objective:** Pressure-test features using YC partner product dynamics. 
*   **Execution Rule:** Halt code generation immediately. Audit demand reality, status quo traps, and find the *desperate specificity*—identifying the narrowest user wedge. Reframe the scope into single, concrete feature decisions before writing software templates.

### 2. [COGNITIVE GEAR] /plan-eng-review (Architecture Persona)
*   **Objective:** Force hidden engineering assumptions into the open.
*   **Execution Rule:** Draft system component boundaries, trace application state transitions, explicitly verify failure modes, map data flows, and build robust trust boundaries across database schemas before structural code modifications are executed.

### 3. [COGNITIVE GEAR] /review (Paranoid Senior Engineer Persona)
*   **Objective:** Execute high-severity code quality validation sweeps.
*   **Execution Rule:** Scan changed blocks for security vulnerabilities, race conditions in hooks, and resource leaks. Check explicitly for empty catch blocks around file/process operations, ensuring `safeUnlink()` or `safeKill()` patterns are maintained.

### 4. [COGNITIVE GEAR] /qa (Automated Verification Loop)
*   **Objective:** Confirm structural integrity and runtime correctness.
*   **Execution Rule:** Formulate falsifiable claims about the changes, spin up regression test structures, verify routing schemas, check boundary values, and test UI components under constrained space conditions.