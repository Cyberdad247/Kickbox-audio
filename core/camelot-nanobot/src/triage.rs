use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum TriageRing {
    /// Hot-Path: Zero-copy, sub-10ms latency, native WASM/Rust processes
    Ring0HotPath,
    /// Warm-Path: GraphMemory, NotebookLM context synchronizer, DB indexing
    Ring1ContextSync,
    /// Cold-Path: Background audits, long-running telemetry, fuzz testing
    Ring2ColdAudits,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TriageTask {
    pub id: String,
    pub title: String,
    pub payload: String,
    pub requested_by: String,
    pub latency_budget_ms: u64,
    pub estimated_memory_kb: u64,
    pub target_ring: TriageRing,
    pub assigned_knight: String,
    pub priority: u8, // 1 (highest) to 10 (lowest)
    pub status: String, // "QUEUED" | "TRIAGED" | "EXECUTING" | "REJECTED_CGROUP"
    pub reason: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CgroupV2Budget {
    pub memory_max_bytes: u64, // e.g. 512MB = 536870912
    pub memory_current_bytes: u64,
    pub cpu_quota_pct: u32,
    pub max_tasks: u32,
    pub current_tasks: u32,
}

impl Default for CgroupV2Budget {
    fn default() -> Self {
        Self {
            memory_max_bytes: 512 * 1024 * 1024,
            memory_current_bytes: 42 * 1024 * 1024,
            cpu_quota_pct: 100,
            max_tasks: 128,
            current_tasks: 4,
        }
    }
}

pub struct SelfTriageEngine {
    pub cgroup_budget: CgroupV2Budget,
}

impl SelfTriageEngine {
    pub fn new() -> Self {
        Self {
            cgroup_budget: CgroupV2Budget::default(),
        }
    }

    /// Autonomous self-triage based on latency budget, domain affinity, and cgroups v2 limits
    pub fn triage_task(&mut self, mut task: TriageTask) -> TriageTask {
        // Check cgroups v2 resource ceiling
        let req_bytes = task.estimated_memory_kb * 1024;
        if self.cgroup_budget.memory_current_bytes + req_bytes > self.cgroup_budget.memory_max_bytes {
            task.status = "REJECTED_CGROUP".to_string();
            task.reason = format!(
                "Memory ceiling exceeded: Current {}MB + Req {}MB > 512MB Limit",
                self.cgroup_budget.memory_current_bytes / (1024 * 1024),
                req_bytes / (1024 * 1024)
            );
            return task;
        }

        if self.cgroup_budget.current_tasks >= self.cgroup_budget.max_tasks {
            task.status = "REJECTED_CGROUP".to_string();
            task.reason = "Max concurrent tasks (128) reached on native cgroup slice.".to_string();
            return task;
        }

        // Autonomous Ring classification
        if task.latency_budget_ms <= 25 {
            task.target_ring = TriageRing::Ring0HotPath;
            // Hot path routing: Sir Codex or Sir Octavian (bare metal / WASM)
            if task.payload.contains("bare_metal") || task.payload.contains("actuate") {
                task.assigned_knight = "Sir_Octavian".to_string();
            } else {
                task.assigned_knight = "Sir_Codex".to_string();
            }
            task.priority = 1;
            task.reason = "Triaged to Ring 0 (Hot-path Zero-Copy, Sub-25ms SLA)".to_string();
        } else if task.latency_budget_ms <= 300 {
            task.target_ring = TriageRing::Ring1ContextSync;
            // Context sync routing: Lady Mnemosyne or Anya
            if task.payload.contains("planner") || task.payload.contains("orchestrate") {
                task.assigned_knight = "Anya_Kernel".to_string();
            } else {
                task.assigned_knight = "Lady_Mnemosyne".to_string();
            }
            task.priority = 2;
            task.reason = "Triaged to Ring 1 (GraphMemory / Context Syncer)".to_string();
        } else {
            task.target_ring = TriageRing::Ring2ColdAudits;
            // Cold audit routing: Sir Boris, Sir Warden, or Malik
            if task.payload.contains("security") || task.payload.contains("fuzz") {
                task.assigned_knight = "Sir_Warden".to_string();
            } else {
                task.assigned_knight = "Sir_Boris".to_string();
            }
            task.priority = 3;
            task.reason = "Triaged to Ring 2 (Background Audit & Thermodynamics)".to_string();
        }

        task.status = "TRIAGED".to_string();
        self.cgroup_budget.memory_current_bytes += req_bytes;
        self.cgroup_budget.current_tasks += 1;

        task
    }
}
