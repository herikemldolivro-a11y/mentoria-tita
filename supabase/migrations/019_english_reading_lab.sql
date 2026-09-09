
-- Mentoria Titã — V9.4.2
-- English Reading Lab — CFO PMAL
-- 12 textos por semana.
-- W1-3 Level 1; W4-5 Level 2; W6 transição L2→L3; W7-8 Level 3.
-- Semana 1: 9 leituras + 3 textos com 6 itens C/E.
-- Textos autorais/adaptados; as URLs abaixo são fontes temáticas de referência.

create table if not exists public.english_week_goals (
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 8),
  level_label text not null,
  target_texts integer not null default 12,
  reading_texts integer not null default 9,
  exam_texts integer not null default 3,
  primary key(plan_id, week_number)
);

create table if not exists public.english_texts (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  week_number integer not null,
  day_number integer not null,
  level integer not null check (level between 1 and 3),
  mode text not null check (mode in ('read','exam')),
  slug text not null,
  title text not null,
  source_title text,
  source_url text,
  source_note text not null default 'Adaptação autoral baseada no tema da fonte de referência.',
  sentences jsonb not null default '[]'::jsonb,
  word_map jsonb not null default '{}'::jsonb,
  position integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(plan_id, week_number, slug)
);

create table if not exists public.english_questions (
  id uuid primary key default gen_random_uuid(),
  text_id uuid not null references public.english_texts(id) on delete cascade,
  position integer not null,
  statement text not null,
  correct_answer boolean not null,
  explanation text not null,
  unique(text_id, position)
);

create table if not exists public.user_english_text_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  text_id uuid not null references public.english_texts(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(user_id,text_id)
);

create table if not exists public.user_english_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text_id uuid not null references public.english_texts(id) on delete cascade,
  word text not null,
  word_key text not null,
  translation text not null,
  context text,
  starred boolean not null default false,
  saved_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  review_count integer not null default 0,
  unique(user_id,text_id,word_key)
);

create table if not exists public.user_english_question_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.english_questions(id) on delete cascade,
  answer boolean not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key(user_id,question_id)
);

create index if not exists english_texts_week_idx
  on public.english_texts(plan_id,week_number,day_number,position);
create index if not exists user_english_vocab_recent_idx
  on public.user_english_vocabulary(user_id,saved_at desc);

alter table public.english_week_goals enable row level security;
alter table public.english_texts enable row level security;
alter table public.english_questions enable row level security;
alter table public.user_english_text_progress enable row level security;
alter table public.user_english_vocabulary enable row level security;
alter table public.user_english_question_answers enable row level security;

drop policy if exists "Authenticated read english week goals" on public.english_week_goals;
create policy "Authenticated read english week goals"
on public.english_week_goals for select to authenticated using (true);

drop policy if exists "Authenticated read english texts" on public.english_texts;
create policy "Authenticated read english texts"
on public.english_texts for select to authenticated using (active = true);

drop policy if exists "Authenticated read english questions" on public.english_questions;
create policy "Authenticated read english questions"
on public.english_questions for select to authenticated using (true);

drop policy if exists "Users read own english progress" on public.user_english_text_progress;
create policy "Users read own english progress"
on public.user_english_text_progress for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users read own english vocabulary" on public.user_english_vocabulary;
create policy "Users read own english vocabulary"
on public.user_english_vocabulary for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users read own english answers" on public.user_english_question_answers;
create policy "Users read own english answers"
on public.user_english_question_answers for select to authenticated using (user_id = auth.uid());

grant select on public.english_week_goals, public.english_texts, public.english_questions,
  public.user_english_text_progress, public.user_english_vocabulary,
  public.user_english_question_answers to authenticated;

with p as (
  select id from public.study_plans where slug='cfo-pmal-2026' limit 1
)
insert into public.english_week_goals(
  plan_id,week_number,level_label,target_texts,reading_texts,exam_texts
)
select p.id,x.week_number,x.level_label,12,9,3
from p
cross join (
  values
    (1,'Level 1'),(2,'Level 1'),(3,'Level 1'),
    (4,'Level 2'),(5,'Level 2'),
    (6,'Transição Level 2 → Level 3'),
    (7,'Level 3'),(8,'Level 3')
) as x(week_number,level_label)
on conflict(plan_id,week_number)
do update set
  level_label=excluded.level_label,
  target_texts=excluded.target_texts,
  reading_texts=excluded.reading_texts,
  exam_texts=excluded.exam_texts;

