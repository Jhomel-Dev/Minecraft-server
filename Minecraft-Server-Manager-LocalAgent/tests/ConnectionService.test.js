import { describe, test, expect, beforeEach, vi } from 'vitest';
import ConnectionService from '../src/services/ConnectionService.js';
import { io } from 'socket.io-client';

vi.mock('socket.io-client');

describe('ConnectionService', () => {
  let service;
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
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
