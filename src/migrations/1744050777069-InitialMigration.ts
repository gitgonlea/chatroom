import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1744050777069 implements MigrationInterface {
    name = 'InitialMigration1744050777069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "message" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "text" text NOT NULL, "username" character varying NOT NULL, "fromUserId" character varying, "toUserId" character varying, "isPrivate" boolean NOT NULL DEFAULT false, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "inGeneralChat" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c59262513a3006fd8f58bb4b7c" ON "message" ("fromUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_96789153e31e0bb7885ea13a27" ON "message" ("toUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_98661585e9a2fbbe2b47b8330d" ON "message" ("isPrivate") `);
        await queryRunner.query(`CREATE INDEX "IDX_0a97a10e53ad4e12bda1e6b28b" ON "message" ("timestamp") `);
        await queryRunner.query(`CREATE TYPE "public"."user_relationship_type_enum" AS ENUM('friend', 'ignored')`);
        await queryRunner.query(`CREATE TABLE "user_relationship" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "relatedUserId" character varying NOT NULL, "type" "public"."user_relationship_type_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "related_user_id" uuid, CONSTRAINT "PK_9822b30599d58e4204e19b972a9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('guest', 'member', 'mod', 'owner')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'guest', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_ban" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "bannedById" character varying NOT NULL, "reason" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, "isPermanent" boolean NOT NULL DEFAULT false, "isRevoked" boolean NOT NULL DEFAULT false, "user_id" uuid, "banned_by_id" uuid, CONSTRAINT "PK_9f75b2f627b383463e35f2f59a1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user_relationship" ADD CONSTRAINT "FK_f55831668fd7ad54592c8a2e999" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_relationship" ADD CONSTRAINT "FK_437ecc46c78f7e90d842acc4241" FOREIGN KEY ("related_user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_ban" ADD CONSTRAINT "FK_2c8432cd166730e48f649315ea2" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_ban" ADD CONSTRAINT "FK_3a33f30088a226671406dc57ebd" FOREIGN KEY ("banned_by_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_ban" DROP CONSTRAINT "FK_3a33f30088a226671406dc57ebd"`);
        await queryRunner.query(`ALTER TABLE "user_ban" DROP CONSTRAINT "FK_2c8432cd166730e48f649315ea2"`);
        await queryRunner.query(`ALTER TABLE "user_relationship" DROP CONSTRAINT "FK_437ecc46c78f7e90d842acc4241"`);
        await queryRunner.query(`ALTER TABLE "user_relationship" DROP CONSTRAINT "FK_f55831668fd7ad54592c8a2e999"`);
        await queryRunner.query(`DROP TABLE "user_ban"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP TABLE "user_relationship"`);
        await queryRunner.query(`DROP TYPE "public"."user_relationship_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a97a10e53ad4e12bda1e6b28b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98661585e9a2fbbe2b47b8330d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_96789153e31e0bb7885ea13a27"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c59262513a3006fd8f58bb4b7c"`);
        await queryRunner.query(`DROP TABLE "message"`);
    }

}
