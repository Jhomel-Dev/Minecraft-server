const ConnectionService = require('../src/services/ConnectionService');
const { io } = require('socket.io-client');

jest.mock('socket.io-client');

describe('ConnectionService', () => {
  let service;
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true
    };
    io.mockReturnValue(mockSocket);
    service = new ConnectionService('http://localhost:3000', 'secret-token');
  });

  test('validateCredentials throws if missing url or token', () => {
    const invalidService = new ConnectionService();
    expect(() => invalidService.validateCredentials()).toThrow('API URL is required');
    
    const partialService = new ConnectionService('http://url');
    expect(() => partialService.validateCredentials()).toThrow('Agent Token is required');
  });

  test('connect establishes connection with correct auth', () => {
    service.connect();
    expect(io).toHaveBeenCalledWith('http://localhost:3000', {
      auth: { token: 'secret-token' }
    });
    expect(mockSocket.on).toHaveBeenCalledWith('START_SERVER', expect.any(Function));
  });

  test('sendTelemetry throws if not connected', () => {
    expect(() => service.sendTelemetry({})).toThrow('Socket is not connected');
  });

  test('sendTelemetry emits event when connected', () => {
    service.connect();
    service.sendTelemetry({ cpu: 50 });
    expect(mockSocket.emit).toHaveBeenCalledWith('TELEMETRY_UPDATE', { cpu: 50 });
  });
});
