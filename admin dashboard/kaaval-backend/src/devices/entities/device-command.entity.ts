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
import { User } from '../../users/entities/user.entity.js';

@Entity('device_commands')
export class DeviceCommand {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'device_id', type: 'varchar' })
  deviceId!: string;

  @Column({ name: 'command_type', type: 'varchar', length: 50 })
  commandType!: string;

  @Column({ type: 'json', nullable: true })
  payload!: any | null;

  @Column({ type: 'varchar', length: 20, default: 'QUEUED' })
  status!: string;

  @Column({ name: 'executed_at', type: 'datetime', nullable: true })
  executedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  response!: string | null;

  @Index()
  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Device, (d) => d.commands, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;
}
