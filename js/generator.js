// ========================================================
// GYM脈 口コミ生成エンジン
// ルールベース生成：有料AI API不使用、ランニングコスト0円
// ========================================================

const REVIEW_GENERATOR = (() => {

  // ======================================================
  // [1] 導入チャンク (15種類)
  // 来店背景・目的・状況を表す冒頭文
  // ======================================================
  const INTRO_CHUNKS = [
    {
      id: 'IC01',
      topics: ['beginner', 'diet'],
      cond: (m) => m.isBeginner && m.hasDiet,
      w: 10,
      texts: [
        'ダイエット目的で来店しましたが、ジムはほぼ初めてで少し緊張していました。',
        '体型が気になっていて来てみましたが、運動経験がほとんどなく不安もありました。',
        '痩せたくて申し込みましたが、運動は久しぶりで緊張していました。',
      ],
    },
    {
      id: 'IC02',
      topics: ['beginner'],
      cond: (m) => m.isBeginner && !m.hasDiet,
      w: 10,
      texts: [
        'ジムはほぼ初めてで最初は緊張していました。',
        '体を動かすのがかなり久しぶりで、最初は少し不安でした。',
        '運動をほとんどしてこなかったので、参加できるか心配でした。',
      ],
    },
    {
      id: 'IC03',
      topics: ['friend'],
      cond: (m) => m.hasFriend,
      w: 10,
      texts: [
        '友達に誘ってもらって一緒に体験してきました。',
        '友人に勧められて2人で参加しました。',
        '友達から話を聞いて一緒に来てみました。',
      ],
    },
    {
      id: 'IC04',
      topics: ['24hrFail', 'aloneFail'],
      cond: (m) => m.had24hrFail,
      w: 10,
      texts: [
        '以前24時間ジムに通っていましたが一人では続かず、違うスタイルを探していました。',
        '24時間ジムに入会したことがあるものの続かなかった経験があり、こういうスタイルに興味を持ちました。',
        '一人での24時間ジムが続かなかったので、みんなで運動できる場所を探していました。',
      ],
    },
    {
      id: 'IC05',
      topics: ['kickboxing'],
      cond: (m) => m.hasKickboxingPurpose && !m.isBeginner,
      w: 10,
      texts: [
        '以前からキックボクシングに興味があって、体験レッスンを受けてきました。',
        'キックボクシングをやってみたくて来店しました。',
        '格闘技系の運動に興味があり、体験してみました。',
      ],
    },
    {
      id: 'IC06',
      topics: ['kickboxing', 'beginner'],
      cond: (m) => m.hasKickboxingPurpose && m.isBeginner,
      w: 10,
      texts: [
        'キックボクシングに興味があって来てみましたが、運動自体ほぼ初めてでした。',
        'キックボクシングをやってみたくて体験しましたが、ジムは初めてで不安もありました。',
        '以前からキックボクシングが気になっていて、運動初心者ながら思い切って参加しました。',
        'キックボクシング体験に来ましたが、ジムに通うのは初めてで少し心配でした。',
      ],
    },
    {
      id: 'IC07',
      topics: ['stress'],
      cond: (m) => m.hasStress && !m.hasFriend,
      w: 10,
      texts: [
        'ストレス発散になる運動を探していて来店しました。',
        '思い切り体を動かせる場所を探していて、試してみることにしました。',
        '汗をかいてリフレッシュしたくて来てみました。',
        'ストレスを発散できる場所を探していて、思い切って体験してみました。',
        '仕事のストレスがたまっていたので、全力で動ける場所を探していました。',
      ],
    },
    {
      id: 'IC08',
      topics: ['habit'],
      cond: (m) => m.hasExerciseHabit && !m.isBeginner,
      w: 8,
      texts: [
        '運動習慣をつけたくてジムを探していました。',
        '運動不足が気になっていて、いいジムを探していました。',
        '体力づくりのために通えるジムを探していました。',
        '定期的に体を動かす習慣をつけたいと思い、こちらを体験してみました。',
        '運動不足が続いていたので、続けられるジムを探してこちらに来ました。',
      ],
    },
    {
      id: 'IC09',
      topics: ['aloneFail'],
      cond: (m) => m.hadAloneFail && !m.had24hrFail,
      w: 10,
      texts: [
        '一人でのトレーニングが長続きしないタイプなので、みんなで運動できる場所を探していました。',
        '一人だとどうしても続かないので、一緒に頑張れる環境を探していました。',
        '一人で通うジムはなかなか続かなかったので、みんなで動けるスタイルに興味がありました。',
        '一人では続けられなかった経験があるので、仲間と一緒に運動できる場所を探していました。',
      ],
    },
    {
      id: 'IC10',
      topics: ['expensive'],
      cond: (m) => m.hadExpensive,
      w: 10,
      texts: [
        'パーソナルジムは料金的に少し難しかったので、こういうスタイルはちょうどよかったです。',
        '完全パーソナルは費用が高くて迷っていたので、セミパーソナル形式に興味がありました。',
        'マンツーマンのパーソナルジムは費用の面で踏み切れず、こちらを体験してみました。',
        'パーソナルトレーニングは高くて手が出なかったので、このスタイルはありがたかったです。',
      ],
    },
    {
      id: 'IC11',
      topics: ['diet'],
      cond: (m) => m.hasDiet && !m.isBeginner,
      w: 8,
      texts: [
        'ダイエット目的で通い始めました。',
        '体を引き締めたくて来店しました。',
        '体型が気になっていて体験レッスンに申し込みました。',
      ],
    },
    {
      id: 'IC12',
      topics: ['boring'],
      cond: (m) => m.hadBoring,
      w: 9,
      texts: [
        '普通の筋トレだけだと飽きてしまうタイプなので、楽しく続けられるジムを探していました。',
        'マシントレーニングだけでは物足りなさを感じていて、新しいスタイルを試してみました。',
        '単調なトレーニングが続かないタイプなので、楽しそうなジムを探していました。',
        'いつも途中で飽きてしまうので、飽きずに続けられる運動を探していました。',
      ],
    },
    {
      id: 'IC13',
      topics: ['noIdea'],
      cond: (m) => m.hadNoIdea,
      w: 9,
      texts: [
        '何から始めればいいかわからないまま運動を避けていましたが、思い切って来てみました。',
        '運動の始め方がわからず悩んでいたので、サポートしてもらえる環境を探していました。',
        'どんな運動をすればいいかわからなかったので、教えてもらえるジムを探していました。',
        'ずっと運動したいと思いながらも一歩が踏み出せず、体験レッスンに参加してみました。',
      ],
    },
    {
      id: 'IC14',
      topics: ['health'],
      cond: (m) => m.hasHealth && !m.hasDiet && !m.isBeginner,
      w: 7,
      texts: [
        '健康のために運動を始めようと思って来店しました。',
        '体の調子を整えたくて通ってみることにしました。',
        '健康維持のために何か運動を始めようと思い、体験レッスンに申し込みました。',
        '体を動かす習慣を健康のためにつけたくて、こちらに来てみました。',
      ],
    },
    {
      id: 'IC15',
      topics: [],
      cond: (m) => true,
      w: 3,
      texts: [
        '体験レッスンに参加してみました。',
        '気になっていたジムに来てみました。',
        'はじめて来店してみました。',
      ],
    },
  ];

  // ======================================================
  // [2] サービス体験チャンク (20種類)
  // 実際に体験したトレーニング内容
  // ======================================================
  const SERVICE_CHUNKS = [
    {
      id: 'SC01',
      topics: ['kickboxing', 'mituchi'],
      cond: (m) => m.triedKickboxing && m.triedMituchi,
      w: 10,
      texts: [
        'キックボクシングとミット打ちを体験しましたが、こんなに楽しい運動は初めてでした。',
        'キックボクシングでミット打ちをやらせてもらいましたが、爽快感がすごくて夢中になりました。',
        'キックボクシングとミット打ちを体験しました。楽しすぎてあっという間に時間が過ぎました。',
      ],
    },
    {
      id: 'SC02',
      topics: ['kickboxing'],
      cond: (m) => m.triedKickboxing && !m.triedMituchi,
      w: 10,
      texts: [
        'キックボクシングは初めてでしたが、楽しくて夢中になりました。',
        'キックボクシングがこんなに楽しいとは思っていませんでした。',
        'キックボクシングを体験しましたが、思った以上に全身を動かせて気持ちよかったです。',
      ],
    },
    {
      id: 'SC03',
      topics: ['mituchi'],
      cond: (m) => m.triedMituchi && !m.triedKickboxing,
      w: 10,
      texts: [
        'ミット打ちが思った以上に楽しくて、汗をかきながら夢中になりました。',
        'ミット打ちは初挑戦でしたが、爽快感がすごくてやみつきになりそうです。',
        'ミット打ちを初めて体験しました。予想以上の充実感でした。',
      ],
    },
    {
      id: 'SC04',
      topics: ['hiit', 'strength'],
      cond: (m) => m.triedHIIT && m.triedStrength,
      w: 10,
      texts: [
        'HIITと筋力トレーニングを体験しましたが、全身しっかり動かせて達成感がありました。',
        'HIITや筋力トレーニングを取り入れたトレーニングで、しっかり追い込めました。',
      ],
    },
    {
      id: 'SC05',
      topics: ['hiit'],
      cond: (m) => m.triedHIIT && !m.triedStrength,
      w: 10,
      texts: [
        'HIITはきつかったですが、終わった後の達成感が気持ちよかったです。',
        'HIITでしっかり追い込めて、体が変わりそうな実感がありました。',
        'HIITは初めてでしたが、効率よく全身を動かせる感じがしました。',
      ],
    },
    {
      id: 'SC06',
      topics: ['semiPersonal'],
      cond: (m) => m.triedSemiPersonal,
      w: 10,
      texts: [
        'セミパーソナル形式で、しっかり見てもらいながら自分のペースで取り組めました。',
        '少人数のセミパーソナルトレーニングで、丁寧に指導してもらえました。',
        'セミパーソナルトレーニングを体験しました。集団レッスンより細かく見てもらえた印象でした。',
      ],
    },
    {
      id: 'SC07',
      topics: ['kickboxing', 'hiit'],
      cond: (m) => m.triedKickboxing && m.triedHIIT,
      w: 9,
      texts: [
        'キックボクシングとHIITを組み合わせたトレーニングで、全身をしっかり動かせました。',
        'キックボクシングもHIITも初体験でしたが、どちらも楽しくてあっという間でした。',
        'キックボクシングとHIITを体験しましたが、予想以上に充実した内容でした。',
        'キックボクシングとHIITを組み合わせた内容で、全身くまなく動かせた気がしました。',
      ],
    },
    {
      id: 'SC08',
      topics: ['strength'],
      cond: (m) => m.triedStrength && !m.triedHIIT && !m.triedSemiPersonal,
      w: 8,
      texts: [
        '筋力トレーニングを正しいフォームで教えてもらいながら取り組めました。',
        '筋力トレーニングに取り組みました。フォームから丁寧に教えてもらえました。',
        '筋力トレーニングでは基本的なフォームから教えてもらえてよかったです。',
        '筋力トレーニングを体験しましたが、一つひとつ丁寧に指導してもらえました。',
      ],
    },
    {
      id: 'SC09',
      topics: ['fun'],
      cond: (m) => m.wasFun && !m.triedKickboxing && !m.triedMituchi,
      w: 6,
      texts: [
        'トレーニング内容が楽しくて、気づいたら夢中になっていました。',
        '思っていた以上にバラエティ豊かで楽しいトレーニングでした。',
        '普段とは全然違う動きが多くて、楽しく体を動かせました。',
        '楽しみながらトレーニングできたので、あっという間に時間が過ぎました。',
        'こんなに楽しくトレーニングできるとは思っていなかったので、嬉しかったです。',
      ],
    },
    {
      id: 'SC10',
      topics: ['sweat'],
      cond: (m) => m.bigSweat && !m.triedKickboxing && !m.triedHIIT,
      w: 6,
      texts: [
        'しっかり汗をかいて、充実したトレーニングになりました。',
        '想像以上にしっかり汗をかけて、体を動かした実感がありました。',
        'たっぷり汗をかけて、体を動かした感覚がとても気持ちよかったです。',
        'こんなに汗をかいたのは久しぶりで、終わった後の達成感がありました。',
      ],
    },
    {
      id: 'SC11',
      topics: ['achievement'],
      cond: (m) => m.achievementFeel && !m.triedHIIT && !m.triedKickboxing,
      w: 6,
      texts: [
        'トレーニングは簡単ではなかったですが、終わった後の達成感がありました。',
        '最後まで頑張れて、やり終えた充実感がありました。',
        '内容はきつかったですが、最後まで完走できて達成感がありました。',
        'きつかった分、終わった後の充実感がとても大きかったです。',
      ],
    },
    {
      id: 'SC12',
      topics: ['neverBored'],
      cond: (m) => m.neverBored,
      w: 7,
      texts: [
        '内容がバラエティ豊かで飽きずに最後まで取り組めました。',
        'トレーニングの種類が多くて飽きる暇がなかったです。',
        '次々と内容が変わるので飽きずに最後まで楽しめました。',
        '色々な種類のトレーニングがあって、全然飽きない内容でした。',
      ],
    },
    {
      id: 'SC13',
      topics: ['kickboxing', 'semiPersonal'],
      cond: (m) => m.triedKickboxing && m.triedSemiPersonal,
      w: 9,
      texts: [
        'キックボクシングをセミパーソナル形式で体験しました。個別に見てもらえながら楽しく動けました。',
        'セミパーソナルでキックボクシングを体験し、きちんとフォームを教えてもらえました。',
        'セミパーソナル形式でキックボクシングを体験でき、丁寧に見てもらえてよかったです。',
        'キックボクシングをセミパーソナルで体験しましたが、個別対応してもらえて安心でした。',
      ],
    },
    {
      id: 'SC14',
      topics: [],
      cond: (m) => true,
      w: 3,
      texts: [
        'トレーニングに参加しました。充実した内容でした。',
        '実際に体験してみて、想像以上によかったです。',
        'トレーニングを体験してみて、思っていた以上に充実していました。',
        '実際に参加してみると、想像よりずっと楽しかったです。',
      ],
    },
  ];

  // ======================================================
  // [3] 雰囲気・トレーナーチャンク (15種類)
  // 少人数制・スタッフ・雰囲気について
  // ======================================================
  const ATMOSPHERE_CHUNKS = [
    {
      id: 'AC01',
      topics: ['smallGroup', 'trainerBeginner'],
      cond: (m) => m.smallGroupGood && m.trainerBeginner,
      w: 10,
      texts: [
        '少人数制なので初心者でも馴染みやすく、トレーナーさんも一から丁寧に教えてくれました。',
        '人数が少ないのでトレーナーさんによく見てもらえて、初心者でも安心できました。',
        '少人数なのでトレーナーさんに一人ひとり丁寧に指導してもらえました。',
      ],
    },
    {
      id: 'AC02',
      topics: ['smallGroup', 'trainerForm'],
      cond: (m) => m.smallGroupGood && m.trainerForm,
      w: 10,
      texts: [
        '少人数だからこそ、フォームを細かくチェックしてもらえました。',
        '人数が少ないのでトレーナーさんに動きを細かく見てもらえてよかったです。',
        '少人数ならではで、動きのフォームを一つひとつ確認してもらえました。',
        '少人数制なので、フォームや姿勢をしっかり見てもらえて安心でした。',
      ],
    },
    {
      id: 'AC03',
      topics: ['smallGroup'],
      cond: (m) => m.smallGroupGood && !m.trainerBeginner && !m.trainerForm,
      w: 9,
      texts: [
        '少人数制なのでアットホームな雰囲気で、とても参加しやすかったです。',
        '少人数なので質問しやすく、居心地がよかったです。',
        '少人数で参加できるスタイルが自分には合っていました。',
      ],
    },
    {
      id: 'AC04',
      topics: ['together', 'friend'],
      cond: (m) => m.togetherGood || m.hasFriend,
      w: 9,
      texts: [
        'みんなで一緒に頑張れる雰囲気が、一人ではなかなか出ないモチベーションを引き出してくれました。',
        '周りの人と一緒に運動する楽しさがあって、自然と頑張れました。',
        '一緒に頑張れる仲間がいることで、いつもより力が出た気がします。',
      ],
    },
    {
      id: 'AC05',
      topics: ['trainerKind'],
      cond: (m) => m.trainerKind && !m.trainerBeginner,
      w: 10,
      texts: [
        'トレーナーさんがとても優しく教えてくれて、安心して参加できました。',
        'スタッフの方が親切で、居心地よく過ごせました。',
        'トレーナーさんが丁寧で明るくて、緊張がすぐにほぐれました。',
      ],
    },
    {
      id: 'AC06',
      topics: ['trainerEncourage'],
      cond: (m) => m.trainerEncourage,
      w: 10,
      texts: [
        'トレーナーさんが励ましてくれたので、きつい場面でも最後まで頑張れました。',
        'きつい時も「あと少し！」と声をかけてもらえて、気持ちよく乗り越えられました。',
        '声がけが上手で、どんどんモチベーションが上がりました。',
      ],
    },
    {
      id: 'AC07',
      topics: ['trainerTalkable'],
      cond: (m) => m.trainerTalkable,
      w: 9,
      texts: [
        'トレーナーさんが話しやすくて、気軽に質問できる雰囲気でした。',
        'スタッフさんが気さくで話しやすく、なんでも聞きやすかったです。',
        'トレーナーさんがフレンドリーで、気になることを気軽に相談できました。',
        'スタッフさんがとても親しみやすくて、わからないことをすぐ聞けました。',
      ],
    },
    {
      id: 'AC08',
      topics: ['trainerCustom'],
      cond: (m) => m.trainerCustom,
      w: 10,
      texts: [
        '自分のペースに合わせてサポートしてもらえたので、無理なく取り組めました。',
        '一人ひとりの状態に合わせてくれるので、体力に自信がなくても大丈夫でした。',
        'ペースを調整してもらえたので、無理なく楽しめました。',
      ],
    },
    {
      id: 'AC09',
      topics: ['trainerClear'],
      cond: (m) => m.trainerClear && !m.trainerKind && !m.trainerBeginner,
      w: 8,
      texts: [
        'トレーナーさんの説明がわかりやすくて、迷わず取り組めました。',
        '動き方の説明がとても丁寧でわかりやすかったです。',
        'トレーナーさんの指示が明確でわかりやすく、スムーズに動けました。',
        '説明がわかりやすくて、初めての動きでも迷わず取り組めてよかったです。',
      ],
    },
    {
      id: 'AC10',
      topics: ['smallGroup', 'trainerEncourage'],
      cond: (m) => m.smallGroupGood && m.trainerEncourage,
      w: 9,
      texts: [
        '少人数なのでトレーナーさんにしっかり見てもらえて、励ましてもらいながら頑張れました。',
        '人数が少ないのでスタッフさんと距離が近く、アットホームで温かい雰囲気でした。',
        '少人数のおかげでトレーナーさんが近くにいてくれて、励ましの声がうれしかったです。',
        '少人数で距離が近いので、トレーナーさんの声がけが自然と頑張る力になりました。',
      ],
    },
    {
      id: 'AC11',
      topics: ['trainerBeginner'],
      cond: (m) => m.trainerBeginner && !m.smallGroupGood,
      w: 10,
      texts: [
        'トレーナーさんが初心者でも安心できるよう、丁寧に一から教えてくれました。',
        '初めてでも置いてけぼりにならず、しっかりサポートしてもらえました。',
        '初心者の自分にも合わせて丁寧に指導してくれました。',
      ],
    },
    {
      id: 'AC12',
      topics: ['trainerForm'],
      cond: (m) => m.trainerForm && !m.smallGroupGood,
      w: 8,
      texts: [
        'フォームを細かく確認してもらえたので、正しい動きで取り組めました。',
        '動きのポイントを一つ一つ丁寧に教えてもらえました。',
        'フォームのチェックをしっかりしてもらえて、正しい動きを身につけられました。',
        '動きのコツを丁寧に教えてもらえたので、自信を持って取り組めました。',
      ],
    },
    {
      id: 'AC13',
      topics: [],
      cond: (m) => true,
      w: 3,
      texts: [
        'スタッフの対応が丁寧で、居心地のいい空間でした。',
        '雰囲気がよくて、気持ちよく体を動かせました。',
        'スタッフさんの対応がとても丁寧で、終始リラックスできました。',
        '全体的に雰囲気がよくて、初めての来店でも居心地よく過ごせました。',
      ],
    },
  ];

  // ======================================================
  // [4] 運動後の感想チャンク (15種類)
  // 体験後の気持ち・身体の変化
  // ======================================================
  const AFTER_CHUNKS = [
    {
      id: 'AFC01',
      topics: ['refresh', 'achievement'],
      cond: (m) => m.refresh && m.achievementFeel,
      w: 10,
      texts: [
        '運動後はスッキリして、やり切った達成感がありました。',
        '終わった後はしっかりスッキリして、達成感がよかったです。',
        '気持ちのよいスッキリ感と達成感で、運動した甲斐がありました。',
      ],
    },
    {
      id: 'AFC02',
      topics: ['refresh', 'wantReturn'],
      cond: (m) => m.refresh && m.wantReturn,
      w: 10,
      texts: [
        '終わった後にスッキリして、帰り際にはまた来たいと思っていました。',
        '運動後は気持ちよくスッキリできて、次もまた来ようと思いました。',
        '帰り道もずっとスッキリ感が続いていて、また来たいと思いました。',
      ],
    },
    {
      id: 'AFC03',
      topics: ['refresh'],
      cond: (m) => m.refresh && !m.achievementFeel && !m.wantReturn,
      w: 9,
      texts: [
        '運動後はとてもスッキリしました。',
        '終わった後のスッキリ感がよかったです。',
        '全身しっかり動かして、気持ちのいいスッキリ感がありました。',
      ],
    },
    {
      id: 'AFC04',
      topics: ['fun', 'canContinue'],
      cond: (m) => m.funAfter && m.canContinue,
      w: 10,
      texts: [
        'こんなに楽しく運動できたのは久しぶりで、これなら続けられそうだと思いました。',
        '運動がこんなに楽しいと思えたのは初めてかもしれません。これなら続けられそうです。',
        '楽しく運動できたので、また来ようという気持ちが自然と湧いてきました。',
      ],
    },
    {
      id: 'AFC05',
      topics: ['stressRelief'],
      cond: (m) => m.stressRelief,
      w: 10,
      texts: [
        'ストレスが一気に吹き飛んだ感じで、すごくスッキリしました。',
        '頭の中のモヤモヤが吹き飛んで、スッキリした気分で帰れました。',
        '運動でこんなにストレスが発散できるとは思っていませんでした。',
      ],
    },
    {
      id: 'AFC06',
      topics: ['wantReturn'],
      cond: (m) => m.wantReturn && !m.refresh && !m.funAfter,
      w: 9,
      texts: [
        '帰り際には「また来たい」という気持ちが自然と出てきていました。',
        '次の予約を入れたいくらい気に入りました。',
        '帰り道ずっと「また来よう」と思っていました。',
        '帰りながら次はいつ来ようかと考えていました。',
        '体験後に「またここに来たい」という気持ちが自然と湧いてきました。',
      ],
    },
    {
      id: 'AFC07',
      topics: ['sweat'],
      cond: (m) => m.goodSweat && !m.refresh,
      w: 9,
      texts: [
        'こんなに汗をかいたのは久しぶりで、体を動かした達成感がありました。',
        'たっぷり汗をかいて、運動した実感がありました。',
        'しっかり汗をかけて、すごく充実した気分でした。',
        '久しぶりにたっぷり汗をかいて、体を動かした満足感がありました。',
        '汗をかくことでこんなに気持ちよくなれると改めて感じました。',
      ],
    },
    {
      id: 'AFC08',
      topics: ['canContinue'],
      cond: (m) => m.canContinue && !m.funAfter && !m.refresh,
      w: 9,
      texts: [
        '無理なく続けられそうな雰囲気で、長く通えそうだと感じました。',
        'これなら定期的に通えそうだと思いました。',
        '無理のないペースで続けられそうです。',
        '自分のペースで続けられそうな環境で、長く通えると感じました。',
        '無理なく楽しく続けられそうなので、定期的に来ようと思いました。',
      ],
    },
    {
      id: 'AFC09',
      topics: ['achievement'],
      cond: (m) => m.achievementFeel && !m.refresh && !m.funAfter,
      w: 8,
      texts: [
        '終わった後の達成感がたまらなかったです。',
        'やり切った達成感がすごかったです。',
        '頑張れた達成感があって、清々しい気分でした。',
        '最後まで頑張れたことで、終わった後の達成感がとても大きかったです。',
        'やり終えた充実感と達成感で、清々しい気持ちになりました。',
      ],
    },
    {
      id: 'AFC10',
      topics: ['fun'],
      cond: (m) => m.funAfter && !m.canContinue && !m.stressRelief,
      w: 8,
      texts: [
        'こんなに楽しく運動できたのは久しぶりでした。',
        '運動がこんなに楽しいとは思っていませんでした。',
        '純粋に楽しくて、時間があっという間でした。',
        '久しぶりにこんなに楽しく体を動かせて、気分がよかったです。',
        '運動をこんなに楽しめるとは思っていなかったので、嬉しい驚きでした。',
      ],
    },
    {
      id: 'AFC11',
      topics: ['refresh', 'stressRelief'],
      cond: (m) => m.refresh && m.stressRelief,
      w: 10,
      texts: [
        '運動後はスッキリして、ストレスが一気に解消された感じでした。',
        '帰り道はストレスが消えてすごく清々しかったです。',
        '体を動かすことでこんなにストレスが解消できるとは思いませんでした。',
        '運動後のスッキリ感とともに、ストレスも一緒に吹き飛んだ気がしました。',
      ],
    },
    {
      id: 'AFC12',
      topics: [],
      cond: (m) => true,
      w: 3,
      texts: [
        '充実した時間でした。',
        '運動できてよかったです。',
        '気持ちよく体を動かせました。',
        '終わった後の気分がとてもよかったです。',
        '体を動かしてよかったと思える時間でした。',
      ],
    },
  ];

  // ======================================================
  // [5] 締めチャンク (12種類)
  // 推薦・継続意欲・一言まとめ
  // ======================================================
  const CLOSING_CHUNKS = [
    {
      id: 'CC01',
      topics: ['beginner_rec'],
      cond: (m) => m.isBeginner,
      w: 10,
      texts: [
        '運動が初めての方や久しぶりの方でも安心して参加できると思います。',
        '初心者でも参加しやすいので、運動に自信がない方にもおすすめです。',
        '運動初心者の方にもとても入りやすいジムだと思います。',
      ],
    },
    {
      id: 'CC02',
      topics: ['alone_rec'],
      cond: (m) => m.hadAloneFail || m.had24hrFail,
      w: 10,
      texts: [
        '一人ではジムが続かないという方に特におすすめです。',
        '一人だと長続きしないという方にはぴったりのスタイルだと思います。',
        '一人での運動が続かなかった私でも、これなら続けられそうです。',
      ],
    },
    {
      id: 'CC03',
      topics: ['kickboxing_rec'],
      cond: (m) => m.triedKickboxing || m.hasKickboxingPurpose,
      w: 9,
      texts: [
        'キックボクシングが気になっている方はぜひ一度体験してみてください。',
        '楽しく体を動かしたい方にキックボクシングはおすすめです。',
        'キックボクシングに興味がある方には特におすすめです。',
      ],
    },
    {
      id: 'CC04',
      topics: ['continue'],
      cond: (m) => m.canContinue || m.wantReturn,
      w: 9,
      texts: [
        'これから定期的に通っていきたいと思います。',
        '継続して通おうと思います。',
        'また来ます！',
      ],
    },
    {
      id: 'CC05',
      topics: ['friend_rec'],
      cond: (m) => m.hasFriend,
      w: 9,
      texts: [
        'また友達と一緒に来たいです。',
        '次は他の友達も誘いたいと思います。',
        '友達と一緒に通い続けようと思います。',
      ],
    },
    {
      id: 'CC06',
      topics: ['stress_rec'],
      cond: (m) => m.hasStress || m.stressRelief,
      w: 8,
      texts: [
        'ストレス発散をしたい方にもぴったりだと思います。',
        '思い切り汗をかきたい方にはおすすめです。',
        '思い切り体を動かしてストレスを発散したい方にはとても合っていると思います。',
        'ストレス解消のために運動したい方にはぜひおすすめしたいジムです。',
      ],
    },
    {
      id: 'CC07',
      topics: ['area_tenjin'],
      cond: (m) => m.areaTenjin,
      w: 9,
      texts: [
        '天神近くでジムを探している方にはとても便利な場所だと思います。',
        '天神エリアで運動したい方にはおすすめです。',
        '天神エリアでジムを探しているなら、アクセスもよくてとても通いやすいと思います。',
        '天神の近くにあるので、仕事帰りなどに立ち寄りやすくて便利でした。',
      ],
    },
    {
      id: 'CC08',
      topics: ['area_akasaka'],
      cond: (m) => m.areaAkasaka,
      w: 9,
      texts: [
        '赤坂近くでジムを探している方にもアクセスしやすいと思います。',
        '赤坂エリアで運動したい方にはおすすめです。',
        '赤坂エリアにお住まいの方やお勤めの方には通いやすいジムだと思います。',
        '赤坂近辺でジムを探している方には立地的にもとても便利です。',
      ],
    },
    {
      id: 'CC08b',
      topics: ['area_maizuru'],
      cond: (m) => m.areaMaizuru,
      w: 9,
      texts: [
        '舞鶴エリアでジムを探している方には通いやすい場所だと思います。',
        '舞鶴近くでジムを探している方にはアクセスしやすくておすすめです。',
        '舞鶴エリアにお住まいの方には便利な立地だと思います。',
        '舞鶴周辺でジムを探しているなら、ぜひ候補に入れてみてください。',
      ],
    },
    {
      id: 'CC08c',
      topics: ['area_fukuoka'],
      cond: (m) => m.areaFukuoka,
      w: 9,
      texts: [
        '福岡市内でジムを探している方にはおすすめです。',
        '福岡市内でキックボクシング系のジムを探している方にはぴったりだと思います。',
        '福岡でセミパーソナルジムを探しているなら、ここは雰囲気もよくておすすめです。',
        '福岡でジムを探している方には、ぜひ一度体験してみてほしいです。',
      ],
    },
    {
      id: 'CC09',
      topics: ['diet_rec'],
      cond: (m) => m.hasDiet,
      w: 8,
      texts: [
        'ダイエットしたい方にもいいジムだと思います。',
        '体を変えたい方にはとても合っているスタイルだと思います。',
        '体型が気になっている方には、楽しく続けられる場所だと思います。',
        'ダイエットや体型維持を目指している方にはおすすめのジムです。',
      ],
    },
    {
      id: 'CC10',
      topics: ['expensive_rec'],
      cond: (m) => m.hadExpensive,
      w: 9,
      texts: [
        'パーソナルジムの費用が気になっていた方にはちょうどいいスタイルだと思います。',
        'コスパよくトレーナーサポートを受けたい方に合っていると思います。',
        'パーソナルトレーニングの費用がネックだった方にはぴったりのスタイルです。',
        'コスパ良くトレーナーに見てもらいながら通いたい方にはおすすめです。',
      ],
    },
    {
      id: 'CC11',
      topics: [],
      cond: (m) => true,
      w: 3,
      texts: [
        'またぜひ来たいと思います。',
        'おすすめのジムです。',
        '来てよかったです。',
      ],
    },
  ];

  // ======================================================
  // 文章構成パターン (12種類)
  // ======================================================
  const COMPOSITION_PATTERNS = [
    { id: 'A', slots: ['intro', 'service', 'atmosphere', 'after'],    lengths: ['standard', 'long'] },
    { id: 'B', slots: ['service', 'intro', 'after', 'closing'],       lengths: ['standard', 'long'] },
    { id: 'C', slots: ['intro', 'service', 'after', 'closing'],       lengths: ['standard'] },
    { id: 'D', slots: ['intro', 'atmosphere', 'service', 'after'],    lengths: ['standard', 'long'] },
    { id: 'E', slots: ['service', 'atmosphere', 'after'],             lengths: ['short', 'standard'] },
    { id: 'F', slots: ['intro', 'service', 'closing'],                lengths: ['short'] },
    { id: 'G', slots: ['intro', 'atmosphere', 'after', 'closing'],    lengths: ['standard', 'long'] },
    { id: 'H', slots: ['service', 'after', 'closing'],                lengths: ['short', 'standard'] },
    { id: 'I', slots: ['intro', 'service', 'atmosphere', 'after', 'closing'], lengths: ['long'] },
    { id: 'J', slots: ['atmosphere', 'service', 'after'],             lengths: ['standard'] },
    { id: 'K', slots: ['intro', 'service', 'after'],                  lengths: ['short'] },
    { id: 'L', slots: ['service', 'atmosphere', 'closing'],           lengths: ['standard'] },
  ];

  const SLOT_CHUNKS = {
    intro:      INTRO_CHUNKS,
    service:    SERVICE_CHUNKS,
    atmosphere: ATMOSPHERE_CHUNKS,
    after:      AFTER_CHUNKS,
    closing:    CLOSING_CHUNKS,
  };

  // ======================================================
  // 意味カテゴリ抽出
  // ======================================================
  function extractMeanings(answers) {
    const p   = answers.purposes    || [];
    const str = answers.struggles   || [];
    const sv  = answers.services    || [];
    const imp = answers.impressions || [];
    const tr  = answers.trainer     || [];
    const af  = answers.afterFeel   || [];

    return {
      // 目的
      hasDiet:            p.includes('diet') || p.includes('bodyTone'),
      hasKickboxingPurpose: p.includes('kickboxing'),
      hasFriend:          p.includes('withFriend') || imp.includes('withFriend'),
      hasStress:          p.includes('stress'),
      hasExerciseHabit:   p.includes('habit') || p.includes('lackExercise'),
      hasHealth:          p.includes('health'),
      // 経験
      isBeginner:         answers.experience === 'beginner' || answers.experience === 'longAbsence',
      isVeryBeginner:     answers.experience === 'beginner',
      // 悩み
      hadAloneFail:       str.includes('aloneNoGood') || str.includes('gym24fail'),
      had24hrFail:        str.includes('gym24fail'),
      hadNoIdea:          str.includes('noIdea'),
      hadExpensive:       str.includes('expensive'),
      hadBoring:          str.includes('boring'),
      // サービス
      triedKickboxing:    sv.includes('kickboxing'),
      triedMituchi:       sv.includes('mituchi'),
      triedHIIT:          sv.includes('hiit'),
      triedStrength:      sv.includes('strength'),
      triedSemiPersonal:  sv.includes('semiPersonal'),
      // 印象
      wasFun:             imp.includes('fun') || imp.includes('kickboxingFun') || af.includes('fun'),
      smallGroupGood:     imp.includes('smallGroup'),
      achievementFeel:    imp.includes('achievement') || af.includes('achievement'),
      bigSweat:           imp.includes('sweat') || af.includes('goodSweat'),
      togetherGood:       imp.includes('together') || imp.includes('withFriend'),
      neverBored:         imp.includes('neverBored'),
      // トレーナー
      trainerGood:        tr.length > 0 && !tr.includes('none'),
      trainerKind:        tr.includes('kind') || tr.includes('beginnerOk'),
      trainerBeginner:    tr.includes('beginnerOk'),
      trainerCustom:      tr.includes('custom'),
      trainerEncourage:   tr.includes('encourage'),
      trainerForm:        tr.includes('form'),
      trainerTalkable:    tr.includes('talkable'),
      trainerClear:       tr.includes('clear'),
      // 運動後
      refresh:        af.includes('refresh'),
      achievementAfter: af.includes('achievement'),
      funAfter:       af.includes('fun'),
      stressRelief:   af.includes('stressRelief'),
      wantReturn:     af.includes('wantReturn'),
      canContinue:    af.includes('canContinue'),
      goodSweat:      af.includes('goodSweat'),
      // エリア
      hasArea:        answers.area && answers.area !== 'noArea',
      areaTenjin:     answers.area === 'tenjin',
      areaAkasaka:    answers.area === 'akasaka',
      areaMaizuru:    answers.area === 'maizuru',
      areaFukuoka:    answers.area === 'fukuoka',
    };
  }

  // ======================================================
  // シード付き乱数生成
  // ======================================================
  function createRNG(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  // ======================================================
  // 文章量の決定
  // ======================================================
  function determineLength(answers) {
    const total =
      (answers.purposes    || []).length +
      (answers.struggles   || []).length +
      (answers.services    || []).length +
      (answers.impressions || []).length +
      (answers.trainer     || []).length +
      (answers.afterFeel   || []).length;
    if (total <= 5)  return 'short';
    if (total <= 11) return 'standard';
    return 'long';
  }

  // ======================================================
  // チャンク選択（重み付き + トピック重複回避）
  // ======================================================
  function selectChunk(chunks, meanings, rng, usedTopics, excludeIds) {
    const eligible = chunks.filter(c => {
      if (excludeIds.has(c.id)) return false;
      if (!c.cond(meanings)) return false;
      // 主要トピックが既に使われているか確認
      const newTopics = c.topics.filter(t => !usedTopics.has(t));
      return c.w < 5 || newTopics.length > 0; // 低優先度は常に使用可
    });

    if (eligible.length === 0) {
      // トピック縛りを外して再挑戦
      const any = chunks.filter(c => !excludeIds.has(c.id) && c.cond(meanings));
      if (any.length === 0) return null;
      return weightedPick(any, rng);
    }
    return weightedPick(eligible, rng);
  }

  function weightedPick(items, rng) {
    const total = items.reduce((s, i) => s + i.w, 0);
    let r = rng() * total;
    for (const item of items) {
      r -= item.w;
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  }

  function getChunkText(chunk, rng) {
    const texts = chunk.texts;
    return texts[Math.floor(rng() * texts.length)];
  }

  // ======================================================
  // 口コミ生成
  // ======================================================
  function generate(answers, seed) {
    const rng      = createRNG(seed !== undefined ? seed : (Date.now() + Math.random() * 1e9) | 0);
    const meanings = extractMeanings(answers);
    const length   = determineLength(answers);

    // 対応する構成パターンを絞り込み
    const eligible = COMPOSITION_PATTERNS.filter(p => p.lengths.includes(length));
    const pattern  = eligible[Math.floor(rng() * eligible.length)];

    const usedChunkIds = new Set();
    const usedTopics   = new Set();
    const textParts    = [];

    for (const slot of pattern.slots) {
      const chunk = selectChunk(SLOT_CHUNKS[slot], meanings, rng, usedTopics, usedChunkIds);
      if (!chunk) continue;
      usedChunkIds.add(chunk.id);
      chunk.topics.forEach(t => usedTopics.add(t));
      textParts.push(getChunkText(chunk, rng));
    }

    // 自由記述を末尾に付加
    if (answers.freeText && answers.freeText.trim().length > 0) {
      let free = answers.freeText.trim();
      if (!/[。！!]$/.test(free)) free += '。';
      textParts.push(free);
    }

    const text      = textParts.join('');
    const chunkKey  = [...usedChunkIds].sort().join('_');
    const structKey = `${pattern.id}__${chunkKey}`;

    return { text, patternId: pattern.id, structKey, seed, length };
  }

  // ======================================================
  // 公開インターフェース
  // ======================================================
  return {
    generate,
    extractMeanings,
    COMPOSITION_PATTERNS,
  };

})();
