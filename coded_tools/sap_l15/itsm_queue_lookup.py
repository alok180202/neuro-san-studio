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

# Complete ITSM queue mapping for the SAP L1.5 hub.
QUEUE_MAP: Dict[str, Dict[str, str]] = {
    "FTS": {
        "queue": "FTS-L2-SUPPORT",
        "team": "FTS L2 Team",
        "notes": "Handle directly. Document in ticket and update KB.",
    },
    "MDM": {
        "queue": "MDM-MATERIAL-SUPPORT",
        "team": "Master Data Management Team",
        "notes": "Assign with material number, plant, and field in question.",
    },
    "OTC": {
        "queue": "OTC-ORDER-SUPPORT",
        "team": "Order to Cash Team",
        "notes": "Include sales order number, sold-to, and error detail.",
    },
    "ICO": {
        "queue": "ICO-INTERCO-SUPPORT",
        "team": "Intercompany Operations Team",
        "notes": "Include STO/PO/SO numbers and the company codes involved.",
    },
    "LEX-WH": {
        "queue": "LEX-WAREHOUSE-SUPPORT",
        "team": "Warehouse Operations Team",
        "notes": "Include warehouse number, storage type, and transfer order.",
    },
    "LEX-TM": {
        "queue": "LEX-TM-SUPPORT",
        "team": "Transportation Management Team",
        "notes": "Include shipment/freight order number and carrier.",
    },
    "BI": {
        "queue": "BI-REPORTING-SUPPORT",
        "team": "BI Reporting Team",
        "notes": "Include report/query name and selection variant.",
    },
    "BW": {
        "queue": "BW-HANA-SUPPORT",
        "team": "BW/HANA Team",
        "notes": "Include InfoProvider/DTP/process chain name.",
    },
    "SECURITY": {
        "queue": "SAP-SECURITY-SUPPORT",
        "team": "SAP Security Team",
        "notes": "Include user ID, transaction, and missing authorization object.",
    },
    "BASIS": {
        "queue": "SAP-BASIS-SUPPORT",
        "team": "SAP Basis Team",
        "notes": "Raise for LiveCache, RFC destination, transport, or kernel/performance issues.",
    },
    "WRICEF": {
        "queue": "WRICEF-ABAP-SUPPORT",
        "team": "WRICEF / ABAP Development Team",
        "notes": "Include program name, transaction, and screenshot of the issue.",
    },
    "ESCALATE": {
        "queue": "L2-ESCALATION",
        "team": "L2 Escalation Path (Manager / SAP COE)",
        "notes": "Escalate when root cause is unknown after L1.5 analysis, or requires SAP OSS.",
    },
}

# Aliases to handle LLM variations in fix_owner tags.
ALIASES: Dict[str, str] = {
    # Direct case-insensitive aliases for the canonical keys themselves.
    "fts": "FTS",
    "mdm": "MDM",
    "otc": "OTC",
    "ico": "ICO",
    "lex-wh": "LEX-WH",
    "lex wh": "LEX-WH",
    "lex-tm": "LEX-TM",
    "lex tm": "LEX-TM",
    "bi": "BI",
    "bw": "BW",
    "security": "SECURITY",
    "basis": "BASIS",
    "wricef": "WRICEF",
    "escalate": "ESCALATE",
    "escalation": "ESCALATE",
    # Loose synonyms.
    "forecast": "FTS",
    "apo": "FTS",
    "snp": "FTS",
    "dp": "FTS",
    "ppds": "FTS",
    "cif": "FTS",
    "master data": "MDM",
    "material master": "MDM",
    "sales": "OTC",
    "intercompany": "ICO",
    "warehouse": "LEX-WH",
    "ewm": "LEX-WH",
    "transport": "LEX-TM",
    "reporting": "BI",
    "hana": "BW",
    "auth": "SECURITY",
    "access": "SECURITY",
    "infrastructure": "BASIS",
    "rfc": "BASIS",
    "abap": "WRICEF",
    "z-program": "WRICEF",
}


class ITSMQueueLookupTool(CodedTool):
    """
    Deterministic ITSM queue lookup for the SAP L1.5 hub.
    Returns the exact assignment group, team name, and routing notes
    for a given fix_owner tag. Does not call an LLM -- pure lookup table.
    """

    async def async_invoke(self, args: Dict[str, Any], sly_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Look up the ITSM queue for a given fix_owner tag.

        :param args: A dictionary with key:
                "fix_owner": the fix owner tag to resolve (e.g. "FTS", "WRICEF").
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
        fix_owner_normalized: str = ALIASES.get(fix_owner_key, fix_owner_raw.upper())
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
            # Unknown owner -- default to ESCALATE for safety.
            tool_response = {
                "fix_owner_normalized": "ESCALATE (defaulted)",
                "queue": QUEUE_MAP["ESCALATE"]["queue"],
                "team": QUEUE_MAP["ESCALATE"]["team"],
                "notes": f"WARNING: Unknown fix_owner '{fix_owner_raw}'. Defaulted to ESCALATE. Review manually.",
                "found": False,
            }

        logger.debug("-----------------------")
        logger.debug("%s response: %s", tool_name, tool_response)
        logger.debug("========== Done with %s ==========", tool_name)
        return tool_response