do $$
declare
  v_plan_id uuid;
  v_payload jsonb := $seed${"texts": [{"slug": "brain-recovery", "day": 1, "level": 1, "mode": "read", "position": 1, "title": "How the brain can recover", "source_title": "Our brain can heal itself – level 1", "source_url": "https://www.newsinlevels.com/products/our-brain-can-heal-itself-level-1/", "sentences": [{"en": "In 1848, a worker named Phineas Gage had a serious accident.", "pt": "Em 1848, um trabalhador chamado Phineas Gage sofreu um acidente grave."}, {"en": "An iron rod went through the front of his head, but he lived.", "pt": "Uma barra de ferro atravessou a parte frontal da cabeça dele, mas ele sobreviveu."}, {"en": "After the accident, his behavior changed.", "pt": "Depois do acidente, o comportamento dele mudou."}, {"en": "Later, he found a job with simple and repeated tasks.", "pt": "Mais tarde, ele encontrou um trabalho com tarefas simples e repetidas."}, {"en": "Doctors now believe that this work may have helped his brain learn new ways to do things.", "pt": "Hoje, médicos acreditam que esse trabalho pode ter ajudado o cérebro dele a aprender novas maneiras de realizar tarefas."}, {"en": "The case became important in neuroscience because it showed that the brain can change and adapt after a serious injury.", "pt": "O caso se tornou importante para a neurociência porque mostrou que o cérebro pode mudar e se adaptar depois de uma lesão grave."}], "word_map": {"worker": "trabalhador", "named": "chamado", "serious": "grave", "accident": "acidente", "iron": "ferro", "rod": "barra", "front": "frente", "head": "cabeça", "lived": "sobreviveu", "behavior": "comportamento", "changed": "mudou", "later": "mais tarde", "job": "trabalho", "simple": "simples", "repeated": "repetidas", "tasks": "tarefas", "doctors": "médicos", "believe": "acreditam", "helped": "ajudado", "brain": "cérebro", "learn": "aprender", "ways": "maneiras", "case": "caso", "neuroscience": "neurociência", "adapt": "adaptar", "injury": "lesão"}}, {"slug": "meta-apps", "day": 1, "level": 1, "mode": "read", "position": 2, "title": "New rules for a large technology company", "source_title": "Meta must pay and change its apps – level 1", "source_url": "https://www.newsinlevels.com/products/meta-must-pay-and-change-its-apps-level-1/", "sentences": [{"en": "A large technology company faces new rules about how young people use social media.", "pt": "Uma grande empresa de tecnologia enfrenta novas regras sobre como jovens usam redes sociais."}, {"en": "The company may have to pay a large amount of money and change some parts of its apps.", "pt": "A empresa pode ter de pagar uma grande quantia de dinheiro e mudar algumas partes de seus aplicativos."}, {"en": "Supporters say that teenagers need more protection and more control over their time online.", "pt": "Defensores das medidas dizem que adolescentes precisam de mais proteção e controle sobre o tempo online."}, {"en": "The company says that it will study the rules and defend its position.", "pt": "A empresa afirma que estudará as regras e defenderá sua posição."}, {"en": "The debate shows how governments are trying to control very powerful digital platforms.", "pt": "O debate mostra como governos estão tentando controlar plataformas digitais muito poderosas."}], "word_map": {"large": "grande", "technology": "tecnologia", "company": "empresa", "faces": "enfrenta", "rules": "regras", "young": "jovens", "social": "social", "media": "mídia/redes sociais", "pay": "pagar", "amount": "quantia", "money": "dinheiro", "change": "mudar", "parts": "partes", "apps": "aplicativos", "supporters": "defensores", "teenagers": "adolescentes", "protection": "proteção", "control": "controle", "online": "online", "study": "estudar", "defend": "defender", "position": "posição", "debate": "debate", "governments": "governos", "powerful": "poderosas", "digital": "digitais", "platforms": "plataformas"}}, {"slug": "textile-colors", "day": 2, "level": 1, "mode": "read", "position": 3, "title": "Cleaner ways to color clothes", "source_title": "Making textile color without chemicals – level 1", "source_url": "https://www.newsinlevels.com/products/making-textile-color-without-chemicals-level-1/", "sentences": [{"en": "Making clothes can use a lot of water and strong chemicals.", "pt": "Fabricar roupas pode usar muita água e produtos químicos fortes."}, {"en": "Researchers are testing cleaner ways to make color for textiles.", "pt": "Pesquisadores estão testando formas mais limpas de produzir cor para tecidos."}, {"en": "Some new methods use living organisms or special materials to create color with less pollution.", "pt": "Alguns métodos novos usam organismos vivos ou materiais especiais para criar cor com menos poluição."}, {"en": "Companies are interested because many customers want products that are better for the environment.", "pt": "Empresas estão interessadas porque muitos consumidores querem produtos melhores para o meio ambiente."}, {"en": "If the new methods become cheaper and easier, they may reduce waste in the fashion industry.", "pt": "Se os novos métodos ficarem mais baratos e fáceis, eles podem reduzir o desperdício na indústria da moda."}], "word_map": {"making": "fabricando", "clothes": "roupas", "water": "água", "strong": "fortes", "chemicals": "produtos químicos", "researchers": "pesquisadores", "testing": "testando", "cleaner": "mais limpas", "color": "cor", "textiles": "tecidos", "methods": "métodos", "living": "vivos", "organisms": "organismos", "special": "especiais", "materials": "materiais", "pollution": "poluição", "companies": "empresas", "interested": "interessadas", "customers": "consumidores", "products": "produtos", "environment": "meio ambiente", "cheaper": "mais baratos", "easier": "mais fáceis", "reduce": "reduzir", "waste": "desperdício", "fashion": "moda", "industry": "indústria"}}, {"slug": "english-memory", "day": 2, "level": 1, "mode": "read", "position": 4, "title": "Why new English words disappear", "source_title": "Why you forget English words and how to fix it – level 1", "source_url": "https://www.newsinlevels.com/products/why-you-forget-english-words-and-how-to-fix-it-level-1/", "sentences": [{"en": "Many students learn a new English word and forget it a few days later.", "pt": "Muitos estudantes aprendem uma palavra nova em inglês e a esquecem alguns dias depois."}, {"en": "This is normal when the brain sees the word only once or twice.", "pt": "Isso é normal quando o cérebro vê a palavra apenas uma ou duas vezes."}, {"en": "A better method is to meet the word many times in different sentences.", "pt": "Um método melhor é encontrar a palavra muitas vezes em frases diferentes."}, {"en": "Reading short texts, listening, and using the word can make the memory stronger.", "pt": "Ler textos curtos, ouvir e usar a palavra pode fortalecer a memória."}, {"en": "It also helps to review words after one day and then again after several days.", "pt": "Também ajuda revisar as palavras depois de um dia e novamente depois de vários dias."}, {"en": "Small reviews are often better than one long study session.", "pt": "Revisões pequenas muitas vezes são melhores que uma longa sessão de estudo."}], "word_map": {"students": "estudantes", "learn": "aprender", "english": "inglês", "word": "palavra", "forget": "esquecer", "days": "dias", "later": "depois", "normal": "normal", "brain": "cérebro", "once": "uma vez", "twice": "duas vezes", "better": "melhor", "method": "método", "meet": "encontrar", "different": "diferentes", "sentences": "frases", "reading": "leitura", "short": "curtos", "texts": "textos", "listening": "escuta", "using": "usando", "memory": "memória", "stronger": "mais forte", "review": "revisar", "several": "vários", "reviews": "revisões", "often": "frequentemente", "long": "longa", "session": "sessão"}}, {"slug": "music-economy", "day": 3, "level": 1, "mode": "read", "position": 5, "title": "How a music tour can help a city", "source_title": "Swiftenomics – level 1", "source_url": "https://www.newsinlevels.com/products/swiftenomics-level-1/", "sentences": [{"en": "A famous singer can bring thousands of fans to one city.", "pt": "Uma cantora famosa pode levar milhares de fãs a uma cidade."}, {"en": "Fans buy tickets, stay in hotels, eat in restaurants, and use local transport.", "pt": "Os fãs compram ingressos, ficam em hotéis, comem em restaurantes e usam transporte local."}, {"en": "Because of this, one large concert can create a lot of business for local companies.", "pt": "Por causa disso, um grande show pode gerar muitos negócios para empresas locais."}, {"en": "Economists study this effect to understand how entertainment changes spending.", "pt": "Economistas estudam esse efeito para entender como o entretenimento muda os gastos."}, {"en": "The benefit is not the same for everyone because prices can rise and small businesses may have different results.", "pt": "O benefício não é igual para todos porque os preços podem subir e pequenos negócios podem ter resultados diferentes."}, {"en": "Still, big events can have a clear short-term effect on a local economy.", "pt": "Ainda assim, grandes eventos podem ter um efeito claro de curto prazo sobre a economia local."}], "word_map": {"famous": "famosa", "singer": "cantora", "bring": "levar", "thousands": "milhares", "fans": "fãs", "city": "cidade", "tickets": "ingressos", "hotels": "hotéis", "restaurants": "restaurantes", "local": "local", "transport": "transporte", "concert": "show", "business": "negócios", "companies": "empresas", "economists": "economistas", "effect": "efeito", "understand": "entender", "entertainment": "entretenimento", "spending": "gastos", "benefit": "benefício", "prices": "preços", "rise": "subir", "businesses": "negócios", "results": "resultados", "events": "eventos", "clear": "claro", "short-term": "curto prazo", "economy": "economia"}}, {"slug": "ai-scams", "day": 3, "level": 1, "mode": "exam", "position": 6, "title": "AI can make online scams harder to see", "source_title": "AI scams – level 1", "source_url": "https://www.newsinlevels.com/products/ai-scams-level-1/", "sentences": [{"en": "Artificial intelligence can help people create useful images, voices, and messages, but criminals can use the same tools for fraud.", "pt": "A inteligência artificial pode ajudar pessoas a criar imagens, vozes e mensagens úteis, mas criminosos podem usar as mesmas ferramentas para fraude."}, {"en": "A fake voice may sound like a family member asking for money.", "pt": "Uma voz falsa pode soar como um familiar pedindo dinheiro."}, {"en": "A false image or message may also look real at first.", "pt": "Uma imagem ou mensagem falsa também pode parecer real no primeiro momento."}, {"en": "Security experts tell users to stop and check before they act.", "pt": "Especialistas em segurança orientam os usuários a parar e verificar antes de agir."}, {"en": "Calling a person on a known number, checking the source, and refusing urgent payment requests can reduce risk.", "pt": "Ligar para a pessoa em um número conhecido, verificar a fonte e recusar pedidos urgentes de pagamento pode reduzir o risco."}, {"en": "New technology makes verification more important, not less.", "pt": "A nova tecnologia torna a verificação mais importante, não menos."}], "word_map": {"artificial": "artificial", "intelligence": "inteligência", "useful": "úteis", "images": "imagens", "voices": "vozes", "messages": "mensagens", "criminals": "criminosos", "tools": "ferramentas", "fraud": "fraude", "fake": "falsa", "voice": "voz", "sound": "soar", "family": "família", "member": "membro", "asking": "pedindo", "money": "dinheiro", "false": "falsa", "real": "real", "security": "segurança", "experts": "especialistas", "users": "usuários", "check": "verificar", "act": "agir", "calling": "ligar", "known": "conhecido", "number": "número", "source": "fonte", "refusing": "recusar", "urgent": "urgentes", "payment": "pagamento", "requests": "pedidos", "risk": "risco", "verification": "verificação"}}, {"slug": "driving-trends", "day": 4, "level": 1, "mode": "read", "position": 7, "title": "Dangerous driving trends online", "source_title": "Dangerous driving TikTok trend – level 1", "source_url": "https://www.newsinlevels.com/products/dangerous-driving-tiktok-trend-level-1/", "sentences": [{"en": "Short videos can make risky driving look exciting.", "pt": "Vídeos curtos podem fazer uma direção arriscada parecer empolgante."}, {"en": "Some young drivers copy online challenges because they want attention or views.", "pt": "Alguns jovens motoristas copiam desafios online porque querem atenção ou visualizações."}, {"en": "Police and road safety groups warn that these actions can cause serious crashes.", "pt": "A polícia e grupos de segurança viária alertam que essas ações podem causar acidentes graves."}, {"en": "A few seconds of video can lead to injuries, deaths, and legal problems.", "pt": "Alguns segundos de vídeo podem levar a lesões, mortes e problemas legais."}, {"en": "Experts say that social media companies, families, schools, and drivers all have a role in prevention.", "pt": "Especialistas dizem que empresas de redes sociais, famílias, escolas e motoristas têm um papel na prevenção."}, {"en": "The safest choice is simple: do not copy a dangerous act just because it is popular online.", "pt": "A escolha mais segura é simples: não copie um ato perigoso apenas porque ele é popular online."}], "word_map": {"videos": "vídeos", "risky": "arriscada", "driving": "direção", "exciting": "empolgante", "drivers": "motoristas", "copy": "copiar", "challenges": "desafios", "attention": "atenção", "views": "visualizações", "police": "polícia", "road": "estrada", "safety": "segurança", "groups": "grupos", "warn": "alertam", "actions": "ações", "cause": "causar", "crashes": "acidentes", "seconds": "segundos", "lead": "levar", "injuries": "lesões", "deaths": "mortes", "legal": "legais", "problems": "problemas", "families": "famílias", "schools": "escolas", "role": "papel", "prevention": "prevenção", "safest": "mais segura", "choice": "escolha", "dangerous": "perigoso", "popular": "popular"}}, {"slug": "sleep-position", "day": 4, "level": 1, "mode": "read", "position": 8, "title": "Does sleep position matter?", "source_title": "The best way to sleep – level 1", "source_url": "https://www.newsinlevels.com/products/the-best-way-to-sleep-level-1/", "sentences": [{"en": "People sleep on their back, side, or stomach, and each position can feel different.", "pt": "As pessoas dormem de costas, de lado ou de barriga, e cada posição pode parecer diferente."}, {"en": "For many people, side sleeping is comfortable and may help with some breathing problems.", "pt": "Para muitas pessoas, dormir de lado é confortável e pode ajudar em alguns problemas respiratórios."}, {"en": "Back sleeping can support the body well, but it may make snoring worse for some people.", "pt": "Dormir de costas pode apoiar bem o corpo, mas pode piorar o ronco para algumas pessoas."}, {"en": "Stomach sleeping can reduce snoring, but it can also put pressure on the neck.", "pt": "Dormir de barriga pode reduzir o ronco, mas também pode colocar pressão no pescoço."}, {"en": "There is no perfect position for everyone.", "pt": "Não existe uma posição perfeita para todos."}, {"en": "Good sleep also depends on comfort, health, a quiet room, and a regular routine.", "pt": "Um bom sono também depende de conforto, saúde, um quarto silencioso e uma rotina regular."}], "word_map": {"sleep": "dormir/sono", "back": "costas", "side": "lado", "stomach": "barriga", "position": "posição", "comfortable": "confortável", "breathing": "respiração", "problems": "problemas", "support": "apoiar", "body": "corpo", "snoring": "ronco", "worse": "pior", "reduce": "reduzir", "pressure": "pressão", "neck": "pescoço", "perfect": "perfeita", "everyone": "todos", "comfort": "conforto", "health": "saúde", "quiet": "silencioso", "room": "quarto", "routine": "rotina"}}, {"slug": "reading-brain", "day": 5, "level": 1, "mode": "read", "position": 9, "title": "Reading changes the brain", "source_title": "Reading changes our brain – level 1", "source_url": "https://www.newsinlevels.com/products/reading-changes-our-brain-level-1/", "sentences": [{"en": "Babies are not born knowing how to read.", "pt": "Bebês não nascem sabendo ler."}, {"en": "The brain learns to connect shapes, sounds, words, and meaning.", "pt": "O cérebro aprende a conectar formas, sons, palavras e significado."}, {"en": "With practice, these connections become faster and stronger.", "pt": "Com prática, essas conexões ficam mais rápidas e fortes."}, {"en": "Researchers say that regular reading can improve attention, language, and the ability to understand complex ideas.", "pt": "Pesquisadores dizem que a leitura regular pode melhorar a atenção, a linguagem e a capacidade de entender ideias complexas."}, {"en": "Reading different kinds of texts also gives the brain more practice with new information.", "pt": "Ler diferentes tipos de textos também dá ao cérebro mais prática com novas informações."}, {"en": "Like physical training, reading works best when it becomes a regular habit.", "pt": "Assim como o treino físico, a leitura funciona melhor quando se torna um hábito regular."}], "word_map": {"babies": "bebês", "born": "nascem", "knowing": "sabendo", "brain": "cérebro", "connect": "conectar", "shapes": "formas", "sounds": "sons", "words": "palavras", "meaning": "significado", "practice": "prática", "connections": "conexões", "faster": "mais rápidas", "stronger": "mais fortes", "researchers": "pesquisadores", "reading": "leitura", "improve": "melhorar", "attention": "atenção", "language": "linguagem", "ability": "capacidade", "complex": "complexas", "ideas": "ideias", "kinds": "tipos", "information": "informações", "physical": "físico", "training": "treino", "habit": "hábito"}}, {"slug": "arctic-shipping", "day": 6, "level": 1, "mode": "exam", "position": 10, "title": "A shorter Arctic route brings new risks", "source_title": "Is the Arctic route good for container ships? – level 1", "source_url": "https://www.newsinlevels.com/products/is-the-arctic-route-good-for-container-ships-level-1/", "sentences": [{"en": "Some shipping companies are interested in Arctic sea routes because the distance between Asia and Europe can be shorter.", "pt": "Algumas empresas de transporte marítimo estão interessadas em rotas pelo Ártico porque a distância entre a Ásia e a Europa pode ser menor."}, {"en": "Less distance may mean less travel time and lower fuel costs.", "pt": "Uma distância menor pode significar menos tempo de viagem e custos menores de combustível."}, {"en": "However, Arctic navigation is difficult.", "pt": "Entretanto, a navegação no Ártico é difícil."}, {"en": "Ice, cold weather, limited rescue services, and environmental damage can create serious risks.", "pt": "Gelo, clima frio, serviços de resgate limitados e danos ambientais podem criar riscos graves."}, {"en": "Climate change is opening some routes for longer periods, which creates both business opportunities and new concerns.", "pt": "A mudança climática está abrindo algumas rotas por períodos mais longos, o que cria oportunidades de negócios e novas preocupações."}, {"en": "A shorter route is not automatically a safer or cheaper route.", "pt": "Uma rota mais curta não é automaticamente uma rota mais segura ou barata."}], "word_map": {"shipping": "transporte marítimo", "companies": "empresas", "arctic": "Ártico", "sea": "mar", "routes": "rotas", "distance": "distância", "asia": "Ásia", "europe": "Europa", "shorter": "mais curta", "travel": "viagem", "lower": "menores", "fuel": "combustível", "costs": "custos", "however": "entretanto", "navigation": "navegação", "difficult": "difícil", "ice": "gelo", "cold": "frio", "weather": "clima", "limited": "limitados", "rescue": "resgate", "services": "serviços", "environmental": "ambientais", "damage": "danos", "risks": "riscos", "climate": "clima", "opening": "abrindo", "longer": "mais longos", "periods": "períodos", "opportunities": "oportunidades", "concerns": "preocupações", "safer": "mais segura", "cheaper": "mais barata"}}, {"slug": "teen-sleep", "day": 7, "level": 1, "mode": "read", "position": 11, "title": "Teenagers need more sleep", "source_title": "US teenagers do not sleep enough – level 1", "source_url": "https://www.newsinlevels.com/products/us-teenagers-do-not-sleep-enough-level-1/", "sentences": [{"en": "Many teenagers sleep less than they need.", "pt": "Muitos adolescentes dormem menos do que precisam."}, {"en": "School schedules, phones, homework, stress, and late nights can all reduce sleep time.", "pt": "Horários escolares, celulares, tarefas de casa, estresse e noites tardias podem reduzir o tempo de sono."}, {"en": "When teenagers do not sleep enough, they may have more difficulty with attention, memory, mood, and learning.", "pt": "Quando adolescentes não dormem o suficiente, podem ter mais dificuldade com atenção, memória, humor e aprendizagem."}, {"en": "Experts often recommend a regular bedtime and less screen use before sleep.", "pt": "Especialistas frequentemente recomendam um horário regular para dormir e menos uso de telas antes do sono."}, {"en": "Families and schools can also help by treating sleep as part of health, not as wasted time.", "pt": "Famílias e escolas também podem ajudar tratando o sono como parte da saúde, e não como tempo desperdiçado."}, {"en": "Better sleep can support better study and daily performance.", "pt": "Dormir melhor pode apoiar um estudo melhor e um desempenho diário melhor."}], "word_map": {"teenagers": "adolescentes", "school": "escola", "schedules": "horários", "phones": "celulares", "homework": "tarefas de casa", "stress": "estresse", "late": "tardias", "nights": "noites", "enough": "suficiente", "difficulty": "dificuldade", "attention": "atenção", "memory": "memória", "mood": "humor", "learning": "aprendizagem", "experts": "especialistas", "recommend": "recomendam", "bedtime": "horário de dormir", "screen": "tela", "families": "famílias", "treating": "tratando", "health": "saúde", "wasted": "desperdiçado", "daily": "diário", "performance": "desempenho"}}, {"slug": "nuclear-water", "day": 8, "level": 1, "mode": "exam", "position": 12, "title": "Power plants need reliable water", "source_title": "Nuclear power plants do not have enough water – level 1", "source_url": "https://www.newsinlevels.com/products/nuclear-power-plants-do-not-have-enough-water-level-1/", "sentences": [{"en": "Hot weather and low rainfall can reduce the water available to some power plants.", "pt": "Clima quente e pouca chuva podem reduzir a água disponível para algumas usinas de energia."}, {"en": "Nuclear plants need water for cooling important equipment.", "pt": "Usinas nucleares precisam de água para resfriar equipamentos importantes."}, {"en": "If a river becomes too warm or too low, operators may need to reduce electricity production.", "pt": "Se um rio ficar quente demais ou com nível muito baixo, operadores podem precisar reduzir a produção de eletricidade."}, {"en": "This can be a problem during heat waves, when electricity demand may rise.", "pt": "Isso pode ser um problema durante ondas de calor, quando a demanda por eletricidade pode aumentar."}, {"en": "Some plants use different cooling systems, but every system has limits.", "pt": "Algumas usinas usam sistemas de resfriamento diferentes, mas todo sistema tem limites."}, {"en": "Energy planners say that stronger water management and backup plans can help reduce future risk.", "pt": "Planejadores de energia dizem que uma gestão mais forte da água e planos de contingência podem ajudar a reduzir riscos futuros."}], "word_map": {"hot": "quente", "weather": "clima", "low": "baixa", "rainfall": "chuva", "water": "água", "available": "disponível", "power": "energia", "plants": "usinas", "nuclear": "nucleares", "cooling": "resfriamento", "equipment": "equipamentos", "river": "rio", "warm": "quente", "operators": "operadores", "electricity": "eletricidade", "production": "produção", "problem": "problema", "heat": "calor", "waves": "ondas", "demand": "demanda", "rise": "aumentar", "systems": "sistemas", "limits": "limites", "energy": "energia", "planners": "planejadores", "stronger": "mais forte", "management": "gestão", "backup": "contingência", "future": "futuro", "risk": "risco"}}], "questions": [{"slug": "ai-scams", "position": 1, "statement": "Artificial intelligence is presented in the text as a technology used only by criminals.", "correct": false, "explanation": "O texto afirma que a IA pode criar conteúdos úteis e também ser usada por criminosos. O termo “only” torna o item errado."}, {"slug": "ai-scams", "position": 2, "statement": "A fake voice may imitate a family member who appears to ask for money.", "correct": true, "explanation": "A segunda frase afirma exatamente que uma voz falsa pode soar como um familiar pedindo dinheiro."}, {"slug": "ai-scams", "position": 3, "statement": "In the expression “the same tools”, “tools” refers to technologies that can create images, voices, and messages.", "correct": true, "explanation": "“The same tools” retoma as ferramentas de IA mencionadas na primeira frase."}, {"slug": "ai-scams", "position": 4, "statement": "In context, the word “urgent” is compatible with the idea of something that requires immediate attention.", "correct": true, "explanation": "No contexto, “urgent” transmite a ideia de algo imediato."}, {"slug": "ai-scams", "position": 5, "statement": "The text recommends accepting payment requests quickly when the message looks real.", "correct": false, "explanation": "O texto recomenda parar, verificar a fonte e recusar pedidos urgentes suspeitos."}, {"slug": "ai-scams", "position": 6, "statement": "In “before they act”, the pronoun “they” refers to the users mentioned in the same sentence.", "correct": true, "explanation": "O antecedente natural de “they” é “users”."}, {"slug": "arctic-shipping", "position": 1, "statement": "According to the text, a shorter Arctic distance guarantees a cheaper route for shipping companies.", "correct": false, "explanation": "A rota mais curta pode reduzir tempo e combustível, mas o texto diz que ela não é automaticamente mais barata."}, {"slug": "arctic-shipping", "position": 2, "statement": "A shorter distance between Asia and Europe may reduce travel time and fuel costs.", "correct": true, "explanation": "Essa relação é apresentada explicitamente na segunda frase."}, {"slug": "arctic-shipping", "position": 3, "statement": "The text states that climate change may keep some Arctic routes open for longer periods.", "correct": true, "explanation": "A quinta frase informa que a mudança climática está abrindo algumas rotas por períodos mais longos."}, {"slug": "arctic-shipping", "position": 4, "statement": "The connector “However” introduces a contrast between possible advantages and the difficulties of Arctic navigation.", "correct": true, "explanation": "“However” introduz contraste entre possíveis ganhos e as dificuldades/riscos."}, {"slug": "arctic-shipping", "position": 5, "statement": "In the fifth sentence, “which” refers exclusively to environmental damage.", "correct": false, "explanation": "“Which” retoma a ideia anterior de abertura de rotas por períodos maiores, e não apenas “environmental damage”."}, {"slug": "arctic-shipping", "position": 6, "statement": "Limited rescue services are mentioned as one of the risks of Arctic navigation.", "correct": true, "explanation": "O texto lista explicitamente serviços de resgate limitados entre os riscos."}, {"slug": "nuclear-water", "position": 1, "statement": "Low rainfall can reduce the amount of water available to some power plants.", "correct": true, "explanation": "A primeira frase relaciona pouca chuva à redução da água disponível."}, {"slug": "nuclear-water", "position": 2, "statement": "The text states that nuclear plants do not need water to cool equipment.", "correct": false, "explanation": "O texto afirma o contrário: usinas nucleares precisam de água para resfriar equipamentos importantes."}, {"slug": "nuclear-water", "position": 3, "statement": "A river that becomes too warm or too low may force operators to reduce electricity production.", "correct": true, "explanation": "Essa consequência é apresentada explicitamente na terceira frase."}, {"slug": "nuclear-water", "position": 4, "statement": "In “This can be a problem”, “This” refers to the possible need to reduce electricity production.", "correct": true, "explanation": "O demonstrativo retoma a situação descrita na frase anterior."}, {"slug": "nuclear-water", "position": 5, "statement": "The text suggests that electricity demand necessarily falls during heat waves.", "correct": false, "explanation": "O texto informa que a demanda pode subir durante ondas de calor."}, {"slug": "nuclear-water", "position": 6, "statement": "The final sentence presents water management and backup plans as possible ways to reduce future risk.", "correct": true, "explanation": "A última frase oferece essas duas medidas como formas de reduzir risco futuro."}]}$seed$::jsonb;
  v_item jsonb;
  v_text_id uuid;
