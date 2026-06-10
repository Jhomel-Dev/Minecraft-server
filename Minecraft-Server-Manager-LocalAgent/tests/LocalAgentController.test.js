const LocalAgentController = require('../src/controllers/LocalAgentController');
const DockerService = require('../src/services/DockerService');
const TunnelService = require('../src/services/TunnelService');
const ConnectionService = require('../src/services/ConnectionService');

jest.mock('../src/services/DockerService');
jest.mock('../src/services/TunnelService');
jest.mock('../src/services/ConnectionService');

describe('LocalAgentController', () => {
  let controller;
  let mockConfig;

  beforeEach(() => {
    mockConfig = { apiUrl: 'http://test', agentToken: 'token123' };
    controller = new LocalAgentController(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('constructor validates config', () => {
    expect(() => new LocalAgentController()).toThrow('Controller configuration is required');
  });

  test('start initiates connection', () => {
    controller.start();
    const connectionInstance = ConnectionService.mock.instances[0];
    expect(connectionInstance.connect).toHaveBeenCalled();
  });

  test('handleStartCommand starts docker and tunnel', async () => {
    const serverConfig = { name: 'test', port: 25565, dataDir: '/tmp', tunnelSecret: 'secret' };
    await controller.handleStartCommand(serverConfig);
    
    const dockerInstance = DockerService.mock.instances[0];
    const tunnelInstance = TunnelService.mock.instances[0];
    
    expect(dockerInstance.startMinecraftServer).toHaveBeenCalledWith(serverConfig);
    expect(tunnelInstance.startTunnel).toHaveBeenCalledWith('secret');
  });

  test('tunnel address_assigned sends info via connection', () => {
    const tunnelInstance = TunnelService.mock.instances[0];
    const connectionInstance = ConnectionService.mock.instances[0];
    
    // Simulate tunnel event
    const eventHandler = tunnelInstance.on.mock.calls.find(call => call[0] === 'address_assigned')[1];
    eventHandler('tunnel.playit.gg:12345');
    
    expect(connectionInstance.sendTunnelInfo).toHaveBeenCalledWith({ address: 'tunnel.playit.gg:12345' });
  });
});
