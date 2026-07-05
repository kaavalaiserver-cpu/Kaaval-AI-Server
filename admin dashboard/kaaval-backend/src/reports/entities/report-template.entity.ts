import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('report_templates')
export class ReportTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_name', type: 'varchar', length: 150, unique: true })
  templateName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'html_layout', type: 'text' })
  htmlLayout!: string; // Handlebars or HTML template

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
