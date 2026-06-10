import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../src/config/prisma.js';
import ServerService from '../src/services/ServerService.js';

vi.mock('../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn()
    },
    server: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

describe('ServerService', () => {
  let serverService;
  let mockIo;

  beforeEach(() => {
    mockIo = { emit: vi.fn() };
    serverService = new ServerService(mockIo);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('createServer throws if missing inputs', async () => {
    await expect(serverService.createServer('', 'MyServer')).rejects.toThrow('User ID is required');
    await expect(serverService.createServer('user1', '')).rejects.toThrow('Server name is required');
  });

  test('createServer throws if user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(serverService.createServer('user1', 'MyServer')).rejects.toThrow('User not found');
  });

  test('createServer saves server to db with defaults', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user1' });
    prisma.server.create.mockResolvedValue({ id: 'server1', name: 'MyServer' });

    const result = await serverService.createServer('user1', 'MyServer');

    expect(prisma.server.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        name: 'MyServer',
        type: 'VANILLA',
        version: 'LATEST',
        memory: '2G',
        status: 'OFFLINE'
      }
    });
    expect(result.id).toBe('server1');
  });

  test('startServer throws if server not found', async () => {
    prisma.server.findUnique.mockResolvedValue(null);
    await expect(serverService.startServer('badId')).rejects.toThrow('Server not found');
  });

  test('startServer throws if server is not offline', async () => {
    prisma.server.findUnique.mockResolvedValue({ id: 'server1', status: 'STARTING' });
    await expect(serverService.startServer('server1')).rejects.toThrow('Server is already running or starting');
  });

  test('startServer updates status and emits event to agent', async () => {
    const mockServer = { 
      id: 'server1', 
      name: 'Test', 
      type: 'PAPER', 
      version: '1.20', 
      memory: '4G', 
      port: 25565, 
      status: 'OFFLINE',
      tunnelSecret: 'secret'
    };
    prisma.server.findUnique.mockResolvedValue(mockServer);
    prisma.server.update.mockResolvedValue({ ...mockServer, status: 'STARTING' });

    await serverService.startServer('server1');

    expect(prisma.server.update).toHaveBeenCalledWith({
      where: { id: 'server1' },
      data: { status: 'STARTING' }
    });

    expect(mockIo.emit).toHaveBeenCalledWith('START_SERVER', {
      id: 'server1',
      name: 'Test',
      type: 'PAPER',
      version: '1.20',
      memory: '4G',
      port: 25565,
      dataDir: './servers/server1',
      tunnelSecret: 'secret'
    });
  });

  test('stopServer updates status and emits stop event', async () => {
    const mockServer = { id: 'server1', status: 'ONLINE' };
    prisma.server.findUnique.mockResolvedValue(mockServer);
    
    await serverService.stopServer('server1');
    
    expect(prisma.server.update).toHaveBeenCalledWith({
      where: { id: 'server1' },
      data: { status: 'STOPPING' }
    });
    
    expect(mockIo.emit).toHaveBeenCalledWith('STOP_SERVER', { id: 'server1' });
  });
});
