-- AI-written original sentences for the 33 favorite words at launch.
-- Only the specific existing favorite words are updated; originals preserved otherwise.
UPDATE public.mt_english_favorite_phrases p
SET phrase_en = x.sentence, source='ai', updated_at=now()
FROM public.user_english_vocabulary v
JOIN (VALUES
  ('act','If you notice a suspicious message, act carefully instead of replying at once.'),
  ('bring','A good study plan can bring more confidence before an important exam.'),
  ('do','What should you do when you cannot understand a difficult sentence?'),
  ('feel','Some students feel nervous before a test, even when they are prepared.'),
  ('few','A few minutes of daily practice can make reading easier.'),
  ('forget','It is normal to forget a word if you never use it again.'),
  ('had','The student had enough time to check all the answers.'),
  ('his','The officer checked his notes before starting the next lesson.'),
  ('just','Reading just two texts each day can improve your English.'),
  ('lead','Small mistakes can lead to bigger problems if they are ignored.'),
  ('learn','You can learn a new word by reading it in different contexts.'),
  ('like','A misleading email may look like an official notice.'),
  ('listening','Listening to short conversations helps you recognize familiar words.'),
  ('look','Before you click on a link, look at its source.'),
  ('lot','A lot of practice can help you recognize new vocabulary.'),
  ('meet','You may meet the same word again in tomorrow''s reading.'),
  ('put','Put the difficult words in your notebook after reading.'),
  ('refusing','By refusing an unsafe request, you can protect your information.'),
  ('safest','The safest option is to verify the information with an official source.'),
  ('safety','Road safety should be a priority for every driver.'),
  ('same','The same word can have different meanings in different sentences.'),
  ('sees','When a reader sees a new expression twice, it becomes easier to remember.'),
  ('source','Always check the source before sharing important information.'),
  ('spending','Careful spending helps students manage a limited budget.'),
  ('stay','Try to stay focused on the main idea of each paragraph.'),
  ('support','Friends can support each other during a long study routine.'),
  ('tell','The teacher will tell the class how to review the new vocabulary.'),
  ('through','The student improved through regular reading and practice.'),
  ('times','You may need to read a phrase several times to understand it.'),
  ('useful','Learning useful phrases can make English reading more enjoyable.'),
  ('ways','There are many ways to remember a difficult word.'),
  ('well','If you sleep well, you may find it easier to concentrate.'),
  ('worse','A difficult text can feel worse when you try to translate every single word.')
) x(word,sentence) ON lower(v.word)=x.word
WHERE p.user_id=v.user_id AND p.vocab_id=v.id AND v.starred;
