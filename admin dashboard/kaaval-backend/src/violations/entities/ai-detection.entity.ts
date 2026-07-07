import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Camera } from '../../cameras/entities/camera.entity.js';
import { Vehicle } from '../../vehicles/entities/vehicle.entity.js';
import { Violation } from './violation.entity.js';
import { AiModel } from '../../devices/entities/ai-model.entity.js';

@Entity('ai_detections')
export class AiDetection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Index()
  @Column({ name: 'vehicle_id', type: 'varchar', nullable: true })
  vehicleId!: string | null;

  @Column({ name: 'raw_detection', type: 'json' })
  rawDetection!: any;

  @Index()
  @Column({ name: 'ai_model_id', type: 'varchar', nullable: true })
  aiModelId!: string | null;

  @Column({ type: 'float', nullable: true })
  confidence!: number | null;

  @Column({ name: 'detection_time', type: 'datetime' })
  detectionTime!: Date;

  @Column({ name: 'promoted_to_violation', type: 'boolean', default: false })
  promotedToViolation!: boolean;

  @Index()
  @Column({ name: 'violation_id', type: 'varchar', nullable: true })
  violationId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => Camera, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @ManyToOne(() => AiModel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ai_model_id' })
  aiModel!: AiModel | null;

  @ManyToOne(() => Violation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'violation_id' })
  violation!: Violation | null;
}
