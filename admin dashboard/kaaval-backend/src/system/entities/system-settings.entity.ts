import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'district_name', type: 'varchar', length: 150 })
  districtName!: string;

  @Column({ name: 'otp_enabled', type: 'boolean', default: false })
  otpEnabled!: boolean;

  @Column({ name: 'email_enabled', type: 'boolean', default: false })
  emailEnabled!: boolean;

  @Column({ name: 'maintenance_mode', type: 'boolean', default: false })
  maintenanceMode!: boolean;

  @Column({ name: 'backup_time', type: 'time', default: '02:00:00' })
  backupTime!: string;

  @Column({ name: 'retention_days', type: 'int', default: 30 })
  retentionDays!: number;

  @Column({ name: 'heartbeat_timeout', type: 'int', default: 120 })
  heartbeatTimeout!: number;

  @Column({ name: 'default_confidence', type: 'float', default: 0.75 })
  defaultConfidence!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
