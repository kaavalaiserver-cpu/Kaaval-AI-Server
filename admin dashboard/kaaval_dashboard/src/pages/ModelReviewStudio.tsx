import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Camera,
  MapPin,
  Clock,
  Sparkles,
  PhoneCall,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Send,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react';
import './ModelReviewStudio.css';

interface QueueItem {
  id: string;
  imageUrl: string | null;
  violationType: string;
  violationCode: string;
  confidence: number;
  vehicleNumber: string;
  cameraCode: string;
  cameraName: string;
  junctionName: string;
  subdivisionName: string;
  timestamp: string;
}

interface TodayStats {
  pendingImages: number;
  reviewedToday: number;
  ocrCorrectionsNeeded: number;
  modelFailuresFlagged: number;
  progressPercent: number;
  targetDaily: number;
}

const HELMET_REASONS = [
  'Helmet present but model missed it (FP)',
  'No helmet, but model reported helmet present (FN)',
  "Rider's head is occluded",
  'Head is too small in the image',
  'Helmet confused with hair or background',
  'Poor lighting / severe shadows',
  'Motion blur on head region',
  'Incorrect vehicle association',
  'Image is not suitable for review',
  'Other classification error',
];

const TRIPLE_RIDING_REASONS = [
  'Three or more occupants correctly detected',
  'Only one occupant',
  'Only two occupants',
  'Occupants incorrectly counted',
  'Occlusion prevents reliable counting',
  'Occupants from adjacent vehicles confused',
  'Vehicle is not a motorcycle/two-wheeler',
  'Image quality insufficient',
  'Other counting error',
];

const GENERAL_REASONS = [
  'False positive detection',
  'False negative prediction',
  'Vehicle type confused',
  'Wrong bounding box crop',
  'Image clarity insufficient',
  'Other',
];

const OCR_UNREADABLE_REASONS = [
  'Motion blur',
  'Poor image quality',
  'Low-light image',
  'Glare or overexposure',
  'Plate partially obstructed',
  'Plate too small',
  'Plate outside the frame',
  'Non-standard plate font/style',
  'Other unreadable cause',
];