begin
  select id into v_plan_id
  from public.study_plans
  where slug='cfo-pmal-2026'
  limit 1;

  if v_plan_id is null then
    raise exception 'Plano cfo-pmal-2026 não encontrado';
  end if;

  for v_item in select value from jsonb_array_elements(v_payload->'texts')
  loop
    insert into public.english_texts(
      plan_id,week_number,day_number,level,mode,slug,title,
      source_title,source_url,source_note,sentences,word_map,position,active
    )
    values(
      v_plan_id,
      1,
      (v_item->>'day')::integer,
      (v_item->>'level')::integer,
      v_item->>'mode',
      v_item->>'slug',
      v_item->>'title',
      nullif(v_item->>'source_title',''),
      nullif(v_item->>'source_url',''),
      'Adaptação autoral para estudo. Tema/notícia de referência: News in Levels. Não é transcrição do artigo.',
      v_item->'sentences',
      v_item->'word_map',
      (v_item->>'position')::integer,
      true
    )
    on conflict(plan_id,week_number,slug)
    do update set
      day_number=excluded.day_number,
      level=excluded.level,
      mode=excluded.mode,
      title=excluded.title,
      source_title=excluded.source_title,
      source_url=excluded.source_url,
      source_note=excluded.source_note,
      sentences=excluded.sentences,
      word_map=excluded.word_map,
      position=excluded.position,
      active=true;
  end loop;

  for v_item in select value from jsonb_array_elements(v_payload->'questions')
  loop
    select id into v_text_id
    from public.english_texts
    where plan_id=v_plan_id
      and week_number=1
      and slug=v_item->>'slug'
    limit 1;

    insert into public.english_questions(
      text_id,position,statement,correct_answer,explanation
    )
    values(
      v_text_id,
      (v_item->>'position')::integer,
      v_item->>'statement',
      (v_item->>'correct')::boolean,
      v_item->>'explanation'
    )
    on conflict(text_id,position)
    do update set
      statement=excluded.statement,
      correct_answer=excluded.correct_answer,
      explanation=excluded.explanation;
  end loop;
