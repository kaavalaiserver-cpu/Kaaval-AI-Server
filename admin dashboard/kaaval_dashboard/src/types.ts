// ─── Violation ───
export interface ViolationItem {
  id: string;
  timestamp: string;
  type: string;
  vehicle_type: string;
  vehicle_number: string;
  location: string;
  camera_id: string;
  violation_confidence: number;
  plate_confidence: number;
  cam_clarity: number;
  confidence: number;
  status: string;
  raw_status: string;
  image_url: string;
  proof_img_url: string;
  gps_lat: number | null;
  gps_lng: number | null;
  challan_amount: number | null;
  challan_issued_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  metadata: Record<string, unknown> | null;
  speed?: number | null;
}

export interface ViolationStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  manual_review: number;
  by_type: Record<string, number>;
}

export interface FastAPIAnalyticsSummary {
  total_violations: number;
  violations_today: number;
  pending_review: number;
  challans_issued: number;
  daily_last_30: Array<{ date: string; count: number }>;
  top_cameras: Array<{ camera_id: string; count: number }>;
  top_vehicles: Array<{ vehicle_number: string; count: number }>;
  by_type: Array<{ violation_type: string; count: number }>;
}

export interface PaginatedViolations {
  data: ViolationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PeakHoursData {
  hour: number;
  count: number;
}

export interface CameraEfficiencyData {
  camera_id: string;
  total_violations: number;
  challans_issued: number;
  rejected_count: number;
  efficiency_rate: string;
}

export interface HeatmapData {
  lat: number;
  lng: number;
  type: string;
  weight: number;
}

// ─── Camera ───
export interface CameraItem {
  id: string;
  cameraId?: string;
  camera_id?: string;
  location: string;
  status: string;
  streamUrl?: string | null;
  lastActive?: string | null;
  last_active?: string | null;
  violationCount?: number;
  violation_count?: number;
  ai_enabled?: boolean;
  gps_lat?: number | null;
  gps_lng?: number | null;
}

export interface CameraStatus {
  total: number;
  online: number;
  offline: number;
  cameras: CameraItem[];
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  designation: string | null;
  role: string;
  subdivision: string | null;
  phoneNumber: string | null;
  email: string | null;
  isActive: boolean;
  requiresPasswordChange: boolean;
  lastLogin: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Analytics ───
export interface AnalyticsSummary {
  totalViolations: number;
  camerasActive: number;
  helmetComplianceRate: number;
  violationsByDay: Array<{ date: string; count: number }>;
  violationsByCamera: Array<{ camera_id: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
}

export interface DevAnalytics {
  twoWheelerCount: number;
  fourWheelerCount: number;
  plateExtractionCount: number;
  plateExtractionRate: number;
  ocrSuccessCount: number;
  ocrFailCount: number;
  avgConfidence: number;
  pipelineStatus: string;
  cameraFeedCount: number;
  batchUploadCount: number;
  confidenceDistribution: Array<{ bucket: string; count: number }>;
}

// ─── System ───
export interface SystemStatus {
  camerasOnline: number;
  camerasOffline: number;
  uptime: string;
  aiPipelineStatus: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

// ─── Notifications ───
export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

// ─── Search ───
export interface SearchResult {
  query: string;
  count: number;
  results: Array<{
    id: string;
    vehicle_number: string | null;
    violation_type: string;
    camera_id: string | null;
    status: string;
    confidence: number;
    timestamp: string;
    image_url: string | null;
  }>;
}
