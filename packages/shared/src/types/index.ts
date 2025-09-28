// Auth types
export interface User {
  id: string;
  email: string;
  verified: boolean;
  createdAt: Date;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  jwt: string;
  refresh: string;
  user: User;
}

// Server types
export interface Server {
  id: string;
  region: string;
  ip: string;
  capacity: number;
  weight: number;
  status: 'online' | 'offline' | 'maintenance';
  pingEstimate?: number;
  load?: number;
}

// Session types
export interface Session {
  id: string;
  userId: string;
  serverId: string;
  nodeId: string;
  game: string;
  startAt: Date;
  endAt?: Date;
  metricsJson?: string;
}

export interface StartSessionRequest {
  gameId: string;
  serverId?: string;
  mode: 'auto' | 'manual';
}

export interface StartSessionResponse {
  sessionId: string;
  assignedNode: Server;
}

// Metrics types
export interface NetworkMetrics {
  ping: number;
  jitter: number;
  packetLoss: number;
  timestamp: Date;
}

export interface SessionMetrics {
  sessionId: string;
  metrics: NetworkMetrics[];
  avgPing: number;
  avgJitter: number;
  totalPacketLoss: number;
}

// Game types
export interface Game {
  gameId: string;
  name: string;
  processKeywords: string[];
  defaultPorts: number[];
  icon?: string;
}

// Subscription types
export interface Subscription {
  id: string;
  userId: string;
  plan: 'trial' | 'monthly' | 'quarterly' | 'annual';
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  stripeId: string;
  expiresAt: Date;
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket events
export interface WSEvent {
  type: string;
  payload: any;
}

export interface MetricsUpdate extends WSEvent {
  type: 'metrics_update';
  payload: NetworkMetrics;
}

export interface SessionStatusUpdate extends WSEvent {
  type: 'session_status';
  payload: {
    sessionId: string;
    status: 'connected' | 'disconnected' | 'error';
  };
}

// Configuration types
export interface ClientConfig {
  multiInternet: boolean;
  customDNS?: string[];
  ipBlocking: string[];
  autoServerSwitch: boolean;
  packetLossTolerance: number;
}

// Node server types
export interface NodeInfo {
  id: string;
  region: string;
  ip: string;
  port: number;
  load: number;
  connections: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastHeartbeat: Date;
}

export interface TunnelPacket {
  sessionId: string;
  sourceIp: string;
  sourcePort: number;
  destIp: string;
  destPort: number;
  protocol: 'tcp' | 'udp';
  data: Buffer;
  timestamp: number;
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  activeSessions: number;
  nodeStatus: NodeInfo[];
  systemLoad: number;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  userEmail: string;
  gameId: string;
  nodeId: string;
  startTime: Date;
  duration: number;
  avgPing: number;
  status: 'active' | 'ended';
}