import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', nullable: true })
  userId!: string;

  @Column({ name: 'action' })
  action!: string;

  @Column({ name: 'violation_id', nullable: true })
  violationId!: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress!: string;

  @Column({ type: 'simple-json', nullable: true })
  details!: Record<string, any>;
}
