# Security Policy

## Supported Versions

Security updates and patches are applied to the following active branches:

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main`           | :white_check_mark: |
| Development tags | :white_check_mark: |
| Historical forks | :x:                |

---

## Reporting a Vulnerability

The Oceanus team takes security and critical water infrastructure safety seriously. If you discover a security vulnerability or potential bypass of our agent governance guardrails, please follow our coordinated disclosure process:

1. **Do not create public GitHub issues or discussions** for suspected vulnerabilities.
2. **Email your disclosure report** directly to:
   * 📧 **`security@oceanus-lab.org`** (or through GitHub's [Private Vulnerability Reporting](https://github.com/Oceanus-Lab/water-infrastructure-reverse-osmosis-digital-twin/security/advisories/new))
3. **Include the following information**:
   * Description of the vulnerability or risk.
   * Step-by-step reproduction instructions or proof-of-concept (PoC).
   * Affected components (e.g. `services/frontend`, `services/serving-api`, `services/agent`, BigQuery IAM roles).
   * Potential impact assessment.

### What to Expect
* **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.
* **Assessment & Fix**: We will provide a timeline for validation and release a patched version.
* **Credit**: We will credit you in the release notes upon coordinated public disclosure (unless you prefer anonymity).

---

## Security & Governance Guardrails in Oceanus

* **Zero Physical Actuation**: Oceanus is strictly an **advise-only** digital twin. The system contains an architectural actuation denylist forbidding autonomous writes to plant SCADA/PLC systems without explicit Human-in-the-Loop (HITL) operator approval.
* **Secret Management**: All credentials and sensitive API tokens (e.g., EIA API keys, service endpoints) are provisioned via Google Cloud **Secret Manager** and are never exposed in client bundles or public repositories.
* **Least-Privilege IAM**: Service accounts (`watertap-engine@`, `serving-api@`, `dataform@`, `adk-agent@`) are strictly role-scoped to their designated BigQuery datasets and Cloud Run invocations.
