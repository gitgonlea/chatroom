import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPawnFieldToUser1745162963273 implements MigrationInterface {

public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pawn column to user table
    await queryRunner.addColumn(
      'user',
      new TableColumn({
        name: 'pawn',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user', 'pawn');
  }

}
