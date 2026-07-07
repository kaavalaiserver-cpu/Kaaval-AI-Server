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
import { AiModel } from './ai-model.entity.js';

@Entity('camera_model_mapping')
export class CameraModelMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Index()
  @Column({ name: 'ai_model_id', type: 'varchar' })
  aiModelId!: string;

  @Column({ name: 'assigned_at', type: 'datetime' })
  assignedAt!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Camera, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @ManyToOne(() => AiModel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ai_model_id' })
  aiModel!: AiModel;
}
