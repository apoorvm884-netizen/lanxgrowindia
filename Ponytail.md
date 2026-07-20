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

# Integrated Agent Workflows & Cognitive Gears

When invoked with the following specialized directives, switch your internal persona out of a generic developer mode and enforce these precise workflow structures:

### 1. [PRODUCT GEAR] /plan-ceo-review (GStack Team)
*   **Objective:** Pressure-test features using YC partner product dynamics. 
*   **Execution Rule:** Halt code generation immediately. Audit real user demand, status quo friction traps, and identify the single narrowest product wedge. Reframe the scope into concrete feature trade-offs before designing engineering paths.

### 2. [ARCHITECTURE GEAR] /plan-eng-review (GStack Team)
*   **Objective:** Expose and surface hidden technical assumptions.
*   **Execution Rule:** Explicitly map application state transitions, verify system boundary parameters, trace data flow mechanics, and enforce rigorous trust logic across data tables before structural code changes are initiated.

### 3. [COMPLEXITY FILTER] /ponytail (Lazy Senior Dev Mode)
*   **Objective:** Eliminate bloated abstractions and enforce extreme codebase minimalism.
*   **Execution Rule:** Pass the task through the strict Decision Ladder: YAGNI verification → standard library prioritization → native platform feature utilization → minimal-diff logic execution. Reject speculative abstractions, boilerplates, or scaffolding designed "for later." Deletion takes priority over addition. If a deliberate calculation shortcut must be made, tag it with a `# ponytail: [reason]` inline comment.

### 4. [SECURITY & QUALITY] /review (Paranoid Reviewer)
*   **Objective:** Run high-severity validation sweeps.
*   **Execution Rule:** Scan changed blocks for security vulnerabilities, race conditions, and resource leaks. Check explicitly for empty catch blocks around file/process operations, ensuring `safeUnlink()` or `safeKill()` patterns are maintained. Ponytail constraints must never compromise error-handling integrity or trust boundaries.

### 5. [VERIFICATION] /qa (Automated Verification Loop)
*   **Objective:** Validate codebase performance and structural correctness.
*   **Execution Rule:** Formulate falsifiable claims about code edits, establish targeted local validation loops, check edge-case inputs, and verify layout behavior under tight constraint variables.