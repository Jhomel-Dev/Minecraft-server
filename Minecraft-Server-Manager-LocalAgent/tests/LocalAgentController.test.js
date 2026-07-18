import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import LocalAgentController from '../src/controllers/LocalAgentController.js';
import NativeServerService from '../src/services/NativeServerService.js';
import TunnelService from '../src/services/TunnelService.js';
import ConnectionService from '../src/services/ConnectionService.js';

vi.mock('../src/services/NativeServerService.js');
vi.mock('../src/services/TunnelService.js');
vi.mock('../src/services/ConnectionService.js');

describe('LocalAgentController', () => {
  let controller;
  let mockConfig;

  beforeEach(() => {
    mockConfig = { apiUrl: 'http://test', agentToken: 'token123' };
    controller = new LocalAgentController(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('constructor validates config', () => {
    expect(() => new LocalAgentController()).toThrow('Controller configuration is required');
  });

  test('start initiates connection', () => {
    controller.start();
    const connectionInstance = vi.mocked(ConnectionService).mock.instances[0];
    expect(connectionInstance.connect).toHaveBeenCalled();
  });

});
