import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import LocalAgentController from '../src/controllers/LocalAgentController.js';
import DockerService from '../src/services/DockerService.js';
import TunnelService from '../src/services/TunnelService.js';
import ConnectionService from '../src/services/ConnectionService.js';

vi.mock('../src/services/DockerService.js');
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

  test('handleStartCommand starts docker and tunnel', async () => {
    const serverConfig = { name: 'test', port: 25565, dataDir: '/tmp', tunnelSecret: 'secret' };
    await controller.handleStartCommand(serverConfig);
    
    const dockerInstance = vi.mocked(DockerService).mock.instances[0];
    const tunnelInstance = vi.mocked(TunnelService).mock.instances[0];
    
    expect(dockerInstance.startMinecraftServer).toHaveBeenCalledWith(serverConfig);
    expect(tunnelInstance.startTunnel).toHaveBeenCalledWith('secret');
  });

  test('tunnel address_assigned sends info via connection', () => {
    const tunnelInstance = vi.mocked(TunnelService).mock.instances[0];
    const connectionInstance = vi.mocked(ConnectionService).mock.instances[0];
    
    // Simulate tunnel event
    const eventHandler = tunnelInstance.on.mock.calls.find(call => call[0] === 'address_assigned')[1];
    eventHandler('tunnel.playit.gg:12345');
    
    expect(connectionInstance.sendTunnelInfo).toHaveBeenCalledWith({ address: 'tunnel.playit.gg:12345' });
  });
});
