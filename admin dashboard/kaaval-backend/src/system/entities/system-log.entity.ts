import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('system_logs')
export class SystemLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 20 })
  level!: string;

  @Column({ type: 'varchar', length: 50 })
  module!: string;

  @Column({ type: 'text' })
  message!: string;
}
