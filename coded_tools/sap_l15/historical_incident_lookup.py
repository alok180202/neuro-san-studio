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

import math
import os
import re
import threading
from collections import Counter
from logging import Logger
from logging import getLogger
from typing import Any
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

import openpyxl

from neuro_san.interfaces.coded_tool import CodedTool

# We don't have real SAP Support Portal access, so instead of citing SAP Notes, this
# tool searches our own historical ticket data for similar past incidents and how they
# were routed/resolved. TF-IDF + cosine similarity is used instead of an LLM/embedding
# model so the lookup stays deterministic (same query always returns the same ranking)
# and runs fully locally with no network calls.
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "routing_data_scrubbed.xlsx")

MIN_SIMILARITY_SCORE = 0.05
MAX_MATCHES = 3
MAX_SUMMARY_CHARS = 300

# Common English filler words plus ticket-boilerplate terms that would otherwise
# dominate similarity scores without carrying any diagnostic signal.
STOPWORDS = frozenset("""
a an the this that these those is are was were be been being do does did
to of and or in on at for with from by as it its it's i we you your our
please can could would should help team hello hi good day thanks thank
regarding request issue ticket need needs able unable not no yes just
""".split())

TOKEN_RE = re.compile(r"[a-z0-9]+")

FALLBACK_MATCH: Dict[str, Any] = {
    "ticket_id": None,
    "similarity_score": 0.0,
    "note": "No similar historical ticket found for this incident pattern.",
}


def _tokenize(text: str) -> List[str]:
    """Lowercase, split into word tokens, and drop stopwords/single-character tokens."""
    if not text:
        return []
    tokens = TOKEN_RE.findall(text.lower())
    return [t for t in tokens if t not in STOPWORDS and len(t) > 1]


class _TicketCorpus:
    """
    Lazily-built, process-wide TF-IDF index over the historical ticket dataset.
    Built once on first use and reused across calls -- the 902-row dataset is
    small enough that this costs a fraction of a second.
    """

    _instance: Optional["_TicketCorpus"] = None
    _lock = threading.Lock()

    def __init__(self, data_file: str):
        self.tickets: List[Dict[str, Any]] = []
        self.doc_vectors: List[Dict[str, float]] = []
        self.doc_norms: List[float] = []
        self.idf: Dict[str, float] = {}
        self._load(data_file)

    @classmethod
    def get_instance(cls) -> "_TicketCorpus":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(DATA_FILE)
        return cls._instance

    def _load(self, data_file: str) -> None:
        workbook = openpyxl.load_workbook(data_file, read_only=True, data_only=True)
        worksheet = workbook["Sheet1"]
        rows = worksheet.iter_rows(values_only=True)
        headers = [str(h).strip() for h in next(rows)]

        tokenized_docs: List[List[str]] = []
        for row in rows:
            record = dict(zip(headers, row))
            description = record.get("Incident_Description_Full") or ""
            if not str(description).strip():
                # No incident text to match against -- skip from the searchable corpus.
                continue
            self.tickets.append(record)
            tokenized_docs.append(_tokenize(str(description)))

        # Document frequency across the corpus, for IDF weighting.
        doc_freq: Counter = Counter()
        for tokens in tokenized_docs:
            for term in set(tokens):
                doc_freq[term] += 1

        num_docs = len(tokenized_docs)
        self.idf = {term: math.log((num_docs + 1) / (freq + 1)) + 1.0 for term, freq in doc_freq.items()}

        for tokens in tokenized_docs:
            vector = self._tfidf_vector(tokens)
            self.doc_vectors.append(vector)
            self.doc_norms.append(math.sqrt(sum(weight * weight for weight in vector.values())))

    def _tfidf_vector(self, tokens: List[str]) -> Dict[str, float]:
        term_freq = Counter(tokens)
        return {term: count * self.idf.get(term, 0.0) for term, count in term_freq.items()}

    def search(self, query_text: str, max_matches: int, min_score: float) -> List[Tuple[float, Dict[str, Any]]]:
        query_tokens = _tokenize(query_text)
        query_vector = self._tfidf_vector(query_tokens)
        query_norm = math.sqrt(sum(weight * weight for weight in query_vector.values()))
        if query_norm == 0.0:
            return []

        scored: List[Tuple[float, Dict[str, Any]]] = []
        for ticket, doc_vector, doc_norm in zip(self.tickets, self.doc_vectors, self.doc_norms):
            if doc_norm == 0.0:
                continue
            # Only iterate the smaller of the two term sets for the dot product.
            shorter, longer = (query_vector, doc_vector) if len(query_vector) < len(doc_vector) else (doc_vector, query_vector)
            dot_product = sum(weight * longer.get(term, 0.0) for term, weight in shorter.items())
            score = dot_product / (query_norm * doc_norm)
            if score >= min_score:
                scored.append((score, ticket))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        return scored[:max_matches]


