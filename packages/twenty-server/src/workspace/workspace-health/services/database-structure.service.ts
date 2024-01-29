import { Injectable } from '@nestjs/common';

import { ColumnType } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';

import {
  WorkspaceTableStructure,
  WorkspaceTableStructureResult,
} from 'src/workspace/workspace-health/interfaces/workspace-table-definition.interface';
import { FieldMetadataDefaultValue } from 'src/metadata/field-metadata/interfaces/field-metadata-default-value.interface';

import { TypeORMService } from 'src/database/typeorm/typeorm.service';
import { FieldMetadataType } from 'src/metadata/field-metadata/field-metadata.entity';
import { fieldMetadataTypeToColumnType } from 'src/metadata/workspace-migration/utils/field-metadata-type-to-column-type.util';
import { serializeTypeDefaultValue } from 'src/metadata/field-metadata/utils/serialize-type-default-value.util';

@Injectable()
export class DatabaseStructureService {
  constructor(private readonly typeORMService: TypeORMService) {}

  async getWorkspaceTableColumns(
    schemaName: string,
    tableName: string,
  ): Promise<WorkspaceTableStructure[]> {
    const mainDataSource = this.typeORMService.getMainDataSource();
    const results = await mainDataSource.query<
      WorkspaceTableStructureResult[]
    >(`
      WITH foreign_keys AS (
        SELECT
          kcu.table_schema AS schema_name,
          kcu.table_name AS table_name,
          kcu.column_name AS column_name,
          tc.constraint_name AS constraint_name
        FROM
          information_schema.key_column_usage AS kcu
        JOIN
          information_schema.table_constraints AS tc
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE
          tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = '${schemaName}'
          AND tc.table_name = '${tableName}'
        ),
        unique_constraints AS (
          SELECT
            tc.table_schema AS schema_name,
            tc.table_name AS table_name,
            kcu.column_name AS column_name
          FROM
            information_schema.key_column_usage AS kcu
          JOIN
            information_schema.table_constraints AS tc
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE
            tc.constraint_type = 'UNIQUE'
            AND tc.table_schema = '${schemaName}'
            AND tc.table_name = '${tableName}'
        )
        SELECT
          c.table_schema AS "tableSchema",
          c.table_name AS "tableName",
          c.column_name AS "columnName",
          CASE 
            WHEN (c.data_type = 'USER-DEFINED') THEN c.udt_name 
            ELSE data_type
          END AS "dataType",
          c.is_nullable AS "isNullable",
          c.column_default AS "columnDefault",
          CASE
            WHEN pk.constraint_type = 'PRIMARY KEY' THEN 'TRUE'
            ELSE 'FALSE'
          END AS "isPrimaryKey",
          CASE
            WHEN fk.constraint_name IS NOT NULL THEN 'TRUE'
            ELSE 'FALSE'
          END AS "isForeignKey",
          CASE
            WHEN uc.column_name IS NOT NULL THEN 'TRUE'
            ELSE 'FALSE'
          END AS "isUnique"
        FROM
          information_schema.columns AS c
        LEFT JOIN
          information_schema.constraint_column_usage AS ccu
          ON c.column_name = ccu.column_name
          AND c.table_name = ccu.table_name
          AND c.table_schema = ccu.table_schema
        LEFT JOIN
          information_schema.table_constraints AS pk
          ON pk.constraint_name = ccu.constraint_name
          AND pk.constraint_type = 'PRIMARY KEY'
          AND pk.table_name = c.table_name
          AND pk.table_schema = c.table_schema
        LEFT JOIN
          foreign_keys AS fk
          ON c.table_schema = fk.schema_name
          AND c.table_name = fk.table_name
          AND c.column_name = fk.column_name
        LEFT JOIN
          unique_constraints AS uc
          ON c.table_schema = uc.schema_name
          AND c.table_name = uc.table_name
          AND c.column_name = uc.column_name
        WHERE
          c.table_schema = '${schemaName}'
          AND c.table_name = '${tableName}';
    `);

    if (!results || results.length === 0) {
      return [];
    }

    return results.map((item) => ({
      ...item,
      isNullable: item.isNullable === 'YES',
      isPrimaryKey: item.isPrimaryKey === 'TRUE',
      isForeignKey: item.isForeignKey === 'TRUE',
      isUnique: item.isUnique === 'TRUE',
    }));
  }

  getPostgresDataType(
    fieldMetadataType: FieldMetadataType,
    fieldMetadataName: string,
    objectMetadataNameSingular: string,
  ): string {
    const typeORMType = fieldMetadataTypeToColumnType(fieldMetadataType);
    const mainDataSource = this.typeORMService.getMainDataSource();

    // TODO: remove special case for enum type, should we include this to fieldMetadataTypeToColumnType?
    if (typeORMType === 'enum') {
      return `${objectMetadataNameSingular}_${fieldMetadataName}_enum`;
    }

    return mainDataSource.driver.normalizeType({
      type: typeORMType,
    });
  }

  getPostgresDefault(
    fieldMetadataType: FieldMetadataType,
    defaultValue: FieldMetadataDefaultValue | null,
  ): string | null | undefined {
    const typeORMType = fieldMetadataTypeToColumnType(
      fieldMetadataType,
    ) as ColumnType;
    const mainDataSource = this.typeORMService.getMainDataSource();

    if (defaultValue && 'type' in defaultValue) {
      const serializedDefaultValue = serializeTypeDefaultValue(defaultValue);

      // Special case for uuid_generate_v4() default value
      if (serializedDefaultValue === 'public.uuid_generate_v4()') {
        return 'uuid_generate_v4()';
      }

      return serializedDefaultValue;
    }

    const value =
      defaultValue && 'value' in defaultValue ? defaultValue.value : null;

    if (typeof value === 'number') {
      return value.toString();
    }

    return mainDataSource.driver.normalizeDefault({
      type: typeORMType,
      default: value,
      isArray: false,
      // Workaround to use normalizeDefault without a complete ColumnMetadata object
    } as ColumnMetadata);
  }
}
