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
from typing import List

from neuro_san.interfaces.coded_tool import CodedTool

# Demo dictionary of SAP Notes, keyed by a list of keywords used for fuzzy matching.
# This is NOT a live SAP Support Portal lookup -- it's a hardcoded demo dataset.
NOTE_PATTERNS: List[Dict[str, Any]] = [
    {
        "keywords": ["qrfc", "sysfail", "queue in waiting", "queue waiting"],
        "note": "SAP Note 0619768",
        "description": "qRFC queue stuck in SYSFAIL/WAITING status -- troubleshooting queued RFC transfer errors.",
        "component": "BC-MID-RFC",
    },
    {
        "keywords": ["loipro", "idoc flood", "workorder_update", "duplicate idoc", "duplicate work order"],
        "note": "SAP Note 1590182",
        "description": "LOIPRO IDoc flood to MES caused by redundant WORKORDER_UPDATE BAdI triggering.",
        "component": "PP-SFC",
    },
    {
        "keywords": ["cif transfer", "location product not active", "location-product", "cif model", "active version not reflecting"],
        "note": "SAP Note 0736058",
        "description": "CIF Active Transfer completes but location-product is not active in APO.",
        "component": "SCM-APO-INT-CIF",
    },
    {
        "keywords": ["no valid source of supply", "transportation lane", "heuristic run", "quota arrangement"],
        "note": "SAP Note 1616688",
        "description": "SNP heuristic finds no valid source of supply -- missing/expired transportation lane or quota arrangement.",
        "component": "SCM-APO-SNP",
    },
    {
        "keywords": ["deployment", "frozen zone", "safety stock"],
        "note": "SAP Note 2061711",
        "description": "SNP deployment run fails or ignores stock within the frozen zone / safety stock horizon.",
        "component": "SCM-APO-SNP-DEP",
    },
    {
        "keywords": ["cvc", "characteristic value combination", "planning book shows no rows", "new material", "no rows"],
        "note": "SAP Note 1234567",
        "description": "Demand Planning shows no rows for a new material/location because the CVC has not been created.",
        "component": "SCM-APO-DP",
    },
    {
        "keywords": ["forecast model", "mape", "mad"],
        "note": "SAP Note 0987654",
        "description": "Forecast model accuracy issues -- MAPE/MAD calculation and forecast model selection.",
        "component": "SCM-APO-DP-FCT",
    },
    {
        "keywords": ["production version", "validity", "lot size", "lot-size"],
        "note": "SAP Note 1456789",
        "description": "PPDS/PP scheduling anomalies caused by production version validity range or lot-size settings.",
        "component": "SCM-APO-PPS",
    },
    {
        "keywords": ["pegging", "planned order not covered"],
        "note": "SAP Note 1876543",
        "description": "PPDS pegging shows a planned order as not covered by a valid supply element.",
        "component": "SCM-APO-PPS-PEG",
    },
    {
        "keywords": ["source list", "strategy group 40", "purchase requisition", "planned order instead"],
        "note": "SAP Note 0123456",
        "description": "MRP generates planned orders instead of purchase requisitions -- source list / strategy group 40 configuration.",
        "component": "MM-CBP",
    },
    {
        "keywords": ["stlal", "bom usage", "alternative bom", "variant bom"],
        "note": "SAP Note 0456123",
        "description": "Custom reports/transactions not reflecting an alternative BOM -- STLAL (BOM usage) field handling.",
        "component": "PP-BD-BOM",
    },
]

FALLBACK_NOTE: Dict[str, str] = {
    "note": "No matching SAP Notes found for this pattern.",
    "description": "Consider searching SAP Support Portal.",
    "component": "GENERAL",
}


class SAPNoteLookupTool(CodedTool):
    """
    Deterministic, case-insensitive fuzzy keyword matcher against a hardcoded demo
    dictionary of SAP Notes. Does not call an LLM or any external API.
    """

    async def async_invoke(self, args: Dict[str, Any], sly_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Look up SAP Notes matching a given error_pattern.

        :param args: A dictionary with key:
                "error_pattern": a short keyword phrase describing the symptom/error signature.
        :param sly_data: A dictionary containing parameters that should be kept out of the chat stream.
                Not used by this tool.

        :return: A dictionary containing:
                 "error_pattern_received": the error_pattern as received
                 "matches_found": the number of matching SAP Notes
                 "notes": a list of {"note", "description", "component"} dictionaries,
                          ordered by number of keyword hits (best match first)
        """
        tool_name = self.__class__.__name__
        logger: Logger = getLogger(self.__class__.__name__)

        logger.debug("========== Calling %s ==========", tool_name)
        logger.debug("args: %s", str(args))

        error_pattern_raw: str = args.get("error_pattern", "").strip()
        error_pattern_key: str = error_pattern_raw.lower()

        scored_matches: List[Dict[str, Any]] = []
        for pattern in NOTE_PATTERNS:
            hit_count = sum(1 for keyword in pattern["keywords"] if keyword in error_pattern_key)
            if hit_count > 0:
                scored_matches.append((hit_count, pattern))

        scored_matches.sort(key=lambda pair: pair[0], reverse=True)

        if scored_matches:
            notes = [
                {
                    "note": pattern["note"],
                    "description": pattern["description"],
                    "component": pattern["component"],
                }
                for _, pattern in scored_matches
            ]
        else:
            notes = [dict(FALLBACK_NOTE)]

        tool_response = {
            "error_pattern_received": error_pattern_raw,
            "matches_found": len(notes) if scored_matches else 0,
            "notes": notes,
        }

        logger.debug("-----------------------")
        logger.debug("%s response: %s", tool_name, tool_response)
        logger.debug("========== Done with %s ==========", tool_name)
        return tool_response
