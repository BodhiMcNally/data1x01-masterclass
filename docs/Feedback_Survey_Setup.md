# Feedback survey

The survey is published at https://sydney.au1.qualtrics.com/jfe/form/SV_5uoi6W5wJ0Tg9ym.

Qualtrics project: **DATA1x01 Revision Session Feedback - 10 November 2026**. The eight feedback questions are optional. **Anonymize responses** is enabled, and the survey does not ask for names or student numbers.

The second-last slide's QR opens `/feedback/` on your voting Worker. Its target is configured in `live-questions/public/feedback/config.json`, so the QR stays the same when the Qualtrics link changes. The target is already configured to the published Qualtrics link. If the target is cleared in future, the landing page explicitly says the survey is being prepared.

1. Sign in at https://qualtrics.sydney.edu.au/ with your University account.
2. Create a survey named **DATA1x01 Revision Session Feedback — 10 November 2026**.
3. Import `resources/Qualtrics_Feedback_Import.txt` using Qualtrics' text-file survey import. Review the imported question types and answer choices.
4. Leave all questions optional. In Survey Options, enable **Anonymize responses** before collecting responses, and avoid collecting names, student numbers or contact details. Keep this survey separate from voting response data. Before/after confidence questions are retrospective self-reports, not objective evidence of learning gains.
5. Preview on a phone, publish the survey, then copy its anonymous distribution link (`https://...qualtrics.com/jfe/form/SV_...`).
6. Put that exact link in the `url` field of `live-questions/public/feedback/config.json`. Commit and push.
7. After deployment, test the second-last slide's QR from a phone. It should redirect to your actual Qualtrics survey.

The published anonymous distribution link was verified in the Qualtrics publication dialog and opened successfully without submitting a response.

Reference: https://www.qualtrics.com/support/survey-platform/survey-module/survey-tools/import-and-export-surveys/
