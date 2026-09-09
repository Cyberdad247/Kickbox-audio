use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use crate::governance::{ArthurLedger, GideonVerifier};

pub fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct KnightPrompt {
    pub knight_id: String,      // e.g. "Sir_Codex", "Sir_Boris", "Lady_Mnemosyne", "Sir_Warden"
    pub role: String,           // e.g. "Kinetic Implementer", "Thermodynamics Architect"
    pub task: String,
    pub context: Vec<u8>,       // TOON-compressed context
    pub lease_id: String,       // Sentinel lease
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct KnightResult {
    pub knight_id: String,
    pub output: Vec<u8>,
    pub output_text: String,
    pub evidence_hash: String,  // SHA-256
    pub retry_count: u32,
    pub status: String,         // "VERIFIED" | "RETRY_REQUIRED" | "FAILED"
    pub execution_ms: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct DagNode {
    pub node_id: String,
    pub knight_id: String,
    pub role: String,
    pub task: String,
    pub context: Vec<u8>,
    pub dependencies: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MerlinDag {
    pub task_id: String,
    pub master_directive: String,
    pub nodes: Vec<DagNode>,
}

pub struct MerlinEngine;

impl MerlinEngine {
    pub fn new() -> Self {
        Self
    }

    /// Decompose Master Sovereign Directive into parallel Knight DAG nodes
    pub fn decompose(&self, directive: &str) -> MerlinDag {
        let task_id = format!("DAG-{}", &sha256_hex(directive.as_bytes())[0..8]);
        let nodes = vec![
            DagNode {
                node_id: "node_codex".to_string(),
                knight_id: "Sir_Codex".to_string(),
                role: "Rust/WASM Kinetic Implementation".to_string(),
                task: format!("Implement core logic for: {}", directive),
                context: directive.as_bytes().to_vec(),
                dependencies: vec![],
            },
            DagNode {
                node_id: "node_boris".to_string(),
                knight_id: "Sir_Boris".to_string(),
                role: "Architecture & Thermodynamics Audit".to_string(),
                task: format!("Verify resource bounds & zero-entropy layout for: {}", directive),
                context: directive.as_bytes().to_vec(),
                dependencies: vec![],
            },
            DagNode {
                node_id: "node_mnemosyne".to_string(),
                knight_id: "Lady_Mnemosyne".to_string(),
                role: "GraphMemory & CRDT Context Ingest".to_string(),
                task: format!("Fetch relevant GraphMemory context for: {}", directive),
                context: directive.as_bytes().to_vec(),
                dependencies: vec![],
            },
            DagNode {
                node_id: "node_warden".to_string(),
                knight_id: "Sir_Warden".to_string(),
                role: "Fuzzing & Fault Injection Test".to_string(),
                task: format!("Run zero-trust security & fuzz suite for: {}", directive),
                context: directive.as_bytes().to_vec(),
                dependencies: vec![],
            },
        ];

        MerlinDag {
            task_id,
            master_directive: directive.to_string(),
            nodes,
        }
    }
}

pub struct AgentLoop {
    pub merlin: MerlinEngine,
    pub gideon: GideonVerifier,
    pub arthur: ArthurLedger,
    pub max_retries: u32,
}

impl AgentLoop {
    pub fn new() -> Self {
        Self {
            merlin: MerlinEngine::new(),
            gideon: GideonVerifier::new(),
            arthur: ArthurLedger::new(),
            max_retries: 2,
        }
    }

    /// Run Bio-Kinetic Swarm across Merlin's loop-prompting DAG
    pub async fn run_bio_kinetic_swarm(
        &self,
        master_directive: &str,
        simulate_failure_on_knight: Option<&str>,
    ) -> Vec<KnightResult> {
        let dag = self.merlin.decompose(master_directive);
        let mut results = Vec::new();

        for node in &dag.nodes {
            let mut current_prompt = format!("{}: {}", node.role, node.task);
            let mut retries = 0;
            let mut final_result = None;

            while retries <= self.max_retries {
                let start_time = std::time::Instant::now();
                // Simulate knight execution
                let should_fail = retries == 0 
                    && simulate_failure_on_knight.map_or(false, |k| k == node.knight_id);

                let output_text = if should_fail {
                    format!("COMPILATION_ERROR: Type mismatch in patch logic at line 42 [FAULT_INJECTED]")
                } else {
                    format!(
                        "VERIFIED_OUTPUT [{}]: Completed {} successfully with zero memory leaks.",
                        node.knight_id, node.task
                    )
                };

                let output_bytes = output_text.as_bytes().to_vec();
                let evidence_hash = sha256_hex(&output_bytes);
                let execution_ms = start_time.elapsed().as_millis() as u64;

                let verification = self.gideon.gate(&evidence_hash, &output_text);

                if verification.is_ok() {
                    final_result = Some(KnightResult {
                        knight_id: node.knight_id.clone(),
                        output: output_bytes,
                        output_text,
                        evidence_hash,
                        retry_count: retries,
                        status: "VERIFIED".to_string(),
                        execution_ms,
                    });
                    break;
                } else {
                    // Loop-Prompting: Merlin re-prompts the Knight with error context
                    retries += 1;
                    if retries <= self.max_retries {
                        current_prompt = format!(
                            "{} - MERLIN RE-PROMPT (Retry {}): Fix verified error hash {}",
                            node.task, retries, evidence_hash
                        );
                    } else {
                        final_result = Some(KnightResult {
                            knight_id: node.knight_id.clone(),
                            output: output_bytes,
                            output_text,
                            evidence_hash: format!("ERR:{}", evidence_hash),
                            retry_count: retries,
                            status: "FAILED".to_string(),
                            execution_ms,
                        });
                    }
                }
            }

            if let Some(res) = final_result {
                results.push(res);
            }
        }

        // Gather & Verify Batch through Arthur Ledger
        self.arthur.record_batch(&dag.task_id, &results);
        results
    }
}
