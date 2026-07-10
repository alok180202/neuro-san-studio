# Copyright © 2025-2026 Cognizant Technology Solutions Corp, www.cognizant.com.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# END COPYRIGHT

"""
FTS Diagnostic Assistant -- Demo Script

Runs the FTS multi-agent network against 4 real incident scenarios based on
common FTS L3 SAP support patterns, using a direct (in-process) session --
no server required.

Uses the same session-creation pattern as this repo's own integration tests
(see tests/integration/test_agent_network_designer_basic_helpdesk.py):
    AgentSessionFactory().create_session("direct", agent_name)
    StreamingInputProcessor(session=session) to build the request and
    collect/compile the streamed response.

Run from neuro-san-studio/ root with venv activated:
    python tests/fts/test_fts_agent.py

Requires GOOGLE_API_KEY (or another configured provider key) set in .env.
"""

import os
import sys
import warnings
from typing import Any
from typing import Dict

warnings.filterwarnings("ignore", category=RuntimeWarning)

# Use the repo's own ProjectEnvironment helper (same one `ns chat`/`ns run` use) instead of
# hand-setting AGENT_MANIFEST_FILE/AGENT_TOOL_PATH: it also adds the repo root to PYTHONPATH,
# which neuro-san needs to map the absolute AGENT_TOOL_PATH back to an importable module path.
# Skipping that step leaves AGENT_TOOL_PATH resolving to "", producing a leading-dot relative
# import error on the coded tool -- which the LLM then masks by improvising a plausible answer.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from neuro_san_studio.commands.project_environment import ProjectEnvironment  # noqa: E402

ProjectEnvironment(_REPO_ROOT).apply()

from neuro_san.client.agent_session_factory import AgentSessionFactory  # noqa: E402
from neuro_san.client.streaming_input_processor import StreamingInputProcessor  # noqa: E402
from neuro_san.interfaces.agent_session import AgentSession  # noqa: E402
from neuro_san.message_processing.basic_message_processor import BasicMessageProcessor  # noqa: E402

AGENT_NAME = "fts/fts_diagnostic_assistant"


def invoke_fts_agent(incident_text: str) -> str:
    """Invoke the FTS Diagnostic Assistant directly (in-process) and return the final text response."""
    session: AgentSession = AgentSessionFactory().create_session("direct", AGENT_NAME)
    input_processor = StreamingInputProcessor(session=session)
    processor: BasicMessageProcessor = input_processor.get_message_processor()
    request: Dict[str, Any] = input_processor.formulate_chat_request(incident_text)

    empty: Dict[str, Any] = {}
    for chat_response in session.streaming_chat(request):
        message: Dict[str, Any] = chat_response.get("response", empty)
        processor.process_message(message, chat_response.get("type"))

    return processor.get_compiled_answer()


# -- DEMO SCENARIOS -- drawn from common FTS L3 SAP support patterns --------
SCENARIOS = [
    {
        "title": "Scenario 1: CIF Active Transfer Job Block",
        "incident": """
            Incident INC0012345: CIF Active Transfer batch job is stuck in status
            RUNNING since 06:00 UTC. CIF transfer queue is backing up.
            Plant 6220 materials are not transferring to APO.
            Error in SM37: qRFC queue CIFACTPIRAPOC6220 in WAITING state.
            No errors in SM58 but the active version is not reflecting in APO.
        """,
    },
    {
        "title": "Scenario 2: MRP Planned Order Instead of Purchase Requisition",
        "incident": """
            Plant 4197 (Marcello) -- Material 7100345987.
            MRP is generating planned orders instead of purchase requisitions.
            This material should be externally procured.
            Strategy group is 40. MRP type is PD.
            Buyer is complaining that no PR is visible in MD04.
        """,
    },
    {
        "title": "Scenario 3: BOM Visibility Issue in Custom ABAP Report",
        "incident": """
            Custom transaction ZBOMRPT is not showing the variant BOM for material
            3001234567 at plant 1101. The standard CS03 shows the BOM correctly
            with STLAL=02 (variant BOM). The ABAP report seems to only pull STLAL=01.
            Business needs this in the report for production planning.
        """,
    },
    {
        "title": "Scenario 4: LOIPRO IDoc Flood to MES",
        "incident": """
            Incident INC0012346: MES system is being flooded with LOIPRO IDocs.
            Approximately 4000+ IDocs sent in the last 2 hours.
            Root cause unknown. Goods receipts were being processed in MIGO.
            WORKORDER_UPDATE BAdI may be involved.
            IDoc status in WE05 shows all as processed (53) but MES team
            is reporting duplicate work order updates causing data integrity issues.
        """,
    },
]


def main():
    print("=" * 60)
    print("FTS DIAGNOSTIC ASSISTANT -- DEMO")
    print("=" * 60)

    for i, scenario in enumerate(SCENARIOS, 1):
        print(f"\n{'=' * 60}")
        print(f"RUNNING: {scenario['title']}")
        print("=" * 60)
        print(f"INPUT:\n{scenario['incident'].strip()}")
        print("\nPROCESSING... (multi-agent analysis in progress)\n")
        try:
            result = invoke_fts_agent(scenario["incident"])
            print("RESULT:")
            print(result)
        except Exception as exception:  # pylint: disable=broad-except
            print(f"ERROR: {exception}")
            import traceback  # pylint: disable=import-outside-toplevel

            traceback.print_exc()

    print("\n" + "=" * 60)
    print("DEMO COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
