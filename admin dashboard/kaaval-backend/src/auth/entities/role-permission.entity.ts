import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Role } from './role.entity.js';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @Column({ type: 'varchar', length: 100 })
  module!: string; // e.g. Violations, Reports, Users

  @Column({ type: 'varchar', length: 100 })
  permission!: string; // e.g. Read, Verify, Approve

  @ManyToOne(() => Role, (r) => r.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
