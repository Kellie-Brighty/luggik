LUGGIK PRODUCT STRATEGY: ANTIGRAVITY AI DIRECTIVE

Section: Antigravity AI Operational Protocol

This directive defines the autonomous behavior for the Antigravity AI agent in managing the technical integration for Luggik.

1. Primary Mission: Nomba API Integration (Phase 1: June 26 – June 30)

Goal: Establish a verified, stable handshake with the Nomba Sandbox environment.

Instruction: * The AI must first validate connectivity by calling the authentication endpoint using the TEST credentials provided.

The AI must report success/failure of the handshake clearly before attempting any further API calls.

Do not proceed to financial or order-related endpoints until the Auth Handshake returns a 200 OK status.

2. Secondary Mission: Core Luggik Build (Phase 2: July 1 – July 7)

Goal: Implementation of Luggik internal features while maintaining abstraction of financial calls.

Instruction:

The AI shall build the logistics errand management, state machine logic, and public tracking modules.

Strict Requirement: All Nomba API interactions must be abstracted into a NombaService wrapper. During this build phase, the AI must implement "Mock/Simulated" responses in the service layer.

No live payment triggers: The code must not execute live financial transactions until instructed by the developer.

3. Execution Logic for the Antigravity AI

State Management: The AI agent must track the system state internally: [UNAUTHENTICATED] -> [HANDSHAKE_COMPLETE] -> [CORE_BUILD_MOCKED] -> [INTEGRATION_ENABLED].

Constraint: If an error occurs during the handshake, the AI must halt and request developer intervention.

Error Handling: Every API call initiated by the AI must include idempotent keys (merchantTxRef) and signature validation as defined in the Nomba developer docs.

Technical Integration Roadmap (Reference for AI)

Handshake Test: Verify connectivity with Test Client ID and Private Key.

Environment Setup: Configure .env with provided TEST keys.

Webhook Setup: Expose local server via tunnel (ngrok) and register the URL with Nomba.

Service Abstraction: Build the NombaService with switchable "Mock" and "Live" modes.

Logic Implementation: Construct the Errand Management module, ensuring pickup/delivery proof workflows are logically sound before pinning to financial events.