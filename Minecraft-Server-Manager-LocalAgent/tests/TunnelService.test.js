import { describe, test, expect, beforeEach, vi } from 'vitest';
import TunnelService from '../src/services/TunnelService.js';

describe('TunnelService', () => {
  let service;

  beforeEach(() => {
    service = new TunnelService();
  });

  test('verifyNotRunning throws if already running', () => {
    service.playitProcess = {};
    expect(() => service.verifyNotRunning()).toThrow('Tunnel is already running');
  });

  test('buildArgs includes secret if provided', () => {
    const args = service.buildArgs('my-secret');
    expect(args).toContain('--secret');
    expect(args).toContain('my-secret');
  });

  test('checkForClaimLink emits claim_link event', () => {
    return new Promise((resolve) => {
      service.on('claim_link', (link) => {
        expect(link).toBe('https://playit.gg/claim/1234abc');
        resolve();
      });
      service.checkForClaimLink('Please visit https://playit.gg/claim/1234abc to claim');
    });
  });

  test('checkForAssignedAddress emits address_assigned event', () => {
    return new Promise((resolve) => {
      service.on('address_assigned', (address) => {
        expect(address).toBe('tunnel.playit.gg:12345');
        resolve();
      });
      service.checkForAssignedAddress('Tunnel address: tunnel.playit.gg:12345');
    });
  });
});