export default function ModelReviewStudio() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState<TodayStats>({
    pendingImages: 0,
    reviewedToday: 0,
    ocrCorrectionsNeeded: 0,
    modelFailuresFlagged: 0,
    progressPercent: 0,
    targetDaily: 250,
  });

  // Current Item Form State
  const [ocrStatus, setOcrStatus] = useState<'CORRECT' | 'INCORRECT' | 'UNREADABLE'>('CORRECT');
  const [correctedPlate, setCorrectedPlate] = useState('');
  const [ocrReason, setOcrReason] = useState('');

  const [violationVerdict, setViolationVerdict] = useState<'CORRECT' | 'INCORRECT' | 'CANNOT_DETERMINE'>('CORRECT');
  const [failureReason, setFailureReason] = useState('');

  const [imageQuality, setImageQuality] = useState<'USABLE' | 'LOW_QUALITY' | 'UNUSABLE'>('USABLE');
  const [lighting, setLighting] = useState<'DAYLIGHT' | 'LOW_LIGHT' | 'NIGHT' | 'OVEREXPOSED'>('DAYLIGHT');
  const [phoneTag, setPhoneTag] = useState<'NONE' | 'CONFIRMED' | 'POSSIBLE'>('NONE');

  // Zoom
  const [isZoomed, setIsZoomed] = useState(false);

  // Speed timer
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const plateInputRef = useRef<HTMLInputElement>(null);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.round(((Date.now() - startTime) / 1000) * 10) / 10);
    }, 100);
    return () => clearInterval(timer);
  }, [startTime]);

  // Fetch initial queue and stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/model-evaluations/stats/today`);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch stats', e);
    }
  }, []);

  const fetchMoreQueue = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/model-evaluations/queue?limit=10`);
      if (res.data && res.data.length > 0) {
        setQueue(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = res.data.filter((d: QueueItem) => !existingIds.has(d.id));
          return [...prev, ...newItems];
        });
      }
    } catch (e) {
      console.error('Failed to fetch queue', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMoreQueue();
  }, [fetchStats, fetchMoreQueue]);

  const currentItem = queue[currentIndex] || null;

  // Reset form when item changes
  const resetFormForNextItem = useCallback((item: QueueItem | null) => {
    setOcrStatus('CORRECT');
    setCorrectedPlate(item ? item.vehicleNumber : '');
    setOcrReason('');
    setViolationVerdict('CORRECT');
    setFailureReason('');
    setImageQuality('USABLE');
    setLighting('DAYLIGHT');
    setPhoneTag('NONE');
    setIsZoomed(false);
    setStartTime(Date.now());
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    if (currentItem) {
      resetFormForNextItem(currentItem);
    }
  }, [currentIndex, currentItem, resetFormForNextItem]);

  // Submit and Advance immediately (Sub-10s requirement)
  const handleSubmitAndNext = useCallback(async () => {
    if (!currentItem || submitting) return;
    setSubmitting(true);

    const duration = Math.round(((Date.now() - startTime) / 1000) * 10) / 10;

    const payload = {
      violationId: currentItem.id,
      modelName: 'Kaaval AI Core v1.4',
      originalOcrPrediction: currentItem.vehicleNumber,
      ocrStatus,
      correctedOcrValue: ocrStatus === 'INCORRECT' ? correctedPlate.trim().toUpperCase() : undefined,
      ocrUnreadableReason: ocrStatus === 'UNREADABLE' ? ocrReason : undefined,
      predictedViolation: currentItem.violationType,
      violationVerdict,
      failureReason: violationVerdict === 'INCORRECT' ? failureReason : undefined,
      imageQuality,
      lightingCondition: lighting,
      phoneWhileDriving: phoneTag,
      reviewDurationSeconds: duration,
    };

    // Advance UI instantly
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);
    if (queue[nextIdx]) {
      resetFormForNextItem(queue[nextIdx]);
    }

    // Update local stats optimistically
    setStats(prev => ({
      ...prev,
      reviewedToday: prev.reviewedToday + 1,
      ocrCorrectionsNeeded: prev.ocrCorrectionsNeeded + (ocrStatus === 'INCORRECT' ? 1 : 0),
      modelFailuresFlagged: prev.modelFailuresFlagged + (violationVerdict === 'INCORRECT' ? 1 : 0),
      progressPercent: Math.min(100, Math.round(((prev.reviewedToday + 1) / prev.targetDaily) * 100)),
      pendingImages: Math.max(0, prev.pendingImages - 1),
    }));

    // Submit async
    try {
      await axios.post(`${API_BASE}/model-evaluations/submit`, payload);
      // If buffer is running low, fetch more
      if (queue.length - nextIdx <= 3) {
        fetchMoreQueue();
      }
    } catch (err) {
      console.error('Failed to submit evaluation', err);
    } finally {
      setSubmitting(false);
    }
  }, [
    currentItem,
    submitting,
    startTime,
    ocrStatus,
    correctedPlate,
    ocrReason,
    violationVerdict,
    failureReason,
    imageQuality,
    lighting,
    phoneTag,
    currentIndex,
    queue,
    resetFormForNextItem,
    fetchMoreQueue,
  ]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If actively typing inside plate input, only Enter submits
      const isInputActive = document.activeElement === plateInputRef.current;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmitAndNext();
        return;
      }

      if (isInputActive) return; // Do not trigger letter shortcuts while typing text

      if (e.key === '1') {
        e.preventDefault();
        setOcrStatus('CORRECT');
      } else if (e.key === '2') {
        e.preventDefault();
        setOcrStatus('INCORRECT');
        setTimeout(() => plateInputRef.current?.focus(), 50);
      } else if (e.key === '3') {
        e.preventDefault();
        setOcrStatus('UNREADABLE');
        if (!ocrReason) setOcrReason(OCR_UNREADABLE_REASONS[0]);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setViolationVerdict('CORRECT');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setViolationVerdict('INCORRECT');
        if (!failureReason) {
          const reasons = currentItem?.violationCode.includes('TRIPLE')
            ? TRIPLE_RIDING_REASONS
            : HELMET_REASONS;
          setFailureReason(reasons[0]);
        }
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        setViolationVerdict('CANNOT_DETERMINE');
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPhoneTag(prev => (prev === 'NONE' ? 'CONFIRMED' : prev === 'CONFIRMED' ? 'POSSIBLE' : 'NONE'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmitAndNext, ocrReason, failureReason, currentItem]);

  const activeReasons = currentItem?.violationCode.includes('TRIPLE')
    ? TRIPLE_RIDING_REASONS
    : currentItem?.violationCode.includes('HELMET')
    ? HELMET_REASONS
    : GENERAL_REASONS;

  return (
    <div className="review-studio-container">
      {/* Top Header */}
      <header className="review-studio-header">
        <div className="review-studio-title">
          <h1>
            <span>KAAVAL AI</span>
            <span style={{ color: '#38bdf8' }}>MODEL REVIEW STUDIO</span>
          </h1>
          <span className="review-studio-badge">V1.4 ACTIVE</span>
          <div className="reviewer-pill">
            REVIEWER: <strong>{user?.name || user?.username || 'INTERN'}</strong>
          </div>
        </div>

        {/* Real-Time Productivity Badges */}
        <div className="review-stats-strip">
          <div className="stat-chip highlight">
            <Check size={14} />
            <span>Reviewed: {stats.reviewedToday} / {stats.targetDaily}</span>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${stats.progressPercent}%` }}></div>
            </div>
          </div>

          <div className="stat-chip warning">
            <XCircle size={14} />
            <span>Model Flags: {stats.modelFailuresFlagged}</span>
          </div>

          <div className="stat-chip">
            <Sparkles size={14} color="#f59e0b" />
            <span>OCR Edits: {stats.ocrCorrectionsNeeded}</span>
          </div>

          <div className="stat-chip">
            <Zap size={14} color="#10b981" />
            <span>Speed: <strong>{elapsedSeconds}s</strong></span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      {loading ? (
        <div className="empty-queue-view">
          <Clock size={40} className="animate-spin" />
          <p>Loading assigned review queue...</p>
        </div>
      ) : !currentItem ? (
        <div className="empty-queue-view">
          <div className="empty-queue-icon">
            <CheckCircle2 size={36} />
          </div>
          <h2>Great job! Today&apos;s Review Queue is Clear.</h2>
          <p>You have reviewed all assigned pending images for model evaluation.</p>
          <button className="canvas-btn" onClick={() => fetchMoreQueue()}>
            <RotateCcw size={14} /> Check For New Images
          </button>
        </div>
      ) : (
        <div className="review-workspace">
          {/* Left Pane: Large Violation Image Canvas */}
          <div className="image-canvas-pane">
            <img
              src={currentItem.imageUrl || '/placeholder-violation.jpg'}
              alt="Violation frame"
              className={`main-review-image ${isZoomed ? 'zoomed' : ''}`}
              onClick={() => setIsZoomed(!isZoomed)}
            />

            {/* Overlays */}
            <div className="image-overlay-tags">
              <span className="overlay-chip">
                <Camera size={13} color="#38bdf8" />
                <strong>{currentItem.cameraCode}</strong> — {currentItem.cameraName}
              </span>
              <span className="overlay-chip">
                <MapPin size={13} color="#10b981" />
                {currentItem.junctionName} ({currentItem.subdivisionName})
              </span>
              <span className="overlay-chip">
                <Clock size={13} color="#f59e0b" />
                {new Date(currentItem.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </span>
            </div>

            {/* Canvas Zoom Controls */}
            <div className="image-canvas-controls">
              <button className="canvas-btn" onClick={() => setIsZoomed(!isZoomed)}>
                {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                {isZoomed ? 'Reset Zoom' : 'Zoom 1.6x'}
              </button>
              <button
                className="canvas-btn"
                onClick={() => window.open(currentItem.imageUrl || '', '_blank')}
              >
                Full Resolution
              </button>
            </div>
          </div>

          {/* Right Pane: Compact Sub-10s Decision Panel */}
          <aside className="decision-panel">
            {/* 1. Detected Violation */}
            <div className="decision-box">
              <div className="box-title">
                <span>Model Detected Violation</span>
                <span className="key-badge">SYSTEM PREDICTION</span>
              </div>
              <div className="pred-row">
                <span className="pred-badge">{currentItem.violationType}</span>
                <div className="confidence-indicator">
                  <Sparkles size={14} />
                  <span>{currentItem.confidence}% Conf.</span>
                </div>
              </div>
            </div>

            {/* 2. OCR Number Plate Verification */}
            <div className="decision-box highlight">
              <div className="box-title">
                <span>OCR Plate Verification</span>
                <span className="key-badge">KEYS: 1 | 2 | 3</span>
              </div>

              {ocrStatus === 'INCORRECT' ? (
                <div className="inline-edit-wrap">
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Model predicted: {currentItem.vehicleNumber}</span>
                  <input
                    ref={plateInputRef}
                    type="text"
                    value={correctedPlate}
                    onChange={e => setCorrectedPlate(e.target.value.toUpperCase())}
                    placeholder="Enter correct registration number..."
                    className="inline-plate-input"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="plate-preview-box">
                  {currentItem.vehicleNumber}
                </div>
              )}

              <div className="btn-group-row">
                <button
                  type="button"
                  className={`decision-btn ${ocrStatus === 'CORRECT' ? 'active green' : ''}`}
                  onClick={() => setOcrStatus('CORRECT')}
                >
                  <Check size={16} />
                  <span>OCR Correct</span>
                  <span className="shortcut">[ 1 ]</span>
                </button>

                <button
                  type="button"
                  className={`decision-btn ${ocrStatus === 'INCORRECT' ? 'active red' : ''}`}
                  onClick={() => {
                    setOcrStatus('INCORRECT');
                    setTimeout(() => plateInputRef.current?.focus(), 50);
                  }}
                >
                  <XCircle size={16} />
                  <span>OCR Edit</span>
                  <span className="shortcut">[ 2 ]</span>
                </button>

                <button
                  type="button"
                  className={`decision-btn ${ocrStatus === 'UNREADABLE' ? 'active amber' : ''}`}
                  onClick={() => {
                    setOcrStatus('UNREADABLE');
                    if (!ocrReason) setOcrReason(OCR_UNREADABLE_REASONS[0]);
                  }}
                >
                  <HelpCircle size={16} />
                  <span>Unreadable</span>
                  <span className="shortcut">[ 3 ]</span>
                </button>
              </div>

              {ocrStatus === 'UNREADABLE' && (
                <div className="reasons-container">
                  {OCR_UNREADABLE_REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`reason-chip ${ocrReason === r ? 'selected amber' : ''}`}
                      onClick={() => setOcrReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Violation Detection Check */}
            <div className="decision-box highlight">
              <div className="box-title">
                <span>Violation Detection Check</span>
                <span className="key-badge">KEYS: C | I | U</span>
              </div>

              <div className="btn-group-row">
                <button
                  type="button"
                  className={`decision-btn ${violationVerdict === 'CORRECT' ? 'active green' : ''}`}
                  onClick={() => setViolationVerdict('CORRECT')}
                >
                  <CheckCircle2 size={16} />
                  <span>Correct</span>
                  <span className="shortcut">[ C ]</span>
                </button>

                <button
                  type="button"
                  className={`decision-btn ${violationVerdict === 'INCORRECT' ? 'active red' : ''}`}
                  onClick={() => {
                    setViolationVerdict('INCORRECT');
                    if (!failureReason) setFailureReason(activeReasons[0]);
                  }}
                >
                  <AlertCircle size={16} />
                  <span>Incorrect</span>
                  <span className="shortcut">[ I ]</span>
                </button>

                <button
                  type="button"
                  className={`decision-btn ${violationVerdict === 'CANNOT_DETERMINE' ? 'active amber' : ''}`}
                  onClick={() => setViolationVerdict('CANNOT_DETERMINE')}
                >
                  <HelpCircle size={16} />
                  <span>Uncertain</span>
                  <span className="shortcut">[ U ]</span>
                </button>
              </div>

              {/* Predefined Failure Reasons */}
              {violationVerdict === 'INCORRECT' && (
                <div className="reasons-container">
                  {activeReasons.map(r => (
                    <button
                      key={r}
                      type="button"
                      className={`reason-chip ${failureReason === r ? 'selected' : ''}`}
                      onClick={() => setFailureReason(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Visual Context & Quality */}
            <div className="decision-box">
              <div className="box-title">
                <span>Image Quality & Lighting</span>
              </div>

              <div className="context-row">
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Quality:</span>
                {(['USABLE', 'LOW_QUALITY', 'UNUSABLE'] as const).map(q => (
                  <button
                    key={q}
                    type="button"
                    className={`context-chip ${imageQuality === q ? 'active' : ''}`}
                    onClick={() => setImageQuality(q)}
                  >
                    {q.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="context-row">
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Lighting:</span>
                {(['DAYLIGHT', 'LOW_LIGHT', 'NIGHT', 'OVEREXPOSED'] as const).map(l => (
                  <button
                    key={l}
                    type="button"
                    className={`context-chip ${lighting === l ? 'active' : ''}`}
                    onClick={() => setLighting(l)}
                  >
                    {l.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Extra Observation Tag: Phone While Driving */}
            <div className="decision-box">
              <div className="box-title">
                <span>Additional Observation</span>
                <span className="key-badge">KEY: P</span>
              </div>

              <button
                type="button"
                className={`phone-tag-btn ${
                  phoneTag === 'CONFIRMED'
                    ? 'active-confirmed'
                    : phoneTag === 'POSSIBLE'
                    ? 'active-possible'
                    : ''
                }`}
                onClick={() =>
                  setPhoneTag(prev =>
                    prev === 'NONE' ? 'CONFIRMED' : prev === 'CONFIRMED' ? 'POSSIBLE' : 'NONE'
                  )
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PhoneCall size={16} />
                  <span>Phone While Driving</span>
                </div>
                <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>
                  {phoneTag === 'CONFIRMED'
                    ? '✓ Confirmed Evidence'
                    : phoneTag === 'POSSIBLE'
                    ? '? Possible Use'
                    : '+ Add Tag [P]'}
                </span>
              </button>
            </div>

            {/* 6. Submit & Auto-Advance */}
            <button
              type="button"
              className="submit-advance-btn"
              onClick={handleSubmitAndNext}
              disabled={submitting}
            >
              <Send size={18} />
              <span>SUBMIT & NEXT IMAGE → (Enter)</span>
            </button>
          </aside>
        </div>
      )}

      {/* Footer Shortcut Bar */}
      <footer className="shortcuts-footer">
        <div className="shortcut-item">
          <kbd>1</kbd> OCR OK
        </div>
        <div className="shortcut-item">
          <kbd>2</kbd> OCR Edit
        </div>
        <div className="shortcut-item">
          <kbd>3</kbd> Unreadable
        </div>
        <span>•</span>
        <div className="shortcut-item">
          <kbd>C</kbd> Detection OK
        </div>
        <div className="shortcut-item">
          <kbd>I</kbd> Incorrect
        </div>
        <div className="shortcut-item">
          <kbd>U</kbd> Uncertain
        </div>
        <span>•</span>
        <div className="shortcut-item">
          <kbd>P</kbd> Phone Use
        </div>
        <span>•</span>
        <div className="shortcut-item">
          <kbd>Enter</kbd> Submit & Advance
        </div>
      </footer>
    </div>
  );
}