end;
$$;

create or replace function public.get_my_english_overview()
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;
  if v_plan_id is null then return '[]'::jsonb; end if;

  with g as (
    select * from public.english_week_goals where plan_id=v_plan_id
  ), a as (
    select week_number,count(*)::integer available_texts
    from public.english_texts
    where plan_id=v_plan_id and active
    group by week_number
  ), c as (
    select t.week_number,count(*)::integer completed_texts
    from public.user_english_text_progress p
    join public.english_texts t on t.id=p.text_id
    where p.user_id=v_user_id and p.status='completed' and t.plan_id=v_plan_id
    group by t.week_number
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'week_number',g.week_number,
    'level_label',g.level_label,
    'target_texts',g.target_texts,
    'reading_texts',g.reading_texts,
    'exam_texts',g.exam_texts,
    'available_texts',coalesce(a.available_texts,0),
    'completed_texts',coalesce(c.completed_texts,0)
  ) order by g.week_number),'[]'::jsonb)
  into v_result
  from g left join a using(week_number) left join c using(week_number);

  return v_result;
end;
$$;

create or replace function public.get_my_english_week(p_week integer)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_goal jsonb;
  v_texts jsonb;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;

  select jsonb_build_object(
    'week_number',week_number,'level_label',level_label,
    'target_texts',target_texts,'reading_texts',reading_texts,'exam_texts',exam_texts
  )
  into v_goal
  from public.english_week_goals
  where plan_id=v_plan_id and week_number=p_week;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.id,'day_number',t.day_number,'level',t.level,'mode',t.mode,
    'slug',t.slug,'title',t.title,'position',t.position,'source_title',t.source_title,
    'status',coalesce(p.status,'not_started'),
    'vocab_count',(select count(*) from public.user_english_vocabulary v where v.user_id=v_user_id and v.text_id=t.id),
    'question_count',(select count(*) from public.english_questions q where q.text_id=t.id),
    'correct_answers',(select count(*) from public.user_english_question_answers a join public.english_questions q on q.id=a.question_id where a.user_id=v_user_id and q.text_id=t.id and a.is_correct)
  ) order by t.day_number,t.position),'[]'::jsonb)
  into v_texts
  from public.english_texts t
  left join public.user_english_text_progress p on p.text_id=t.id and p.user_id=v_user_id
  where t.plan_id=v_plan_id and t.week_number=p_week and t.active;

  return jsonb_build_object('goal',coalesce(v_goal,'{}'::jsonb),'texts',coalesce(v_texts,'[]'::jsonb));
