import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizTables1787800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE quiz_attempt_status AS ENUM (
        'IN_PROGRESS',
        'PASSED',
        'FAILED',
        'EXPIRED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE questions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_text  TEXT NOT NULL,
        options        JSONB NOT NULL,
        correct_answer TEXT NOT NULL,
        tags           JSONB,
        is_active      BOOLEAN NOT NULL DEFAULT true,
        created_at     TIMESTAMP NOT NULL DEFAULT now(),
        updated_at     TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE quizzes (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title               VARCHAR(255) NOT NULL,
        description         TEXT,
        time_limit_minutes  INT NOT NULL DEFAULT -1,
        max_attempts        INT NOT NULL DEFAULT 3,
        passing_score       INT NOT NULL DEFAULT 80,
        is_active           BOOLEAN NOT NULL DEFAULT false,
        created_at          TIMESTAMP NOT NULL DEFAULT now(),
        updated_at          TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE quiz_questions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id      UUID NOT NULL REFERENCES quizzes(id)   ON DELETE CASCADE,
        question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
        order_index  INT NOT NULL,
        UNIQUE (quiz_id, question_id),
        UNIQUE (quiz_id, order_index)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_quiz_questions_quiz     ON quiz_questions(quiz_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id)
    `);

    await queryRunner.query(`
      CREATE TABLE quiz_attempts (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quiz_id          UUID NOT NULL REFERENCES quizzes(id),
        tasker_id        UUID NOT NULL REFERENCES taskers(id),
        attempt_number   INT NOT NULL DEFAULT 1,
        status           quiz_attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
        score            INT,
        correct_count    INT,
        total_questions  INT NOT NULL,
        started_at       TIMESTAMP NOT NULL DEFAULT now(),
        submitted_at     TIMESTAMP,
        expired_at       TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_quiz_attempts_tasker ON quiz_attempts(tasker_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_quiz_attempts_quiz   ON quiz_attempts(quiz_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_quiz_attempts_status ON quiz_attempts(status)
    `);

    await queryRunner.query(`
      CREATE TABLE quiz_attempt_answers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        attempt_id       UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question_id      UUID NOT NULL REFERENCES questions(id),
        selected_answer  TEXT,
        is_correct       BOOLEAN NOT NULL DEFAULT false,
        UNIQUE (attempt_id, question_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_attempt_answers_attempt  ON quiz_attempt_answers(attempt_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_attempt_answers_question ON quiz_attempt_answers(question_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS quiz_attempt_answers`);
    await queryRunner.query(`DROP TABLE IF EXISTS quiz_attempts`);
    await queryRunner.query(`DROP TABLE IF EXISTS quiz_questions`);
    await queryRunner.query(`DROP TABLE IF EXISTS quizzes`);
    await queryRunner.query(`DROP TABLE IF EXISTS questions`);
    await queryRunner.query(`DROP TYPE IF EXISTS quiz_attempt_status`);
  }
}
