import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Camera } from './camera.entity.js';

@Entity('camera_events')
export class CameraEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ type: 'varchar', length: 20, default: 'INFO' })
  severity!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'json', nullable: true })
  metadata!: any | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Camera, (c) => c.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;
}
