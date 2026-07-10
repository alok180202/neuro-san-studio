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
SAP L1.5 Diagnostic Hub -- Scenario Runner

Runs one (or all) of the 5 validation scenarios against the sap_l15_hub network,
using a direct (in-process) session -- no server required.

Run from neuro-san-studio/ root with venv activated:
    python tests/sap_l15_hub/test_sap_l15_hub.py <scenario_number>   # e.g. 1
    python tests/sap_l15_hub/test_sap_l15_hub.py                     # runs all 5

Requires GOOGLE_API_KEY (or another configured provider key) set in .env.
"""

import os
import sys
import warnings
from typing import Any
from typing import Dict

warnings.filterwarnings("ignore", category=RuntimeWarning)

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from neuro_san_studio.commands.project_environment import ProjectEnvironment  # noqa: E402

ProjectEnvironment(_REPO_ROOT).apply()

from neuro_san.client.agent_session_factory import AgentSessionFactory  # noqa: E402
from neuro_san.client.streaming_input_processor import StreamingInputProcessor  # noqa: E402
from neuro_san.interfaces.agent_session import AgentSession  # noqa: E402
from neuro_san.message_processing.basic_message_processor import BasicMessageProcessor  # noqa: E402

AGENT_NAME = "sap_l15_hub/sap_l15_hub"


def invoke_hub_agent(ticket_text: str) -> str:
    """Invoke the SAP L1.5 hub directly (in-process) and return the final text response."""
    session: AgentSession = AgentSessionFactory().create_session("direct", AGENT_NAME)
    input_processor = StreamingInputProcessor(session=session)
    processor: BasicMessageProcessor = input_processor.get_message_processor()
    request: Dict[str, Any] = input_processor.formulate_chat_request(ticket_text)

    empty: Dict[str, Any] = {}
    for chat_response in session.streaming_chat(request):
        message: Dict[str, Any] = chat_response.get("response", empty)
        processor.process_message(message, chat_response.get("type"))

    return processor.get_compiled_answer()


# -- VALIDATION SCENARIOS -----------------------------------------------------
SCENARIOS = [
    {
        "title": "S1: SNP chain -- expect L1.5->TicketAnalysis->Consultor->FTS->SNPDiagnosticsAgent->ITSMRouterAgent",
        "ticket": """
            SNP heuristic run /SAPAPO/SNPRUN failed for plant 1101. Log shows: no
            valid source of supply for material 7100345987. Deployment run also
            failed overnight.
        """,
    },
    {
        "title": "S2: CIF IDoc flood -- expect routing to CIFAPODiagnosticsAgent, SAP Note 1590182",
        "ticket": """
            MES system receiving thousands of LOIPRO IDocs since 14:00. WE05 shows
            status 53 but MES reports duplicates. WORKORDER_UPDATE BAdI suspected.
        """,
    },
    {
        "title": "S3: DP forecast -- expect DPDiagnosticsAgent, CVC-missing pattern",
        "ticket": """
            Demand Planning forecast is not running for new material 9001234567 at
            DC Hamburg. Material was created last week. Planning book shows no rows.
        """,
    },
    {
        "title": "S4: Non-FTS OTC -- expect Consultor routes straight to OTCModuleAgent, FTS must NOT be engaged",
        "ticket": """
            Sales order cannot be created for customer C-10045. Error: customer
            credit limit exceeded. VA01 shows hard block.
        """,
    },
    {
        "title": "S5: Access request -- expect L1.5 routes directly to SecurityModuleAgent, skipping TicketAnalysis/Consultor",
        "ticket": """
            User JSMITH cannot access transaction ME53N. SU53 shows authorization
            object M_EINK_BSA missing.
        """,
    },
]


def run_scenario(index: int) -> None:
    scenario = SCENARIOS[index - 1]
    print("=" * 70)
    print(f"RUNNING: {scenario['title']}")
    print("=" * 70)
    print(f"INPUT:\n{scenario['ticket'].strip()}")
    print("\nPROCESSING... (multi-agent analysis in progress)\n")
    try:
        result = invoke_hub_agent(scenario["ticket"])
        print("RESULT:")
        print(result)
    except Exception as exception:  # pylint: disable=broad-except
        print(f"ERROR: {exception}")
        import traceback  # pylint: disable=import-outside-toplevel

        traceback.print_exc()
    print("=" * 70)


def main():
    if len(sys.argv) > 1:
        run_scenario(int(sys.argv[1]))
    else:
        for i in range(1, len(SCENARIOS) + 1):
            run_scenario(i)


if __name__ == "__main__":
    main()
