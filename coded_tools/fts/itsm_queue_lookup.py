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

from logging import Logger
from logging import getLogger
from typing import Any
from typing import Dict

from neuro_san.interfaces.coded_tool import CodedTool

# Complete ITSM queue mapping for FTS L3 scope.
QUEUE_MAP: Dict[str, Dict[str, str]] = {
    "L3": {
        "queue": "FTS-L3-SUPPORT",
        "team": "FTS L3 Team",
        "notes": "Handle directly. Document in ticket and update KB.",
    },
    "CIF Model Owner": {
        "queue": "APO-CIF-MODEL-OWNERS",
        "team": "CIF Model Owners",
        "notes": "Coordinate with your manager. Provide CFM1/CFM2 screenshots.",
    },
    "MDM": {
        "queue": "MDM-MASTER-DATA",
        "team": "Master Data Management Team",
        "notes": "Assign with material number, plant, and field in question.",
    },
    "OTC": {
        "queue": "OTC-ORDER-TO-CASH",
        "team": "Order to Cash Team",
        "notes": "Include sales order number, sold-to, and error detail.",
    },
    "WRICEF": {
        "queue": "WRICEF-ABAP-TEAM",
        "team": "WRICEF / ABAP Development Team",
        "notes": "Include program name, transaction, and screenshot of hardcoded filter.",
    },
    "Basis": {
        "queue": "BASIS-INFRASTRUCTURE",
        "team": "SAP Basis Team",
        "notes": "Raise for liveCache, RFC destination, transport, or authorization issues.",
    },
    "EHS": {
        "queue": "EHS-LEGAL-COMPLIANCE",
        "team": "Environment Health & Safety / GTS-Legal Team",
        "notes": "For GTS Legal Control blocks, tariff codes, and PAHTS regulation issues.",
    },
    "Escalate": {
        "queue": "FTS-L3-ESCALATION",
        "team": "FTS L3 Escalation Path (Manager / SAP COE)",
        "notes": "Escalate when root cause is unknown after L3 analysis, or requires SAP OSS.",
    },
}

# Aliases to handle LLM variations in fix_owner tags.
ALIASES: Dict[str, str] = {
    "l3": "L3",
    "fts l3": "L3",
    "fts-l3": "L3",
    "cif model owner": "CIF Model Owner",
    "cif model owners": "CIF Model Owner",
    "cif": "CIF Model Owner",
    "apo": "CIF Model Owner",
    "mdm": "MDM",
    "master data": "MDM",
    "otc": "OTC",
    "order to cash": "OTC",
    "wricef": "WRICEF",
    "abap": "WRICEF",
    "ritm": "WRICEF",
    "basis": "Basis",
    "sap basis": "Basis",
    "ehs": "EHS",
    "gts": "EHS",
    "legal": "EHS",
    "escalate": "Escalate",
    "escalation": "Escalate",
}


class ITSMQueueLookupTool(CodedTool):
    """
    Deterministic ITSM queue lookup for FTS L3 SAP support.
    Returns the exact assignment group, team name, and routing notes
    for a given fix_owner tag. Does not call an LLM -- pure lookup table.
    """

    async def async_invoke(self, args: Dict[str, Any], sly_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Look up the ITSM queue for a given fix_owner tag.

        :param args: A dictionary with key:
                "fix_owner": the fix owner tag to resolve (e.g. "L3", "WRICEF").
        :param sly_data: A dictionary containing parameters that should be kept out of the chat stream.
                Not used by this tool.

        :return: A dictionary containing:
                 "fix_owner_normalized": the resolved fix_owner key
                 "queue": the exact ITSM assignment group
                 "team": the owning team name
                 "notes": routing guidance
                 "found": whether the fix_owner was recognized
        """
        tool_name = self.__class__.__name__
        logger: Logger = getLogger(self.__class__.__name__)

        logger.debug("========== Calling %s ==========", tool_name)
        logger.debug("args: %s", str(args))

        fix_owner_raw: str = args.get("fix_owner", "").strip()
        fix_owner_key: str = fix_owner_raw.lower()

        # Resolve aliases first, then look up in the main map.
        fix_owner_normalized: str = ALIASES.get(fix_owner_key, fix_owner_raw)
        result: Dict[str, str] = QUEUE_MAP.get(fix_owner_normalized)

        if result:
            tool_response = {
                "fix_owner_normalized": fix_owner_normalized,
                "queue": result["queue"],
                "team": result["team"],
                "notes": result["notes"],
                "found": True,
            }
        else:
            # Unknown owner -- default to L3 for safety.
            tool_response = {
                "fix_owner_normalized": "L3 (defaulted)",
                "queue": QUEUE_MAP["L3"]["queue"],
                "team": QUEUE_MAP["L3"]["team"],
                "notes": f"WARNING: Unknown fix_owner '{fix_owner_raw}'. Defaulted to L3. Review manually.",
                "found": False,
            }

        logger.debug("-----------------------")
        logger.debug("%s response: %s", tool_name, tool_response)
        logger.debug("========== Done with %s ==========", tool_name)
        return tool_response
