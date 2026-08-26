# Visual QA & Puppeteer Test Harnesses

This directory contains automated visual QA, interaction test harnesses, and screenshot verification scripts for **Friendly Learning SRMAP**.

## Running QA Suites

Run them from the project root via `npm run`:

| Command | Script | Description |
| :--- | :--- | :--- |
| `npm run qa:screenshot` | [`qa-screenshot.mjs`](qa-screenshot.mjs) | Captures desktop and mobile screenshots of key public routes into `.qa/` |
| `npm run qa:signed-in-sweep` | [`qa-signed-in-sweep.mjs`](qa-signed-in-sweep.mjs) | Plants a mock auth session and sweeps all protected & admin routes |
| `npm run qa:welcome-tour` | [`qa-welcome-tour.mjs`](qa-welcome-tour.mjs) | Tests the onboarding welcome tour modal and steps |
| `npm run qa:welcome-tour-interests` | [`qa-welcome-tour-interests.mjs`](qa-welcome-tour-interests.mjs) | Tests interest selection and PATCH body capture in welcome tour |
| `npm run qa:faculty-mock` | [`qa-faculty-mock.mjs`](qa-faculty-mock.mjs) | Intercepts requests and validates faculty listing and profile cards |
| `npm run qa:group-channels` | [`qa-group-channels.mjs`](qa-group-channels.mjs) | Tests group channels, workspace layouts, and messaging |
| `npm run qa:recommended-people` | [`qa-recommended-people.mjs`](qa-recommended-people.mjs) | Tests recommended peers & mentors carousel |
| `npm run qa:opportunities-loop` | [`qa-opportunities-loop.mjs`](qa-opportunities-loop.mjs) | Tests opportunity feed and application flows |
| `npm run qa:workspace-redesign` | [`qa-workspace-redesign.mjs`](qa-workspace-redesign.mjs) | Tests workspace groups layout and channel rail |
| `npm run qa:search-insights` | [`qa-search-insights.mjs`](qa-search-insights.mjs) | Tests CampusMind search UI and response rendering |
| `npm run qa:mentor-honesty` | [`qa-mentor-honesty.mjs`](qa-mentor-honesty.mjs) | Verifies mentor profile integrity and badge states |

> **Note on Outputs:** Screenshots produced by these scripts are written to `.qa/` and `.qa-*/` folders at the project root. These output folders are disposable and ignored by Git.
