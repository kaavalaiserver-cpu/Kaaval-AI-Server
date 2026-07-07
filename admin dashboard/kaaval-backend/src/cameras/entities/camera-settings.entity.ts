import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Camera } from './camera.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('camera_settings')
export class CameraSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Column({ name: 'helmet_detection', type: 'boolean', default: false })
  helmetDetection!: boolean;

  @Column({ name: 'triple_riding', type: 'boolean', default: false })
  tripleRiding!: boolean;

  @Column({ name: 'phone_usage', type: 'boolean', default: false })
  phoneUsage!: boolean;

  @Column({ name: 'seatbelt_detection', type: 'boolean', default: false })
  seatbeltDetection!: boolean;

  @Column({ name: 'overspeed_detection', type: 'boolean', default: false })
  overspeedDetection!: boolean;

  @Column({ name: 'wrong_route_detection', type: 'boolean', default: false })
  wrongRouteDetection!: boolean;

  @Column({ name: 'red_light_detection', type: 'boolean', default: false })
  redLightDetection!: boolean;

  @Column({ name: 'no_parking_detection', type: 'boolean', default: false })
  noParkingDetection!: boolean;

  @Column({ name: 'confidence_threshold', type: 'float', default: 0.75 })
  confidenceThreshold!: number;

  @Column({ name: 'minimum_plate_confidence', type: 'float', default: 0.85 })
  minimumPlateConfidence!: number;

  @Column({ name: 'led_enabled', type: 'boolean', default: false })
  ledEnabled!: boolean;

  @Column({ name: 'heartbeat_interval', type: 'int', default: 30 })
  heartbeatInterval!: number;

  @Column({ name: 'recording_enabled', type: 'boolean', default: false })
  recordingEnabled!: boolean;

  @Column({ name: 'auto_cleanup_days', type: 'int', default: 30 })
  autoCleanupDays!: number;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => Camera, (c) => c.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy!: User | null;
}
