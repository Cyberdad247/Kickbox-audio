import { cloudbrain } from './worldtree';
import path from 'path';

async function run() {
  console.log('[Sir Helio] Initializing 1M+ Context Repo Mapping...');
  await cloudbrain.mapRepositoryContext(path.resolve(__dirname, '../../..'));
  const syncResult = cloudbrain.syncWithNotebookLM('notebook_omega_v1000');
  console.log(JSON.stringify(syncResult, null, 2));
}

run();
