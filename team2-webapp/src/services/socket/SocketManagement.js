import { io } from 'socket.io-client';
import { debugLogger, DEBUG_LEVELS } from '../../utils/debug';

const COMPONENT = 'SocketManagement';

class SocketManagement {
  constructor(onUpdate) {
    this.socket = null;
    this.onUpdate = onUpdate;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.isConnected = false;

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Socket management instance created', {
      maxRetries: this.maxRetries
    });
  }

  setupSocket() {
    if (this.socket) {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Disconnecting existing socket');
      this.socket.disconnect();
    }

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Setting up WebSocket connection');

    this.socket = io('http://localhost:3002', {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.handleConnect();
    });

    this.socket.on('connect_error', (error) => {
      this.handleConnectError(error);
    });

    this.socket.on('fileUpdated', async (data) => {
      await this.handleFileUpdate(data);
    });

    this.socket.on('disconnect', () => {
      this.handleDisconnect();
    });
  }

  handleConnect() {
    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Connected to WebSocket server', {
      socketId: this.socket.id
    });
    this.retryCount = 0;
    this.isConnected = true;
    
    // Notify of connection
    if (this.onUpdate) {
      this.onUpdate('connection', { status: 'connected' });
    }
  }

  handleConnectError(error) {
    this.retryCount++;
    this.isConnected = false;
    
    debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Socket connection error', {
      error: error.message,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    });
    
    if (this.retryCount >= this.maxRetries) {
      debugLogger.log(DEBUG_LEVELS.ERROR, COMPONENT, 'Max reconnection attempts reached');
      this.socket.disconnect();
      
      // Notify of connection failure
      if (this.onUpdate) {
        this.onUpdate('connection', { 
          status: 'error',
          error: 'Max reconnection attempts reached'
        });
      }
    }
  }

  async handleFileUpdate(data) {
    const updateId = `file-update-${Date.now()}`;
    debugLogger.startTimer(updateId);

    debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'File update received', data);
    
    if (this.onUpdate) {
      await this.onUpdate('fileUpdate', data);
    }

    debugLogger.endTimer(updateId, COMPONENT);
  }

  handleDisconnect() {
    this.isConnected = false;
    debugLogger.log(DEBUG_LEVELS.WARN, COMPONENT, 'Disconnected from WebSocket server');
    
    // Notify of disconnection
    if (this.onUpdate) {
      this.onUpdate('connection', { status: 'disconnected' });
    }
  }

  isSocketConnected() {
    return this.isConnected;
  }

  disconnect() {
    if (this.socket) {
      debugLogger.log(DEBUG_LEVELS.INFO, COMPONENT, 'Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.retryCount = 0;
    }
  }
}

export default SocketManagement;
