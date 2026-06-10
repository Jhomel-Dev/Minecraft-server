import { describe, test, expect, beforeEach, vi } from 'vitest';
import DockerService from '../src/services/DockerService.js';

vi.mock('dockerode');

describe('DockerService', () => {
  let service;

  beforeEach(() => {
    service = new DockerService();
  });

  test('validateConfig throws if no config provided', () => {
    expect(() => service.validateConfig()).toThrow('Missing server configuration');
  });

  test('validateConfig throws if no name provided', () => {
    expect(() => service.validateConfig({ port: 25565, dataDir: '/tmp' })).toThrow('Missing server name');
  });

  test('buildContainerOptions creates correct structure', () => {
    const config = { name: 'test', port: 25565, dataDir: '/data/test' };
    const options = service.buildContainerOptions(config);
    expect(options.name).toBe('minecraft-test');
    expect(options.HostConfig.PortBindings['25565/tcp'][0].HostPort).toBe('25565');
  });
});
