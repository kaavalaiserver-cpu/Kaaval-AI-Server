import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * Per-officer, per-notification read state.
 * Replaces the single boolean `read` on the notification row.
 * Allows each officer to independently mark a notification as read/unread.
 */
@Entity('notification_recipients')
export class NotificationRecipient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'notification_id', type: 'varchar' })
  notificationId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
