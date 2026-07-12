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

@Entity('ai_inference_logs')
export class AiInferenceLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'camera_id', type: 'varchar' })
  cameraId!: string;

  @Index()
  @Column({ name: 'ai_model_id', type: 'varchar', nullable: true })
  aiModelId!: string | null;

  @Column({ name: 'inference_time_ms', type: 'float' })
  inferenceTimeMs!: number;

  @Column({ type: 'int' })
  fps!: number;

  @Column({ name: 'frames_processed', type: 'int', default: 0 })
  framesProcessed!: number;

  @Column({ name: 'objects_detected', type: 'int', default: 0 })
  objectsDetected!: number;

  @Column({ name: 'confidence_avg', type: 'float', nullable: true })
  confidenceAvg!: number | null;

  @Index()
  @Column({ name: 'recorded_at', type: 'timestamp' })
  recordedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => Camera, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'camera_id' })
  camera!: Camera;

  @ManyToOne(() => AiModel, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ai_model_id' })
  aiModel!: AiModel | null;
}
