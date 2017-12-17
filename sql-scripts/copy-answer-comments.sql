INSERT INTO answer_comment (assessment_id, survey_id, user_id, question_id, reason, text, language_code, created_at, deleted_at)
	SELECT
		:assessment_id AS assessment_id,
		a.survey_id AS survey_id,
		a.user_id AS user_id,
		a.question_id AS question_id,
		a.reason AS reason,
		a.text AS text,
		a.language_code AS language_code,
		NOW() AS created_at,
		NULL AS deleted_at
	FROM answer_comment AS a
	WHERE
		a.assessment_id = :prev_assessment_id AND a.deleted_at IS NULL
	ORDER BY id;