def _truncate(text: Optional[str], max_chars: int) -> str:
    text = str(text or "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "..."


class HistoricalIncidentLookupTool(CodedTool):
    """
    Deterministic, local lookup tool that finds the most similar past incidents in our
    historical ticket data (coded_tools/sap_l15/data/routing_data_scrubbed.xlsx) for a
    given incident description, using TF-IDF + cosine similarity. Returns how those past
    tickets were routed and resolved. Does not call an LLM or any external API/portal.
    """

    async def async_invoke(self, args: Dict[str, Any], sly_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Look up similar historical incidents for a given incident description.

        :param args: A dictionary with key:
                "incident_text": the incident description or error pattern to match
                        against historical ticket descriptions.
        :param sly_data: A dictionary containing parameters that should be kept out of the chat stream.
                Not used by this tool.

        :return: A dictionary containing:
                 "query_received": the incident_text as received
                 "matches_found": the number of similar historical tickets found
                 "similar_incidents": a list of dictionaries, each with "ticket_id",
                        "similarity_score", "module_owner", "fts_sub_module",
                        "routing_label", "category", "priority", "status",
                        "incident_summary", and "resolution_summary" (or a note that
                        none was recorded), ordered by similarity (best match first)
        """
        tool_name = self.__class__.__name__
        logger: Logger = getLogger(self.__class__.__name__)

        logger.debug("========== Calling %s ==========", tool_name)
        logger.debug("args: %s", str(args))

        incident_text: str = str(args.get("incident_text", "")).strip()

        corpus = _TicketCorpus.get_instance()
        scored_matches = corpus.search(incident_text, MAX_MATCHES, MIN_SIMILARITY_SCORE)

        if scored_matches:
            similar_incidents = []
            for score, ticket in scored_matches:
                resolution = ticket.get("Resolution_Summary_Full")
                similar_incidents.append(
                    {
                        "ticket_id": ticket.get("Ticket_ID"),
                        "similarity_score": round(score, 3),
                        "module_owner": ticket.get("Module_Owner"),
                        "fts_sub_module": ticket.get("FTS_Sub_Module"),
                        "routing_label": ticket.get("Agent_Label"),
                        "category": ticket.get("Category"),
                        "priority": ticket.get("Priority"),
                        "status": ticket.get("Status"),
                        "incident_summary": _truncate(ticket.get("Incident_Description_Full"), MAX_SUMMARY_CHARS),
                        "resolution_summary": _truncate(resolution, MAX_SUMMARY_CHARS)
                        if resolution
                        else "No resolution summary recorded for this ticket.",
                    }
                )
        else:
            similar_incidents = [dict(FALLBACK_MATCH)]

        tool_response = {
            "query_received": incident_text,
            "matches_found": len(scored_matches),
            "similar_incidents": similar_incidents,
        }

        logger.debug("-----------------------")
        logger.debug("%s response: %s", tool_name, tool_response)
        logger.debug("========== Done with %s ==========", tool_name)
        return tool_response
