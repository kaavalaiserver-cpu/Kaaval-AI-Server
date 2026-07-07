import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('backup_history')
export class BackupHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'backup_type', type: 'varchar', length: 50 })
  backupType!: string; // FULL, INCREMENTAL, SCHEMA_ONLY

  @Column({ name: 'file_path', type: 'text' })
  filePath!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes!: number;

  @Column({ type: 'varchar', length: 20, default: 'SUCCESS' })
  status!: string; // SUCCESS, FAILED, IN_PROGRESS

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Index()
  @Column({ name: 'started_at', type: 'datetime' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
