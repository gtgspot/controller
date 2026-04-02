# CLAUDE.md - Project Context for Claude

## Overview
This is the **controller** repository — a meta-controller system that defines capability schemas, decision models, and a web-based UI for controller decisions.

## Repository Structure
- **Root JSON files** (`*.json`): Schema definitions for domain objects (e.g., `Capability.json`, `ControllerDecision.json`, `MetaControllerInput.json`, etc.)
- **`ConfidenceThreshold/`**: Confidence threshold definitions
- **`src/CapabilityDefinitions/`**: Detailed capability definition schemas
- **`index/index.html`**: Standalone vanilla-JS HTML application
- **`index/index.jsx`**: React module version of the application

## Key Concepts
- **Capability**: Defines what the controller can do
- **ControllerDecision / FormalDecision**: Decision schemas for the meta-controller
- **MetaControllerInput / MetaControllerOutput**: Input/output schemas for the meta-controller
- **AdequacyStatus, Materiality, DepthSetting**: Supporting enums and configuration types

## Working With This Repo
- No build system or package manager is configured — the HTML app runs standalone in a browser.
- JSON schema files can be edited directly.
- The React JSX file (`index/index.jsx`) would need a bundler to run in production.
