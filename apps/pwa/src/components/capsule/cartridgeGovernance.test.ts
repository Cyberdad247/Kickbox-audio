import { describe, expect, it } from 'vitest';
import { DEFAULT_TENANTS } from '../../context/TenantContext';

describe('Sovereign Arch-Architect & Human Referral Controllers Governance', () => {
  it('should strictly contain only Sovereign Arch-Architect and Referral Users (Human controllers)', () => {
    expect(DEFAULT_TENANTS.length).toBe(3);

    const handles = DEFAULT_TENANTS.map((t) => t.handle);
    expect(handles).toEqual(['VASHON_ARCH', 'HUMAN_REFERRAL_01', 'HUMAN_REFERRAL_02']);

    // Assert that standalone AI agents like Boris, Codex, Merlin are NOT tenants in the carousel rotation
    expect(handles).not.toContain('SIR_BORIS');
    expect(handles).not.toContain('SIR_CODEX');
    expect(handles).not.toContain('MERLIN_OMEGA');
    expect(handles).not.toContain('GUEST_SANDBOX');

    // All controllers must be verified human controllers
    for (const tenant of DEFAULT_TENANTS) {
      expect(tenant.humanVerified).toBe(true);
      expect(['HUMAN_ARCH_ARCHITECT', 'HUMAN_REFERRAL']).toContain(tenant.controllerType);
    }

    // Sovereign Arch-Architect validation
    const arch = DEFAULT_TENANTS.find((t) => t.handle === 'VASHON_ARCH');
    expect(arch).toBeDefined();
    expect(arch?.clearance).toBe('SOVEREIGN_ARCH_ARCHITECT');
    expect(arch?.controllerType).toBe('HUMAN_ARCH_ARCHITECT');
    expect(arch?.email).toBe('Vizion711@gmail.com');
    expect(arch?.subAgents).toContain('Sir Boris (Tokens)');
    expect(arch?.subAgents).toContain('Sir Codex (Kinetic)');

    // Referral Controller #1 validation
    const ref1 = DEFAULT_TENANTS.find((t) => t.handle === 'HUMAN_REFERRAL_01');
    expect(ref1).toBeDefined();
    expect(ref1?.clearance).toBe('HUMAN_REFERRAL_CONTROLLER');
    expect(ref1?.controllerType).toBe('HUMAN_REFERRAL');
    expect(ref1?.referralBy).toBe('VASHON_ARCH');
    expect(ref1?.referralCode).toBe('REF-ARCH-711-ALPHA');

    // Referral Controller #2 validation
    const ref2 = DEFAULT_TENANTS.find((t) => t.handle === 'HUMAN_REFERRAL_02');
    expect(ref2).toBeDefined();
    expect(ref2?.clearance).toBe('HUMAN_REFERRAL_CONTROLLER');
    expect(ref2?.controllerType).toBe('HUMAN_REFERRAL');
    expect(ref2?.referralBy).toBe('VASHON_ARCH');
    expect(ref2?.referralCode).toBe('REF-ARCH-711-BETA');
  });

  it('restricts knight switching by default unless an Avatar Weaver cartridge is active', () => {
    const arch = DEFAULT_TENANTS.find((t) => t.handle === 'VASHON_ARCH')!;
    const rootKernelCartridge = arch.configuration?.cartridges.find(
      (c) => c.id === 'cart-arch-kernel',
    );
    expect(rootKernelCartridge?.allowKnightSwitch).toBe(false);

    const weaverCartridge = arch.configuration?.cartridges.find(
      (c) => c.id === 'cart-avatar-weaver',
    );
    expect(weaverCartridge?.allowKnightSwitch).toBe(true);
    expect(weaverCartridge?.switchableKnights).toContain('vashon-arch');
    expect(weaverCartridge?.switchableKnights).toContain('referral-human-01');
    expect(weaverCartridge?.switchableKnights).toContain('referral-human-02');
  });

  it('isolates cartridge deck definitions per sovereign human tenant profile', () => {
    const archCartridgeIds = DEFAULT_TENANTS.find(
      (t) => t.handle === 'VASHON_ARCH',
    )?.configuration?.cartridges.map((c) => c.id);
    const ref1CartridgeIds = DEFAULT_TENANTS.find(
      (t) => t.handle === 'HUMAN_REFERRAL_01',
    )?.configuration?.cartridges.map((c) => c.id);
    const ref2CartridgeIds = DEFAULT_TENANTS.find(
      (t) => t.handle === 'HUMAN_REFERRAL_02',
    )?.configuration?.cartridges.map((c) => c.id);

    expect(archCartridgeIds).toContain('cart-arch-kernel');
    expect(archCartridgeIds).toContain('cart-referral-gateway');
    expect(archCartridgeIds).toContain('cart-avatar-weaver');

    expect(ref1CartridgeIds).toContain('cart-human-workspace');
    expect(ref1CartridgeIds).toContain('cart-referral-vault');

    expect(ref2CartridgeIds).toContain('cart-factory-workspace');
    expect(ref2CartridgeIds).toContain('cart-human-telemetry');

    // No leakage across tenant cartridges
    expect(ref1CartridgeIds).not.toContain('cart-avatar-weaver');
    expect(ref2CartridgeIds).not.toContain('cart-referral-gateway');
  });
});
