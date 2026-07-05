import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Device } from '../../devices/entities/device.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'api_key', type: 'varchar', length: 100 })
  apiKey!: string; // Usually a hashed representation for searching, or prefix

  @Column({ name: 'api_secret_hash', type: 'text' })
  apiSecretHash!: string;

  @Column({ name: 'key_name', type: 'varchar', length: 150 })
  keyName!: string;

  @Index()
  @Column({ name: 'device_id', type: 'uuid', nullable: true })
  deviceId!: string | null;

  @Index()
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  scopes!: any | null; // e.g. ["TELEMETRY_WRITE", "EVIDENCE_UPLOAD"]

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Device, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'device_id' })
  device!: Device | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;
}
