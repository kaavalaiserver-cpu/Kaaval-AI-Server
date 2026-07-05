import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Firmware version registry.
 * Devices reference a firmware_id FK.
 * Enables: rollout tracking, per-device firmware version, update history.
 */
@Entity('firmwares')
export class Firmware {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  version!: string; // e.g. 2.1.4

  @Column({ name: 'release_notes', type: 'text', nullable: true })
  releaseNotes!: string | null;

  @Column({ name: 'file_path', type: 'varchar', length: 500, nullable: true })
  filePath!: string | null;

  @Column({ name: 'is_stable', type: 'boolean', default: true })
  isStable!: boolean;

  @Column({ name: 'min_hardware_version', type: 'varchar', length: 20, nullable: true })
  minHardwareVersion!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
