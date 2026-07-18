import { describe, test, expect, beforeEach, vi } from 'vitest';
import TunnelService from '../src/services/TunnelService.js';
import * as child_process from 'child_process';
import os from 'os';

vi.mock('child_process');

describe('TunnelService', () => {
  let service;

  beforeEach(() => {
    service = new TunnelService();
  });

  test('isRunning returns false initially', () => {
    expect(service.isRunning()).toBe(false);
  });

  test('buildBoreArgs includes secret if provided', () => {
    const args = service.buildBoreArgs('my-secret', 25565);
    expect(args).toContain('--secret');
    expect(args).toContain('my-secret');
    expect(args).toContain('25565');
  });

  test('buildBoreArgs excludes secret if null', () => {
    const args = service.buildBoreArgs(null, 25565);
    expect(args).not.toContain('--secret');
  });

  test('handleBoreOutput parses connection address', () => {
    let assignedAddress = null;
    service.on('address_assigned', (address) => assignedAddress = address);
    
    service.handleBoreOutput('listening at bore.pub:45678');
    
    expect(assignedAddress).toBe('bore.pub:45678');
  });
});