end;
$$;

create or replace function public.get_english_text_reader(p_text_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan_id uuid;
  v_text jsonb;
  v_questions jsonb;
  v_vocab jsonb;
  v_status text;
begin
  if v_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select active_study_plan_id into v_plan_id from public.profiles where id=v_user_id;

  select jsonb_build_object(
    'id',t.id,'week_number',t.week_number,'day_number',t.day_number,'level',t.level,
    'mode',t.mode,'slug',t.slug,'title',t.title,'source_title',t.source_title,
    'source_url',t.source_url,'source_note',t.source_note,
    'sentences',t.sentences,'word_map',t.word_map
  )
  into v_text
  from public.english_texts t
  where t.id=p_text_id and t.plan_id=v_plan_id and t.active;

  if v_text is null then raise exception 'Texto não encontrado'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'position',q.position,'statement',q.statement,
    'correct_answer',q.correct_answer,'explanation',q.explanation,
    'answer',a.answer,'is_correct',a.is_correct
  ) order by q.position),'[]'::jsonb)
  into v_questions
  from public.english_questions q
  left join public.user_english_question_answers a on a.question_id=q.id and a.user_id=v_user_id
  where q.text_id=p_text_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',v.id,'word',v.word,'word_key',v.word_key,'translation',v.translation,
    'context',v.context,'starred',v.starred,'saved_at',v.saved_at,
    'review_count',v.review_count
  ) order by v.saved_at desc),'[]'::jsonb)
  into v_vocab
  from public.user_english_vocabulary v
  where v.user_id=v_user_id and v.text_id=p_text_id;

  select status into v_status
  from public.user_english_text_progress
  where user_id=v_user_id and text_id=p_text_id;

  return jsonb_build_object(
    'text',v_text,'questions',v_questions,'vocabulary',v_vocab,
    'status',coalesce(v_status,'not_started')
  );
