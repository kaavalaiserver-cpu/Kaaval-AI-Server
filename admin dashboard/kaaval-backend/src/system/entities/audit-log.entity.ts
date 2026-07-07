import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  module!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entity!: string | null;

  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId!: string | null;

  @Column({ name: 'old_data', type: 'json', nullable: true })
  oldData!: any | null;

  @Column({ name: 'new_data', type: 'json', nullable: true })
  newData!: any | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 50, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
