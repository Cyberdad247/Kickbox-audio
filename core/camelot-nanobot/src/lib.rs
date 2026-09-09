//! CAMELOT-NANOBOT: Bio-Kinetic Swarm Engine & Autonomous Self-Triaging
//! Native processes, zero Docker, zero Python in hot-path.
//! Elevated by Merlin's Loop-Prompting DAG orchestration.

pub mod governance;
pub mod loop_prompting;
pub mod triage;

pub use governance::*;
pub use loop_prompting::*;
pub use triage::*;
