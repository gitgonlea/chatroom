import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';
export class CreatePowersAndUserPowers1745162956200 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
     // Create powers table
     await queryRunner.createTable(
       new Table({
         name: 'powers',
         columns: [
           {
             name: 'id',
             type: 'uuid',
             isPrimary: true,
             generationStrategy: 'uuid',
             default: 'uuid_generate_v4()',
           },
           {
             name: 'name',
             type: 'varchar',
             isUnique: true,
           },
           {
             name: 'description',
             type: 'varchar',
             isNullable: true,
           },
           {
             name: 'created_at',
             type: 'timestamp',
             default: 'now()',
           },
           {
             name: 'is_active',
             type: 'boolean',
             default: true,
           },
         ],
       }),
       true,
     );
 
     // Create user_powers table (many-to-many relationship)
     await queryRunner.createTable(
       new Table({
         name: 'user_powers',
         columns: [
           {
             name: 'id',
             type: 'uuid',
             isPrimary: true,
             generationStrategy: 'uuid',
             default: 'uuid_generate_v4()',
           },
           {
             name: 'user_id',
             type: 'uuid',
           },
           {
             name: 'power_id',
             type: 'uuid',
           },
           {
             name: 'assigned_at',
             type: 'timestamp',
             default: 'now()',
           },
           {
             name: 'expires_at',
             type: 'timestamp',
             isNullable: true,
           },
           {
             name: 'is_active',
             type: 'boolean',
             default: true,
           },
         ],
       }),
       true,
     );
 
     // Create foreign keys
     await queryRunner.createForeignKey(
       'user_powers',
       new TableForeignKey({
         columnNames: ['user_id'],
         referencedColumnNames: ['id'],
         referencedTableName: 'user',
         onDelete: 'CASCADE',
       }),
     );
 
     await queryRunner.createForeignKey(
       'user_powers',
       new TableForeignKey({
         columnNames: ['power_id'],
         referencedColumnNames: ['id'],
         referencedTableName: 'powers',
         onDelete: 'CASCADE',
       }),
     );
 
     // Insert the default 'everypower' power
     await queryRunner.query(`
       INSERT INTO powers (name, description) 
       VALUES ('everypower', 'Default power that allows users to customize their avatars')
     `);
   }
 
   public async down(queryRunner: QueryRunner): Promise<void> {
     await queryRunner.dropTable('user_powers');
     await queryRunner.dropTable('powers');
   }

}
