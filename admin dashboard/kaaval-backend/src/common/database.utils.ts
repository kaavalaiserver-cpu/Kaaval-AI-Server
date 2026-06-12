import { ColumnType } from 'typeorm';

export function getTimestampColumnType(): ColumnType {
  return process.env.DB_TYPE === 'sqlite' ? 'datetime' : 'timestamptz';
}
