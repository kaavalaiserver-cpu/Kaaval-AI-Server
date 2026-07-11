import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Role } from '../../auth/entities/role.entity.js';
import { Subdivision } from '../../subdivisions/entities/subdivision.entity.js';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 50, default: 'INFO' })
  severity!: string;

  @Column({ name: 'notification_type', type: 'varchar', length: 50 })
  notificationType!: string;

  @Index()
  @Column({ name: 'sender_id', type: 'varchar', nullable: true })
  senderId!: string | null;

  @Index()
  @Column({ name: 'target_role_id', type: 'varchar', nullable: true })
  targetRoleId!: string | null;

  @Index()
  @Column({ name: 'target_subdivision_id', type: 'varchar', nullable: true })
  targetSubdivisionId!: string | null;

  @Index()
  @Column({ name: 'target_user_id', type: 'varchar', nullable: true })
  targetUserId!: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // ── Relations ─────────────────────────────────────────────────
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_id' })
  sender!: User | null;

  @ManyToOne(() => Role, { nullable: true })
  @JoinColumn({ name: 'target_role_id' })
  targetRole!: Role | null;

  @ManyToOne(() => Subdivision, { nullable: true })
  @JoinColumn({ name: 'target_subdivision_id' })
  targetSubdivision!: Subdivision | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_user_id' })
  targetUser!: User | null;
}
