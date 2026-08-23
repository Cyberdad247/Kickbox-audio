import { describe, expect, it } from 'vitest';
import {
  type CrossRepoCartridge,
  PRE_REGISTERED_CROSS_REPO_CARTRIDGES,
  computeCartridgeMerkleRoot,
  resolveCrossRepoCartridge,
  validateCrossRepoCartridgeBatch,
  verifyCartridgeProvenance,
} from './cartridgeResolver';

describe('Cross-Repo Cartridge Integration & Resolution Engine', () => {
  it('pre-registered cartridges from audit-kickbox-audio monorepo verify successfully', async () => {
    expect(PRE_REGISTERED_CROSS_REPO_CARTRIDGES.length).toBeGreaterThanOrEqual(4);

    for (const cartridge of PRE_REGISTERED_CROSS_REPO_CARTRIDGES) {
      const result = await verifyCartridgeProvenance(cartridge);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.signatureMatches).toBe(true);
      expect(result.capabilityMatches).toBe(true);
      expect(result.computedMerkleRoot).toBeDefined();
    }
  });

  it('resolves Ring 0 Master & Ring 0 Security cartridges for SOVEREIGN_ARCH_ARCHITECT clearance', async () => {
    const bifrostCart = PRE_REGISTERED_CROSS_REPO_CARTRIDGES.find(
      (c) => c.id === 'cart-bifrost-gateway',
    )!;
    const dbCart = PRE_REGISTERED_CROSS_REPO_CARTRIDGES.find(
      (c) => c.id === 'cart-db-ledger-validator',
    )!;

    const resBifrost = await resolveCrossRepoCartridge(bifrostCart, 'SOVEREIGN_ARCH_ARCHITECT');
    expect(resBifrost.resolutionStatus).toBe('RESOLVED');
    expect(resBifrost.resolutionProof?.merkleVerified).toBe(true);
    expect(resBifrost.resolutionProof?.capabilityLeaseToken).toContain('KBA_LEASE_RING_0_SECURITY');

    const resDb = await resolveCrossRepoCartridge(dbCart, 'SOVEREIGN_ARCH_ARCHITECT');
    expect(resDb.resolutionStatus).toBe('RESOLVED');
    expect(resDb.resolutionProof?.capabilityLeaseToken).toContain('KBA_LEASE_RING_0_MASTER');
  });

  it('strictly rejects Ring 0 cartridges when requested by HUMAN_REFERRAL_CONTROLLER clearance', async () => {
    const bifrostCart = PRE_REGISTERED_CROSS_REPO_CARTRIDGES.find(
      (c) => c.id === 'cart-bifrost-gateway',
    )!;

    const resBifrost = await resolveCrossRepoCartridge(bifrostCart, 'HUMAN_REFERRAL_CONTROLLER');
    expect(resBifrost.resolutionStatus).toBe('REJECTED');
    expect(resBifrost.resolutionProof?.capabilityLeaseToken).toBe('RESTRICTED_CLEARANCE_DENIAL');
    expect(resBifrost.resolutionProof?.clearanceChecked).toBe('HUMAN_REFERRAL_CONTROLLER');
  });

  it('allows Ring 1 Workspace & Enclave cartridges for HUMAN_REFERRAL_CONTROLLER clearance', async () => {
    const lakishaCart = PRE_REGISTERED_CROSS_REPO_CARTRIDGES.find(
      (c) => c.id === 'cart-lakisha-voice-hud',
    )!;

    const resLakisha = await resolveCrossRepoCartridge(lakishaCart, 'HUMAN_REFERRAL_CONTROLLER');
    expect(resLakisha.resolutionStatus).toBe('RESOLVED');
    expect(resLakisha.resolutionProof?.merkleVerified).toBe(true);
  });

  it('rejects malformed cartridges with invalid semantic versions or missing HSM signatures', async () => {
    const invalidCartridge: CrossRepoCartridge = {
      id: 'cart-malformed',
      title: 'Malformed External Cartridge',
      code: 'CART_BAD',
      category: 'CUSTOM',
      description: 'Cartridge with invalid version string',
      icon: '⚠️',
      status: 'unmounted' as any,
      runtimeTier: 'Ring 2 Telemetry',
      version: 'invalid_version',
      originRepo: 'external/repo',
      resolutionStatus: 'UNRESOLVED',
      manifest: {
        version: 'invalid_version',
        entryPoint: '',
        requiredCapabilities: [],
        ringTier: 'Ring 2 Telemetry',
        merkleRoot: '0000',
        hsmSignature: 'UNSIGNED',
      },
    };

    const verification = await verifyCartridgeProvenance(invalidCartridge);
    expect(verification.valid).toBe(false);
    expect(verification.errors.length).toBeGreaterThan(0);

    const res = await resolveCrossRepoCartridge(invalidCartridge, 'SOVEREIGN_ARCH_ARCHITECT');
    expect(res.resolutionStatus).toBe('REJECTED');
  });

  it('computes deterministic Merkle roots matching expected structure', () => {
    const cart = PRE_REGISTERED_CROSS_REPO_CARTRIDGES[0];
    const merkle1 = computeCartridgeMerkleRoot(cart);
    const merkle2 = computeCartridgeMerkleRoot(cart);

    expect(merkle1).toBe(merkle2);
    expect(merkle1).toContain('merkle_v4_');
    expect(merkle1).toContain(cart.id.replace(/[^a-z0-9]/gi, '_'));
  });

  it('batch resolves cross-repo cartridges partitioning into resolved vs failed sets', async () => {
    const batch = [...PRE_REGISTERED_CROSS_REPO_CARTRIDGES];
    const { resolved, failed } = await validateCrossRepoCartridgeBatch(
      batch,
      'SOVEREIGN_ARCH_ARCHITECT',
    );

    expect(resolved.length).toBe(4);
    expect(failed.length).toBe(0);

    const { resolved: refResolved, failed: refFailed } = await validateCrossRepoCartridgeBatch(
      batch,
      'HUMAN_REFERRAL_CONTROLLER',
    );
    expect(refResolved.length).toBe(2); // Ring 1 Enclave & Ring 1 Workspace
    expect(refFailed.length).toBe(2); // Ring 0 Security & Ring 0 Master
  });
});
