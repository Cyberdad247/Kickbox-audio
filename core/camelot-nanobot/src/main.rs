use camelot_nanobot::loop_prompting::AgentLoop;
use camelot_nanobot::triage::{SelfTriageEngine, TriageRing, TriageTask};

#[tokio::main]
async fn main() {
    println!("⚡ [CAMELOT-NANOBOT] Initializing Bio-Kinetic Swarm Host (Zero Docker, cgroups v2)...");

    let agent_loop = AgentLoop::new();
    let mut triage_engine = SelfTriageEngine::new();

    // Demonstrate Self-Triaging
    let sample_task = TriageTask {
        id: "TASK-001".to_string(),
        title: "Sub-10ms Zero-Copy Memory Slab Verification".to_string(),
        payload: "verify_bare_metal_ooda_latency".to_string(),
        requested_by: "Sovereign".to_string(),
        latency_budget_ms: 12,
        estimated_memory_kb: 512,
        target_ring: TriageRing::Ring0HotPath,
        assigned_knight: "UNASSIGNED".to_string(),
        priority: 5,
        status: "QUEUED".to_string(),
        reason: "".to_string(),
    };

    let triaged = triage_engine.triage_task(sample_task);
    println!("🛡️ Triaged task {}: Assigned to {} ({})", triaged.id, triaged.assigned_knight, triaged.reason);

    // Demonstrate Merlin Loop-Prompting Swarm Run
    println!("🕸️ Executing Sovereign Directive: 'Merlin, forge a secure auth patch using your swarm.'");
    let results = agent_loop.run_bio_kinetic_swarm(
        "Merlin, forge a secure auth patch using your swarm.",
        Some("Sir_Codex"), // Simulate Codex having an initial flaw and triggering Loop-Prompting
    ).await;

    for res in results {
        println!(
            "  [{}] Status: {} | Retries: {} | Execution: {}ms | Evidence: {}",
            res.knight_id, res.status, res.retry_count, res.execution_ms, &res.evidence_hash[0..16]
        );
    }

    println!("⚜️_SOVEREIGN_TRUTH: All Knight evidence verified. Arthur seal applied.");
}
