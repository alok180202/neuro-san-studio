// Mirrors the SCENARIOS list in tests/sap_l15_hub/test_sap_l15_hub.py (S1-S5,
// the validated regression set) plus two extra tickets covering module agents
// that S1-S5 don't otherwise exercise (LEX-Warehouse, Basis).

export interface Scenario {
  id: string
  title: string
  expectation: string
  ticket: string
}

export const SCENARIOS: Scenario[] = [
  {
    id: 's1-snp-chain',
    title: 'S1: SNP heuristic run failure',
    expectation: 'Intake -> TicketAnalysis -> Consultor -> FTS -> SNPDiagnosticsAgent -> ITSMRouterAgent',
    ticket: `SNP heuristic run /SAPAPO/SNPRUN failed for plant 1101. Log shows: no valid source of supply for material 7100345987. Deployment run also failed overnight.`,
  },
  {
    id: 's2-cif-idoc-flood',
    title: 'S2: CIF IDoc flood',
    expectation: 'Routes to CIFAPODiagnosticsAgent',
    ticket: `MES system receiving thousands of LOIPRO IDocs since 14:00. WE05 shows status 53 but MES reports duplicates. WORKORDER_UPDATE BAdI suspected.`,
  },
  {
    id: 's3-dp-forecast',
    title: 'S3: DP forecast not running',
    expectation: 'Routes to DPDiagnosticsAgent, CVC-missing pattern',
    ticket: `Demand Planning forecast is not running for new material 9001234567 at DC Hamburg. Material was created last week. Planning book shows no rows.`,
  },
  {
    id: 's4-otc-credit-block',
    title: 'S4: Sales order credit block (non-FTS)',
    expectation: 'Consultor routes straight to OTCModuleAgent; FTS must NOT be engaged',
    ticket: `Sales order cannot be created for customer C-10045. Error: customer credit limit exceeded. VA01 shows hard block.`,
  },
  {
    id: 's5-access-request',
    title: 'S5: Access request',
    expectation: 'Intake routes directly to SecurityModuleAgent, skipping TicketAnalysis/Consultor',
    ticket: `User JSMITH cannot access transaction ME53N. SU53 shows authorization object M_EINK_BSA missing.`,
  },
  {
    id: 'extra-warehouse-picking',
    title: 'Extra: EWM picking failure',
    expectation: 'Routes to LEXWarehouseModuleAgent',
    ticket: `Warehouse task creation is failing in EWM for outbound delivery 8004521. LT04 shows no open warehouse tasks. Picking wave 8004521-W1 stuck in status "created".`,
  },
  {
    id: 'extra-basis-performance',
    title: 'Extra: Background job performance',
    expectation: 'Routes to BasisModuleAgent',
    ticket: `Background jobs in client 300 are running 5x slower than usual since last night's kernel patch. SM66 shows multiple work processes stuck in PRIV mode. Users reporting RFC timeouts.`,
  },
]
