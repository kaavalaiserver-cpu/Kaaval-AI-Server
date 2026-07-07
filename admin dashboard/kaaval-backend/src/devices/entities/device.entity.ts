import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Camera } from '../../cameras/entities/camera.entity.js';
import { DeviceNetwork } from './device-network.entity.js';
import { DeviceTelemetry } from './device-telemetry.entity.js';
import { DeviceCommand } from './device-command.entity.js';

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Column({ name: 'chip_serial', type: 'varchar', length: 100, nullable: true })
  chipSerial!: string | null;

  @Column({ name: 'board_model', type: 'varchar', length: 100, nullable: true })
  boardModel!: string | null;

  @Column({ name: 'firmware_version', type: 'varchar', length: 50, nullable: true })
  firmwareVersion!: string | null;

  @Column({ name: 'software_version', type: 'varchar', length: 50, nullable: true })
  softwareVersion!: string | null;

  @Column({ name: 'api_key', type: 'varchar', length: 100, unique: true, nullable: true })
  apiKey!: string | null;

  @Column({ name: 'api_secret', type: 'varchar', length: 200, nullable: true })
  apiSecret!: string | null;

  @Column({ name: 'registered_at', type: 'datetime', nullable: true })
  registeredAt!: Date | null;

  @Column({ name: 'last_sync', type: 'datetime', nullable: true })
  lastSync!: Date | null;

  @Column({ name: 'is_registered', type: 'boolean', default: false })
  isRegistered!: boolean;

  // ── Relations ─────────────────────────────────────────────────
  @OneToOne(() => Camera, (c) => c.device, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @OneToOne(() => DeviceNetwork, (dn) => dn.device)
  network!: DeviceNetwork;

  @OneToMany(() => DeviceTelemetry, (dt) => dt.device)
  telemetry!: DeviceTelemetry[];

  @OneToMany(() => DeviceCommand, (dc) => dc.device)
  commands!: DeviceCommand[];
}
