import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Violation } from '../../violations/entities/violation.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('model_evaluations')
export class ModelEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'violation_id', type: 'uuid' })
  violationId!: string;

  @ManyToOne(() => Violation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'violation_id' })
  violation!: Violation;

  @Index()
  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: User;

  @Column({ name: 'reviewer_username', type: 'varchar', length: 150 })
  reviewerUsername!: string;

  @Column({ name: 'model_name', type: 'varchar', length: 100, default: 'Kaaval AI Core v1.4' })
  modelName!: string;

  // OCR Verification
  @Column({ name: 'original_ocr_prediction', type: 'varchar', length: 50, nullable: true })
  originalOcrPrediction!: string | null;

  @Index()
  @Column({ name: 'ocr_status', type: 'varchar', length: 30 })
  ocrStatus!: 'CORRECT' | 'INCORRECT' | 'UNREADABLE';

  @Column({ name: 'corrected_ocr_value', type: 'varchar', length: 50, nullable: true })
  correctedOcrValue!: string | null;

  @Column({ name: 'ocr_unreadable_reason', type: 'varchar', length: 100, nullable: true })
  ocrUnreadableReason!: string | null;

  // Violation Detection Verification
  @Column({ name: 'predicted_violation', type: 'varchar', length: 100, nullable: true })
  predictedViolation!: string | null;

  @Index()
  @Column({ name: 'violation_verdict', type: 'varchar', length: 30 })
  violationVerdict!: 'CORRECT' | 'INCORRECT' | 'CANNOT_DETERMINE';

  @Column({ name: 'error_category', type: 'varchar', length: 100, nullable: true })
  errorCategory!: string | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 150, nullable: true })
  failureReason!: string | null;

  // Visual Context & Dimensions
  @Column({ name: 'image_quality', type: 'varchar', length: 50, default: 'USABLE' })
  imageQuality!: string;

  @Column({ name: 'lighting_condition', type: 'varchar', length: 50, default: 'DAYLIGHT' })
  lightingCondition!: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 50, default: 'MOTORCYCLE' })
  vehicleType!: string;

  // Extra Observation Tags
  @Column({ name: 'phone_while_driving', type: 'varchar', length: 30, default: 'NONE' })
  phoneWhileDriving!: 'NONE' | 'CONFIRMED' | 'POSSIBLE';

  // Derived Fields
  @Column({ name: 'registration_state', type: 'varchar', length: 50, nullable: true })
  registrationState!: string | null;

  @Column({ name: 'review_duration_seconds', type: 'float', default: 0 })
  reviewDurationSeconds!: number;

  // Quality Audit
  @Column({ name: 'is_audited', type: 'boolean', default: false })
  isAudited!: boolean;

  @Column({ name: 'audit_agreed', type: 'boolean', nullable: true })
  auditAgreed!: boolean | null;

  @Column({ name: 'audit_reviewer_id', type: 'uuid', nullable: true })
  auditReviewerId!: string | null;

  @Column({ name: 'audit_notes', type: 'text', nullable: true })
  auditNotes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
