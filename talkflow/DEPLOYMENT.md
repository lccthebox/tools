# Talk Flow deployment gate

## Current status

- Local personal use: allowed after the Anthropic Models and Messages connection tests pass.
- Public production deployment: **NO-GO**.

The current static app sends the Anthropic API key directly from the browser. A public deployment must not proceed until model discovery and message generation are moved behind a server-side proxy that keeps the API key out of browser storage and requests. This change intentionally does not add that proxy.

Before any future production release, verify that the proxy enforces authentication, rate limits, model allowlisting, request-size limits, redacted error logging, and secret rotation.
