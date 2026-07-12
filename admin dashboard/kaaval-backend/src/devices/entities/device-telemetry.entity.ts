import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Device } from './device.entity.js';

@Entity('device_telemetry')
export class DeviceTelemetry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'device_id', type: 'varchar' })
  deviceId!: string;

  @Column({ name: 'cpu_usage', type: 'float', nullable: true })
  cpuUsage!: number | null;

  @Column({ name: 'ram_usage', type: 'float', nullable: true })
  ramUsage!: number | null;

  @Column({ name: 'gpu_usage', type: 'float', nullable: true })
  gpuUsage!: number | null;

  @Column({ name: 'disk_usage', type: 'float', nullable: true })
  diskUsage!: number | null;

  @Column({ type: 'float', nullable: true })
  temperature!: number | null;

  @Column({ name: 'network_latency', type: 'float', nullable: true })
  networkLatency!: number | null;

  @Column({ name: 'storage_remaining', type: 'float', nullable: true })
  storageRemaining!: number | null;

  @Column({ type: 'int', nullable: true })
  fps!: number | null;

  @Column({ name: 'uptime_seconds', type: 'bigint', nullable: true })
  uptimeSeconds!: number | null;

  @Column({ name: 'power_status', type: 'varchar', length: 20, default: 'UNKNOWN' })
  powerStatus!: string; // NORMAL, LOW_POWER, BATTERY, UNKNOWN

  @Column({ name: 'heartbeat_received_at', type: 'timestamp', nullable: true })
  heartbeatReceivedAt!: Date | null;

  @Index()
  @Column({ name: 'recorded_at', type: 'timestamp' })
  recordedAt!: Date;

  @ManyToOne(() => Device, (d) => d.telemetry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device;
}
