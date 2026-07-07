import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Camera } from './camera.entity.js';

/**
 * Tracks the disk storage used by each camera's local media folder.
 * Enables "Storage Full" alerts and retention cleanup scheduling.
 */
@Entity('camera_storage')
export class CameraStorage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Column({ name: 'storage_path', type: 'varchar', length: 500 })
  storagePath!: string; // e.g. storage/<camera-uuid>/

  @Column({ name: 'total_bytes', type: 'bigint', default: 0 })
  totalBytes!: number;

  @Column({ name: 'used_bytes', type: 'bigint', default: 0 })
  usedBytes!: number;

  @Column({ name: 'remaining_bytes', type: 'bigint', default: 0 })
  remainingBytes!: number;

  @Column({ name: 'retention_days', type: 'int', default: 30 })
  retentionDays!: number;

  @Column({ name: 'last_cleanup_at', type: 'datetime', nullable: true })
  lastCleanupAt!: Date | null;

  @Column({ name: 'last_updated_at', type: 'datetime', nullable: true })
  lastUpdatedAt!: Date | null;

  @OneToOne(() => Camera, (c) => c.storage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
