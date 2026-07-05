import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('storage_locations')
export class StorageLocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'storage_name', type: 'varchar', length: 150 })
  storageName!: string;

  @Column({ name: 'storage_type', type: 'varchar', length: 50 })
  storageType!: string; // LOCAL, S3, NAS

  @Column({ name: 'base_path', type: 'text' })
  basePath!: string;

  @Column({ name: 'total_space_gb', type: 'float', nullable: true })
  totalSpaceGb!: number | null;

  @Column({ name: 'used_space_gb', type: 'float', nullable: true })
  usedSpaceGb!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
