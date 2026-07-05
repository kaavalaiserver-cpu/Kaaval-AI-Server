import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('ai_models')
export class AiModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'model_name', type: 'varchar', length: 100 })
  modelName!: string;

  @Column({ type: 'varchar', length: 50 })
  version!: string;

  @Column({ name: 'target_hardware', type: 'varchar', length: 100 })
  targetHardware!: string; // RDK_X3, NVIDIA_JETSON, CORAL

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
