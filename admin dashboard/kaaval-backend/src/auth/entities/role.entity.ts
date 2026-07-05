import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { RolePermission } from './role-permission.entity.js';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'role_code', type: 'varchar', length: 50, unique: true })
  roleCode!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ name: 'hierarchy_level', type: 'int', default: 100 })
  hierarchyLevel!: number; // Lower number = higher access (e.g. 1 = Super Admin)

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_system_role', type: 'boolean', default: false })
  isSystemRole!: boolean; // Cannot be deleted or modified

  @OneToMany(() => User, (u) => u.role)
  users!: User[];

  @OneToMany(() => RolePermission, (rp) => rp.role)
  permissions!: RolePermission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