end;
$$;

create or replace function public.mark_english_text_started(p_text_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  insert into public.user_english_text_progress(user_id,text_id,status,started_at)
  values(auth.uid(),p_text_id,'in_progress',now())
  on conflict(user_id,text_id)
  do update set started_at=least(public.user_english_text_progress.started_at,excluded.started_at);
end;
$$;

create or replace function public.toggle_english_vocab_word(
  p_text_id uuid,p_word text,p_translation text,p_context text default null
)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_key text := lower(regexp_replace(trim(coalesce(p_word,'')),'[^a-zA-Z''-]+','','g'));
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  if v_key='' then raise exception 'Palavra inválida'; end if;

  select id into v_id
  from public.user_english_vocabulary
  where user_id=auth.uid() and text_id=p_text_id and word_key=v_key;

  if v_id is not null then
    delete from public.user_english_vocabulary where id=v_id;
    return jsonb_build_object('saved',false,'word_key',v_key);
  end if;

  insert into public.user_english_vocabulary(
    user_id,text_id,word,word_key,translation,context,saved_at
  )
  values(auth.uid(),p_text_id,p_word,v_key,p_translation,p_context,now())
  returning id into v_id;

  return jsonb_build_object('saved',true,'id',v_id,'word_key',v_key);
end;
$$;

create or replace function public.review_english_vocab_word(p_vocab_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.user_english_vocabulary
  set last_reviewed_at=now(),review_count=review_count+1
  where id=p_vocab_id and user_id=auth.uid();
end;
$$;

create or replace function public.set_english_vocab_star(p_vocab_id uuid,p_starred boolean)
returns void language plpgsql security definer set search_path=public
as $$
begin
  update public.user_english_vocabulary
  set starred=p_starred
  where id=p_vocab_id and user_id=auth.uid();
end;
$$;

create or replace function public.get_my_english_vocabulary()
returns jsonb language plpgsql security definer set search_path=public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',v.id,'word',v.word,'translation',v.translation,'context',v.context,
      'starred',v.starred,'saved_at',v.saved_at,'last_reviewed_at',v.last_reviewed_at,
      'review_count',v.review_count,'text_title',t.title,
      'week_number',t.week_number,'day_number',t.day_number
    ) order by v.saved_at desc)
    from public.user_english_vocabulary v
    join public.english_texts t on t.id=v.text_id
    where v.user_id=auth.uid()
  ),'[]'::jsonb);
