import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Camera } from '../../cameras/entities/camera.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { ViolationType } from './violation-type.entity.js';
import { Evidence } from './evidence.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('violations')
export class Violation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'camera_id', type: 'uuid', nullable: true })
  cameraId!: string | null;

  @Index()
  @Column({ name: 'vehicle_id', type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @Column({ name: 'violation_type_id', type: 'uuid', nullable: true })
  violationTypeId!: string | null;

  @Column({ type: 'float', nullable: true })
  confidence!: number | null;

  @Index()
  @Column({ name: 'violation_timestamp', type: 'timestamptz' })
  violationTimestamp!: Date;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status!: string; // PENDING, UNDER_REVIEW, APPROVED, REJECTED, AUTO_REJECTED

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedByUserId!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes!: string | null;

  @Column({ name: 'rejected_reason', type: 'text', nullable: true })
  rejectedReason!: string | null;

  @Column({ name: 'challan_status', type: 'varchar', length: 50, default: 'NOT_GENERATED' })
  challanStatus!: string; // NOT_GENERATED, GENERATED, PAID, CANCELLED

  @Column({ name: 'challan_reference', type: 'varchar', length: 100, nullable: true })
  challanReference!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => Camera, (c) => c.violations, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera | null;

  @ManyToOne(() => Vehicle, (v) => v.violations, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @ManyToOne(() => ViolationType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'violation_type_id' })
  violationType!: ViolationType | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy!: User | null;

  @OneToMany(() => Evidence, (e) => e.violation)
  evidence!: Evidence[];
}
