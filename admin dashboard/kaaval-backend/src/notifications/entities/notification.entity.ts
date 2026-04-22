import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: string; // violation_detected, camera_offline, ocr_failure, system_error

  @Column({ type: 'varchar', length: 500 })
  message!: string;

  @Column({ type: 'simple-json', nullable: true })
  data!: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  read!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
