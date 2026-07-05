import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subdivision } from '../../subdivisions/entities/subdivision.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'district_name', type: 'varchar', length: 100, unique: true })
  districtName!: string;

  @Column({ type: 'varchar', length: 100, default: 'Tamil Nadu' })
  state!: string;

  @Column({ type: 'varchar', length: 100, default: 'India' })
  country!: string;

  @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
  status!: string; // ACTIVE, INACTIVE

  @OneToMany(() => Subdivision, (s) => s.district)
  subdivisions!: Subdivision[];

  @OneToMany(() => User, (u) => u.district)
  users!: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