end;
$$;

create or replace function public.record_english_question_answer(p_question_id uuid,p_answer boolean)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_correct boolean;
  v_explanation text;
  v_is_correct boolean;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;

  select correct_answer,explanation
  into v_correct,v_explanation
  from public.english_questions
  where id=p_question_id;

  if not found then raise exception 'Questão não encontrada'; end if;

  v_is_correct := (p_answer=v_correct);

  insert into public.user_english_question_answers(
    user_id,question_id,answer,is_correct,answered_at
  )
  values(auth.uid(),p_question_id,p_answer,v_is_correct,now())
  on conflict(user_id,question_id)
  do update set answer=excluded.answer,is_correct=excluded.is_correct,answered_at=now();

  return jsonb_build_object(
    'is_correct',v_is_correct,'correct_answer',v_correct,'explanation',v_explanation
  );
end;
$$;

create or replace function public.complete_english_text(p_text_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  v_mode text;
  v_total integer;
  v_answered integer;
  v_correct integer;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;

  select mode into v_mode from public.english_texts where id=p_text_id;
  if v_mode is null then raise exception 'Texto não encontrado'; end if;

  select count(*)::integer into v_total
  from public.english_questions where text_id=p_text_id;

  select count(*)::integer,count(*) filter(where a.is_correct)::integer
  into v_answered,v_correct
  from public.user_english_question_answers a
  join public.english_questions q on q.id=a.question_id
  where a.user_id=auth.uid() and q.text_id=p_text_id;

  if v_mode='exam' and v_answered<v_total then
    raise exception 'Responda os % itens antes de concluir',v_total;
  end if;

  insert into public.user_english_text_progress(
    user_id,text_id,status,started_at,completed_at
  )
  values(auth.uid(),p_text_id,'completed',now(),now())
  on conflict(user_id,text_id)
  do update set status='completed',completed_at=now();

  return jsonb_build_object(
    'completed',true,'question_score',coalesce(v_correct,0),
    'question_total',coalesce(v_total,0)
  );
end;
$$;

revoke all on function public.get_my_english_overview() from public;
revoke all on function public.get_my_english_week(integer) from public;
revoke all on function public.get_english_text_reader(uuid) from public;
revoke all on function public.mark_english_text_started(uuid) from public;
revoke all on function public.toggle_english_vocab_word(uuid,text,text,text) from public;
revoke all on function public.review_english_vocab_word(uuid) from public;
revoke all on function public.set_english_vocab_star(uuid,boolean) from public;
revoke all on function public.get_my_english_vocabulary() from public;
revoke all on function public.record_english_question_answer(uuid,boolean) from public;
revoke all on function public.complete_english_text(uuid) from public;

grant execute on function public.get_my_english_overview() to authenticated;
grant execute on function public.get_my_english_week(integer) to authenticated;
grant execute on function public.get_english_text_reader(uuid) to authenticated;
grant execute on function public.mark_english_text_started(uuid) to authenticated;
grant execute on function public.toggle_english_vocab_word(uuid,text,text,text) to authenticated;
grant execute on function public.review_english_vocab_word(uuid) to authenticated;
grant execute on function public.set_english_vocab_star(uuid,boolean) to authenticated;
grant execute on function public.get_my_english_vocabulary() to authenticated;
grant execute on function public.record_english_question_answer(uuid,boolean) to authenticated;
grant execute on function public.complete_english_text(uuid) to authenticated;

select
  week_number,
  count(*) as textos,
  count(*) filter(where mode='read') as leitura,
  count(*) filter(where mode='exam') as com_questoes
from public.english_texts t
join public.study_plans p on p.id=t.plan_id
where p.slug='cfo-pmal-2026' and week_number=1
group by week_number;
