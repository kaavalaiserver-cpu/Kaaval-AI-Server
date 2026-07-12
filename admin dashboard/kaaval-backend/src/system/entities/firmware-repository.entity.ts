import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('firmware_repository')
export class FirmwareRepository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  version!: string;

  @Column({ name: 'target_hardware', type: 'varchar', length: 100 })
  targetHardware!: string;

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ type: 'varchar', length: 128 })
  checksum!: string;

  @Column({ type: 'text', nullable: true })
  changelog!: string | null;

  @Column({ name: 'is_mandatory', type: 'boolean', default: false })
  isMandatory!: boolean;

  @Column({ name: 'release_date', type: 'timestamp' })
  releaseDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
