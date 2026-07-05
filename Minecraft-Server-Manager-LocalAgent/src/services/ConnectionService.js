import { io } from 'socket.io-client';
import EventEmitter from 'events';

export default class ConnectionService extends EventEmitter {
  constructor(apiUrl, agentToken) {
    super();
    this.apiUrl = apiUrl;
    this.agentToken = agentToken;
    this.socket = null;
  }

  connect() {
    this.validateCredentials();
    
    this.socket = io(this.apiUrl, {
      auth: { token: this.agentToken }
    });

    this.attachSocketListeners();
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
  }

  validateCredentials() {
    if (!this.apiUrl) throw new Error('API URL is required');
    if (!this.agentToken) throw new Error('Agent Token is required');
  }

  attachSocketListeners() {
    this.socket.on('connect', () => this.emit('connected'));
    this.socket.on('disconnect', () => this.emit('disconnected'));
    this.socket.on('connect_error', (err) => this.emit('error', err));
    
    this.socket.on('START_SERVER', (config) => this.emit('command_start', config));
    this.socket.on('STOP_SERVER', (payload) => this.emit('command_stop', payload));
    this.socket.on('DELETE_SERVER', (payload) => this.emit('delete_server', payload));
    this.socket.on('SEND_COMMAND', (cmd) => this.emit('server_command', cmd));
    
    this.socket.on('FS_OPERATION', (payload, callback) => {
      this.emit('fs_operation', payload, callback);
    });
    
    this.socket.on('get_player_stats', (payload, callback) => {
      this.emit('get_player_stats', payload, callback);
    });
    
    this.socket.on('list_backups', (payload, callback) => {
      this.emit('list_backups', payload, callback);
    });
    
    this.socket.on('create_backup', (payload, callback) => {
      this.emit('create_backup', payload, callback);
    });
    
    this.socket.on('delete_backup', (payload, callback) => {
      this.emit('delete_backup', payload, callback);
    });
  }

  sendTelemetry(stats) {
    if (!this.verifyConnection()) return;
    this.socket.emit('TELEMETRY_UPDATE', stats);
  }

  sendLog(logLine) {
    if (!this.verifyConnection()) return;
    this.socket.emit('SERVER_LOG', logLine);
  }

  sendTunnelInfo(info) {
    if (!this.verifyConnection()) return;
    this.socket.emit('TUNNEL_INFO', info);
  }

  sendStateUpdate(payload) {
    if (!this.verifyConnection()) return;
    this.socket.emit('STATUS_UPDATE', payload);
  }

  verifyConnection() {
    return this.socket && this.socket.connected;
  }
}
