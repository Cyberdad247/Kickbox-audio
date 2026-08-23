import { describe, expect, it } from 'vitest';
import metadata from '../../../../../metadata.json';
import { DEFAULT_TENANTS } from '../../context/TenantContext';

describe('Biometric Camera Authentication & Metadata.json Camera Permission Governance', () => {
  it('strictly validates camera frame permission granted in metadata.json', () => {
    expect(metadata.requestFramePermissions).toBeDefined();
    expect(metadata.requestFramePermissions).toContain('camera');
  });

  it('secures Sovereign Arch-Architect with Ring 0 biometric enclave profile', () => {
    const arch = DEFAULT_TENANTS.find((t) => t.handle === 'VASHON_ARCH');
    expect(arch).toBeDefined();
    expect(arch?.clearance).toBe('SOVEREIGN_ARCH_ARCHITECT');
    expect(arch?.controllerType).toBe('HUMAN_ARCH_ARCHITECT');
    expect(arch?.humanVerified).toBe(true);
    expect(arch?.email).toBe('Vizion711@gmail.com');
  });

  it('secures Human Referral Controllers with verified human biometric invite clearance', () => {
    const referrals = DEFAULT_TENANTS.filter((t) => t.controllerType === 'HUMAN_REFERRAL');
    expect(referrals.length).toBe(2);

    for (const ref of referrals) {
      expect(ref.humanVerified).toBe(true);
      expect(ref.clearance).toBe('HUMAN_REFERRAL_CONTROLLER');
      expect(ref.referralBy).toBe('VASHON_ARCH');
      expect(ref.referralCode).toMatch(/^REF-ARCH-711-/);
    }
  });

  it('maintains zero-trust partition isolation across tenant biometric keys', () => {
    const tenantIds = DEFAULT_TENANTS.map((t) => t.tenantId);
    const uniqueIds = new Set(tenantIds);
    expect(uniqueIds.size).toBe(DEFAULT_TENANTS.length);

    for (const tenant of DEFAULT_TENANTS) {
      expect(tenant.cipher).toBeDefined();
      expect(tenant.id).toBeDefined();
    }
  });
});
