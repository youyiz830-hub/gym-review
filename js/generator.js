// ========================================================
// GYM脈 口コミ生成エンジン（ナラティブパターン方式）
// ルールベース生成：有料AI API不使用、ランニングコスト0円
// ========================================================

const REVIEW_GENERATOR = (() => {

  // ======================================================
  // RNG（xorshift32）
  // ======================================================
  function createRNG(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  // ======================================================
  // variant tracker 付きの pickV
  // インデックスを trace.v に push する
  // ======================================================
  function makePick(rng, trace) {
    return function pickV(arr) {
      const idx = Math.floor(rng() * arr.length);
      trace.v.push(idx);
      return arr[idx];
    };
  }

  // ======================================================
  // 意味カテゴリ抽出
  // ======================================================
  function extractMeanings(answers) {
    const pur  = answers.purposes      || [];
    const prev = answers.prevSituation || [];
    const svc  = answers.services      || [];
    const how  = answers.howItWas      || [];
    const uniq = answers.uniquePoints  || [];
    const tr   = answers.trainer       || [];
    const af   = answers.afterFeel     || [];

    return {
      // 目的
      hasDiet:              pur.includes('diet') || pur.includes('bodyTone'),
      hasStress:            pur.includes('stress'),
      hasKickboxingPurpose: pur.includes('kickboxing'),
      hasFriend:            pur.includes('withFriend'),
      hasHabit:             pur.includes('habit'),
      hasHealth:            pur.includes('health') || pur.includes('lackExercise'),

      // 来店前状況
      neverExercised:    prev.includes('neverExercised'),
      had24hrFail:       prev.includes('gym24fail'),
      aloneNoGood:       prev.includes('aloneNoGood'),
      dontKnowWhat:      prev.includes('dontKnowWhat'),
      personalExpensive: prev.includes('personalExpensive'),
      boredSolo:         prev.includes('boredSoloGym'),
      wasLongAbsence:    prev.includes('longAbsence'),

      // beginner判定
      isBeginner: prev.includes('neverExercised') || prev.includes('longAbsence'),

      // 初めての気持ち
      wasNervous:  answers.firstFeel === 'nervous' || answers.firstFeel === 'worried' || answers.firstFeel === 'worriedKeepUp',
      wasExcited:  answers.firstFeel === 'excited',
      firstFeelOk: answers.firstFeel === 'noProblem',

      // 体験サービス
      didKickboxing:   svc.includes('kickboxing'),
      didMituchi:      svc.includes('mituchi'),
      didHIIT:         svc.includes('hiit'),
      didStrength:     svc.includes('strength'),
      didSemiPersonal: svc.includes('semiPersonal'),

      // 実際にやってみて
      moreFunThanExpected: how.includes('moreFunThanExpected'),
      bigSweat:            how.includes('bigSweat'),
      timeFlew:            how.includes('timeFlew'),
      couldKeepUp:         how.includes('couldKeepUp'),
      toughButFun:         how.includes('toughButFun'),
      betterThanAlone:     how.includes('betterThanAlone'),
      goodWithFriend:      how.includes('goodWithFriend'),

      // GYM脈ならでは
      smallGroupGood:   uniq.includes('smallGroupGood'),
      trainerNearby:    uniq.includes('trainerNearby'),
      notAlone:         uniq.includes('notAlone'),
      kickboxingAvail:  uniq.includes('kickboxingAvail'),
      beginnerFriendly: uniq.includes('beginnerFriendly'),
      easierToContinue: uniq.includes('easierToContinue'),
      notIntimidating:  uniq.includes('notIntimidating'),

      // トレーナー
      trainerGood:      tr.length > 0,
      trainerKind:      tr.includes('kind') || tr.includes('beginnerOk'),
      trainerBeginnerOk:tr.includes('beginnerOk'),
      trainerMyPace:    tr.includes('myPace'),
      trainerEncourage: tr.includes('encourage'),
      trainerForm:      tr.includes('form'),
      trainerTalkable:  tr.includes('talkable'),
      trainerClear:     tr.includes('clear'),

      // 運動後
      refresh:      af.includes('refresh'),
      achievement:  af.includes('achievement'),
      funAfter:     af.includes('fun'),
      stressRelief: af.includes('stressRelief'),
      wantReturn:   af.includes('wantReturn'),
      canContinue:  af.includes('canContinue'),
      goodSweat:    af.includes('goodSweat'),

      // エリア
      areaTenjin:  answers.area === 'tenjin',
      areaAkasaka: answers.area === 'akasaka',
      areaMaizuru: answers.area === 'maizuru',
      areaFukuoka: answers.area === 'fukuoka',
      hasArea:     answers.area && answers.area !== 'noArea',

      // 回答充実度
      richness:
        pur.length + prev.length + svc.length +
        how.length + uniq.length + tr.length + af.length,
    };
  }

  // ======================================================
  // 文章量ティア決定（RNG込み）
  // ======================================================
  function determineLength(m, rng, hasFreeText) {
    const r = m.richness;
    let tier;
    if (r <= 3) {
      tier = rng() < 0.5 ? 'micro' : 'short';
    } else if (r <= 6) {
      tier = rng() < 0.5 ? 'short' : 'standard';
    } else if (r <= 10) {
      tier = rng() < 0.7 ? 'standard' : 'long';
    } else if (r <= 15) {
      tier = rng() < 0.6 ? 'long' : 'standard';
    } else {
      tier = rng() < 0.5 ? 'long' : 'detailed';
    }

    // freeTextあり → 一段階アップ
    if (hasFreeText) {
      const up = { micro: 'short', short: 'standard', standard: 'long', long: 'detailed', detailed: 'detailed' };
      tier = up[tier];
    }
    return tier;
  }

  // ======================================================
  // 共通センテンス素材
  // ======================================================

  // エリア表現
  function areaPhrase(m, pick) {
    if (m.areaTenjin)  return pick(['天神周辺で', '天神エリアで', '天神近くで']);
    if (m.areaAkasaka) return pick(['赤坂周辺で', '赤坂エリアで', '赤坂の近くで']);
    if (m.areaMaizuru) return pick(['舞鶴周辺で', '舞鶴エリアで', '舞鶴近くで']);
    if (m.areaFukuoka) return pick(['福岡市内で', '福岡で', '市内で']);
    return '';
  }

  // 目的フレーズ
  function purposeReason(m, pick) {
    if (m.hasDiet)
      return pick(['ダイエット目的で', '体を引き締めたくて', '痩せたくて', 'ダイエットのために']);
    if (m.hasStress)
      return pick(['ストレスを発散したくて', '思い切り動ける場所を探していて', '汗をかいてリフレッシュしたくて']);
    if (m.hasKickboxingPurpose)
      return pick(['キックボクシングに興味があって', 'キックボクシングをやってみたくて', '前からキックが気になっていて']);
    if (m.hasHabit)
      return pick(['運動習慣をつけたくて', '定期的に体を動かしたくて', '運動を習慣化したくて']);
    if (m.hasHealth)
      return pick(['運動不足が気になっていて', '健康のために何か始めたくて', '体力をつけたくて']);
    return pick(['何か運動を始めたくて', 'ジムを探していて', '気になっていて']);
  }

  // 来た経緯
  function cameAction(pick) {
    return pick(['来てみました', '試してみました', '思い切って来てみました', '体験に来ました', '参加してみました']);
  }

  // 体験サービス表現
  function serviceDidPhrase(m, pick) {
    if (m.didKickboxing && m.didMituchi)
      return pick([
        'キックボクシングとミット打ちを体験しました',
        'キックボクシングでミット打ちまでやらせてもらいました',
        'パンチとキックからミット打ちまで一通り教わりました',
        '打撃の基礎からミットを叩くところまで経験できました',
        'グローブをつけてキックとミット打ちに挑戦しました',
      ]);
    if (m.didKickboxing && m.didHIIT)
      return pick([
        'キックボクシングとHIITを体験しました',
        'キックとHIITを組み合わせたメニューでした',
        '打撃系と高強度インターバルの両方に取り組みました',
        'キックボクシングのあとに短時間の全身運動まで受けました',
      ]);
    if (m.didKickboxing)
      return pick([
        'キックボクシングを初めて体験しましたが、思った以上に楽しくてかなり汗をかけました',
        'キックボクシングに初挑戦しましたが、こんなに全身を使える運動だとは知りませんでした',
        '初めてキックボクシングをやってみましたが、動きを覚える楽しさがありました',
        'キックボクシングを体験して、集中して体を動かす充実感がよかったです',
        'キックボクシングがこんなに爽快だとは思っていませんでした',
        'キックボクシングは想像以上に頭も使う運動で、夢中になってしまいました',
        '格闘技系は未経験でしたが、キックボクシングは動きが楽しくて全力で取り組めました',
        'キックボクシングって有酸素運動としても優秀なんですね。全身がしっかり動きました',
        '初めてのキックボクシングで緊張しましたが、気づいたら夢中で体を動かしていました',
        'キックボクシングを体験して、日常では使わない筋肉を全部使った感じがしました',
      ]);
    if (m.didMituchi)
      return pick([
        'ミット打ちを体験しました',
        'ミット打ちに初挑戦しました',
        'ミットを叩く感触が病みつきになりそうでした',
        'パンチをミットに当てる感覚が新鮮でした',
        '構えから教わってミットを打ち込みました',
      ]);
    if (m.didHIIT && m.didStrength)
      return pick([
        'HIITと筋力トレーニングを体験しました',
        'HIITと筋トレを組み合わせたメニューに取り組みました',
        '高強度の有酸素と筋トレを一通り経験できました',
        '全身を追い込むメニューと筋力メニューの両方を受けました',
      ]);
    if (m.didHIIT)
      return pick([
        'HIITに取り組みました',
        'HIITを体験しました',
        '短時間で心拍を上げるメニューを受けました',
        '高強度インターバルで一気に体を追い込みました',
        'HIIT形式のメニューに初めて挑戦しました',
      ]);
    if (m.didStrength)
      return pick([
        '筋力トレーニングを体験しました',
        '筋トレのやり方を一から教えてもらいました',
        '基本的なウェイト種目に取り組みました',
        'マシンや自重を使ったメニューを受けました',
      ]);
    if (m.didSemiPersonal)
      return pick([
        'セミパーソナルのトレーニングを体験しました',
        'セミパーソナル形式で指導を受けました',
        '少人数のパーソナル形式で見てもらいました',
      ]);
    return pick(['トレーニングを体験しました', 'メニューに取り組みました', '一通りの運動プログラムを受けました']);
  }

  // 感想（1文・完全文で返す）
  function lightImpression(m, pick) {
    if (m.moreFunThanExpected && m.bigSweat)
      return pick(['思った以上に楽しくてかなりいい汗がかけました', '想像以上に楽しくて、終わった後はスッキリしました', '予想以上に動けて、気持ちよく汗をかけました']);
    if (m.moreFunThanExpected)
      return pick(['思った以上に楽しくて充実した時間でした', '想像以上に楽しめてよかったです', '予想していたよりずっと楽しかったです']);
    if (m.timeFlew && m.bigSweat)
      return pick(['かなり汗をかいていたら、気づいたら終わりの時間でした', '汗だくになっていたら、あっという間に終わっていました']);
    if (m.timeFlew)
      return pick(['夢中になっていたら、時間があっという間に過ぎていました', '気づいたらあっという間に終わっていて驚きました']);
    if (m.bigSweat)
      return pick(['かなりいい汗をかけて、終わった後はスッキリしました', '想像以上に汗をかいて、清々しい気分になりました', 'こんなに汗をかくとは思っていなかったので驚きました']);
    if (m.toughButFun)
      return pick(['キツいけど楽しくて、夢中で体を動かしていました', 'ハードでしたが終わった後の達成感がすごかったです', 'きつい中にも楽しさがあって、自然と頑張れました']);
    if (m.didKickboxing)
      return pick(['キックボクシングが楽しくて、気持ちよく体を動かせました', '初めてのキックボクシングでしたが、楽しく体験できました']);
    if (m.didHIIT)
      return pick(['HIITで全身を動かして、終わった後の達成感がよかったです', 'HIITは思ったより強度があって、いい運動になりました']);
    return pick([
      '想像していたより充実した時間で、楽しく体を動かせました',
      '気持ちよく体を動かせて、来てよかったと思いました',
      'まずはやってみてよかったです。雰囲気もよかったです',
      '普段使わない筋肉まで刺激できて新鮮でした',
      '集中して取り組めたので、短い時間でも満足感がありました',
      '予想以上にしっかり動くメニューで、やりがいがありました',
      'リズムよく動けて、意外にもあっさり馴染めました',
      '初めてのメニューでも戸惑わずに取り組めて嬉しかったです',
      '一つひとつの動きが新鮮で、気づけば夢中になっていました',
      '来る前のイメージを超える充実度で、来てよかったと感じました',
    ]);
  }

  // トレーナー表現
  function trainerPhrase(m, pick) {
    if (m.trainerForm && m.trainerKind)
      return pick([
        'トレーナーさんがフォームを丁寧に見てくれました',
        'スタッフさんが優しくフォームまで整えてくれました',
        'インストラクターの方が親身にフォームを教えてくれました',
        '姿勢の細かな部分まで優しく直してもらえました',
      ]);
    if (m.trainerForm)
      return pick([
        'フォームを一つひとつ見てもらえました',
        'フォームをしっかりチェックしてもらえました',
        '姿勢や動きの角度まで細かく確認してもらえました',
        '一回ごとに動きを修正してくれるのが助かりました',
        'ちょっとした体の向きまで直してもらえました',
      ]);
    if (m.trainerKind)
      return pick([
        'トレーナーさんが丁寧に教えてくれました',
        'スタッフさんが優しく接してくれました',
        'インストラクターの方が親身に指導してくれました',
        '気さくな方で、安心して質問できました',
        '声がけが温かくて、リラックスして取り組めました',
      ]);
    if (m.trainerEncourage)
      return pick([
        'トレーナーさんの声がけが力になりました',
        '励ましの声があって最後まで頑張れました',
        '応援してもらえると自然ともうひと踏ん張りできました',
        '前向きなコーチングでやる気が引き出されました',
      ]);
    if (m.trainerMyPace)
      return pick([
        '自分のペースに合わせてもらえました',
        'ペースを調整してくれて無理なくできました',
        '体力に合わせてメニューを変えてもらえました',
        '一人ひとりの状態を見ながら進めてくれました',
      ]);
    if (m.trainerClear)
      return pick([
        '説明が分かりやすかったです',
        '指示が明確で動きやすかったです',
        '何をするか毎回クリアに伝えてくれました',
        '動作のポイントが端的で頭に入りやすかったです',
      ]);
    if (m.trainerTalkable)
      return pick([
        'トレーナーさんが話しやすかったです',
        'スタッフさんが気さくで質問しやすい雰囲気でした',
        '世間話も交えてくれて緊張がほぐれました',
        'フランクな対応で遠慮なく聞けました',
      ]);
    if (m.trainerGood)
      return pick([
        'トレーナーさんの対応がよかったです',
        'スタッフさんの対応が丁寧でした',
        '接してくれる方が感じがよくて好印象でした',
        'サポート体制がしっかりしていて安心でした',
      ]);
    return '';
  }

  // 運動後感想
  function afterPhrase(m, pick) {
    if (m.refresh && m.achievement)
      return pick([
        '終わった後はスッキリして達成感がありました',
        '運動後は爽快感と充実感でいっぱいになりました',
        '汗と一緒にモヤモヤも流れて、やり切った気持ちになりました',
        '清々しさと手応えが同時に味わえました',
      ]);
    if (m.refresh && m.stressRelief)
      return pick([
        '運動後はスッキリして、ストレスも吹き飛びました',
        '帰り道はストレスが消えて清々しかったです',
        '心と体のモヤモヤが同時に晴れていきました',
        '発散できた上に気分までリフレッシュできました',
      ]);
    if (m.refresh)
      return pick([
        '終わった後はかなりスッキリしました',
        '運動後の爽快感が気持ちよかったです',
        '帰り道がすごく清々しかったです',
        '気分がすっかり晴れました',
        '体の重さが消えた感じがしました',
        '全身がほぐれた感覚が心地よかったです',
      ]);
    if (m.achievement)
      return pick([
        '体を動かした充実感がありました',
        '全身を使えた達成感がありました',
        'やり切った感があって満足でした',
        '最後までメニューをこなせた手応えが残りました',
      ]);
    if (m.stressRelief)
      return pick([
        'ストレスが吹き飛んで気分がよくなりました',
        'モヤモヤが消えて軽やかな気分になれました',
        '発散したい気持ちをしっかり解消できました',
        '抱えていたイライラが流れていきました',
      ]);
    if (m.goodSweat)
      return pick([
        '汗をかいてとても気持ちよかったです',
        '久しぶりにいい汗をかけました',
        '気持ちいい疲れが残りました',
        '汗ばむ感覚が心地よくて癖になりそうでした',
      ]);
    if (m.funAfter)
      return pick([
        '楽しく体を動かせました',
        'とても楽しい時間でした',
        '笑顔で過ごせる時間になりました',
        '気分が明るくなる時間でした',
      ]);
    return '';
  }

  // 継続意欲
  function closingPhrase(m, pick) {
    if (m.canContinue && m.wantReturn)
      return pick([
        'これなら続けられそうなので、また来ようと思います',
        'リピートしたいですし、長く通える気がしました',
        '無理なく続けられそうで、次回も楽しみです',
        '定期的に通っていきたいと感じました',
      ]);
    if (m.canContinue)
      return pick([
        'これなら続けていけそうです',
        '無理なく続けられそうだと感じました',
        '自分のペースで続けられそうです',
        '長く続けていけそうな手応えがあります',
        '習慣にしていけそうな予感がしました',
      ]);
    if (m.wantReturn)
      return pick([
        'また来ようと思います',
        'リピートしたいです',
        'また通いたいと思いました',
        '次回が楽しみです',
        'ぜひ再訪したいと思いました',
      ]);
    return pick([
      '続けていけそうな気がします',
      '定期的に通いたいと思いました',
      '自分に合っていると感じました',
      '習慣にしていきたいと思います',
      'もっと早く来ればよかったと感じました',
      'これから通い続けたいと思います',
      '気に入りました',
      '長く続けていけそうです',
      'ここに来て正解でした',
      'しばらくお世話になりたいと感じました',
      '次回も楽しみにしています',
      'とても満足のいく体験でした',
    ]);
  }

  // 少人数・GYM脈ならでは
  function uniquePhrase(m, pick) {
    if (m.smallGroupGood && m.trainerNearby)
      return pick(['少人数でトレーナーが近くにいるのが安心でした', '少人数だからトレーナーさんにしっかり見てもらえました']);
    if (m.smallGroupGood)
      return pick(['少人数なので見てもらいやすい雰囲気でした', '少人数制だから一人ひとり見てもらえる感じがしました']);
    if (m.notAlone)
      return pick(['一人でやらなくていいのが心強かったです', 'みんなで動く雰囲気で、一人よりずっと頑張れました']);
    if (m.beginnerFriendly)
      return pick(['運動初心者でも入りやすい雰囲気でした', '初心者でも気負わず参加できる感じでした']);
    if (m.notIntimidating)
      return pick(['パーソナルほど堅苦しくなくて気楽でした', '堅苦しさがなくて気軽に取り組めました']);
    if (m.easierToContinue)
      return pick(['普通のジムより続けやすそうだと感じました', '一般的なジムより継続しやすそうです']);
    if (m.trainerNearby)
      return pick(['トレーナーさんが近くにいてくれて心強かったです']);
    return '';
  }

  // 来店前状況
  function prevSituationPhrase(m, pick) {
    if (m.had24hrFail)
      return pick([
        '以前24時間ジムに入ったことがありましたが、一人では続きませんでした',
        '24時間ジムに通っていた時期がありますが、結局自分には向いていませんでした',
        '前に24時間ジムを契約したものの、なかなか行かなくなってやめてしまいました',
        '24時間ジムに入会したことがありましたが、一人で黙々とやるのが苦手で続かなかったです',
        '以前24時間ジムに登録しましたが、何をすればいいか分からなくて自然とフェードアウトしました',
      ]);
    if (m.aloneNoGood)
      return pick([
        '一人で運動が続かないのが自分の課題でした',
        'どうしても一人だと長続きしなくて悩んでいました',
        '一人でジムに行っても三日坊主になるのが分かっていました',
        '一人でやる運動が苦手で、いつも途中でやめてしまっていました',
        'ソロで運動を続けるのがどうにも苦手でした',
      ]);
    if (m.personalExpensive)
      return pick([
        'パーソナルは費用面でなかなか踏み出せずにいました',
        'パーソナルトレーニングは高くて迷っていました',
        '個別指導のジムは料金が気になって一歩踏み出せませんでした',
        'マンツーマンに興味はあったものの、価格でためらっていました',
        '完全個別のパーソナルは金額的に厳しいと感じていました',
      ]);
    if (m.dontKnowWhat)
      return pick([
        '何をすればいいか分からず悩んでいました',
        '運動の始め方が分からずにいました',
        'ジムに入っても何から手をつけるべきか判断できずにいました',
        '自己流でやる自信がなくて迷っていました',
        'メニューの組み方が分からず動けずにいました',
      ]);
    if (m.neverExercised)
      return pick([
        'ほとんど運動してこなかったので正直不安でした',
        '運動経験がほぼないので心配でした',
        '学生時代以来まともに体を動かしていなかったので緊張していました',
        'スポーツとは縁遠い生活をしてきたので、ついていけるか不安でした',
      ]);
    if (m.wasLongAbsence)
      return pick([
        '運動がかなり久しぶりでした',
        '体を動かすのが本当に久しぶりでした',
        'まともな運動は数年ぶりという状態でした',
        'ブランクがかなり長かったので心配していました',
      ]);
    if (m.boredSolo)
      return pick([
        '普通の筋トレだけだと飽きてしまうタイプでした',
        '黙々と同じ運動を繰り返すのが苦手でした',
        'マシンを一人で使うだけだとモチベーションが続きませんでした',
      ]);
    return '';
  }

  // 初めての気持ち
  function nervousPhrase(m, pick) {
    if (m.wasNervous)
      return pick(['最初は少し緊張していました', '参加前は不安もありました', 'ついていけるか不安でした']);
    if (m.wasExcited)
      return pick(['来る前からワクワクしていました', '当日が楽しみでした']);
    return '';
  }

  // ======================================================
  // ナラティブパターン定義
  // 各パターン: { id, tier, condition(m), build(m, pick, freeText) }
  // ======================================================
  const PATTERNS = [
    // --- MICRO (60-100字) ---
    {
      id: 'P01', tier: 'micro',
      condition: (m) => true,
      build: (m, pick, free) => {
        if (m.didKickboxing && m.bigSweat)
          return pick([
            'キックボクシングを初めて体験しましたが、思った以上に楽しくてかなり汗をかけました。',
            'キックボクシングがこんなに楽しいとは思っていませんでした。いい汗がかけてスッキリしました。',
            'ミット打ちが想像以上に爽快で夢中になりました。終わった後はとてもスッキリしました。',
            '初めてのキックボクシングで全身びしょびしょになるくらい動けて最高でした。',
            'パンチとキックで想像以上に汗ばみ、短時間でも手応え十分でした。',
            'グローブをつけての打撃練習が爽快で、気分がかなり晴れました。',
          ]);
        if (m.didKickboxing)
          return pick([
            'キックボクシングを初めて体験しましたが、思った以上に楽しくて充実した時間でした。',
            'キックボクシングがこんなに楽しいとは思っていませんでした。また来ようと思います。',
            '打撃系は初挑戦でしたが、気づけば夢中で動いていました。満足です。',
            '初めてグローブを装着しましたが、動きを覚えるのが楽しかったです。',
          ]);
        if (m.refresh && m.achievement)
          return pick([
            '久しぶりにこんなに汗をかきました。終わった後のスッキリ感と達成感がよかったです。',
            'かなりいい汗をかいて、終わった後はスッキリして達成感がありました。',
            '全身を使えた充実感と爽やかな気分が同時に味わえました。',
            'やり切った手応えと清々しさが残る時間でした。',
          ]);
        if (m.stressRelief)
          return pick([
            '思い切り体を動かしてストレスが吹き飛びました。また来ようと思います。',
            '全力で動いてストレスが発散できました。こういう運動が自分には合っていると感じました。',
            'モヤモヤを汗と一緒に発散できて、気持ちが軽くなりました。',
            '抱えていたイライラがきれいに流れていった感覚でした。',
          ]);
        if (m.hasFriend)
          return pick([
            '友達と一緒に参加しましたが、二人とも楽しくてかなり盛り上がりました。',
            '友人と一緒に体験しました。雰囲気がよくて、また来ようと思います。',
            '仲間と並んで取り組めて、笑いが絶えない時間になりました。',
            '友達を誘ってよかったです。二人で盛り上がりながら動けました。',
          ]);
        return pick([
          '楽しく体を動かせました。少人数の雰囲気もよくて、また来ようと思います。',
          '想像以上に充実した時間でした。終わった後のスッキリ感がよかったです。',
          'かなりいい汗をかけて、終わった後はスッキリしました。リピートしたいです。',
          '集中して取り組めて、短い時間でも満足度の高い体験でした。',
          '雰囲気が明るくて、終始気持ちよく動けました。来てよかったです。',
          'テンポよく進んで気づけば終了。心地よい疲れが残りました。',
          'メニューが新鮮で飽きずに最後まで動けました。来た甲斐がありました。',
        ]);
      },
    },

    // --- SHORT (100-160字) ---
    {
      id: 'P02', tier: 'short',
      condition: (m) => true,
      build: (m, pick, free) => {
        // 来店理由の文
        let opener;
        if (m.had24hrFail)       opener = pick([
          '以前24時間ジムに通っていましたが続かなかったので、別のスタイルを試してみました',
          '24時間ジムが続かなかった経験があって、こういうスタイルに興味を持ちました',
          'セルフ型のジムで挫折した経験があり、違うタイプを探していました',
        ]);
        else if (m.aloneNoGood)  opener = pick([
          '一人だと続かないタイプなので、みんなで動けるジムを探していて来てみました',
          '一人でジムが続かないのが悩みで、こういう形式を試してみました',
          'ソロでは三日坊主になるので、仲間と動ける場所を探していました',
        ]);
        else if (m.hasArea && m.hasDiet) opener = `${areaPhrase(m, pick)}ダイエットできるジムを探していて来てみました`;
        else if (m.hasArea)      opener = `${areaPhrase(m, pick)}通えるジムを探していて来てみました`;
        else if (m.hasDiet)      opener = pick([
          'ダイエットを始めようとジムを探していて来てみました',
          '体を引き締めたくて思い切って来てみました',
          '痩せたくてジムを探していました',
          'シェイプアップを目的にジム探しをしていました',
        ]);
        else if (m.hasKickboxingPurpose) opener = pick([
          '前からキックボクシングに興味があって体験に来ました',
          'キックボクシングをやってみたくて来てみました',
          '昔から格闘技に憧れていて、思い切って門を叩きました',
        ]);
        else if (m.hasStress)    opener = pick([
          'ストレス発散になる運動を探していて来てみました',
          '思い切り動ける場所を探していて試してみました',
          '仕事のモヤモヤを吹き飛ばしたくて予約しました',
        ]);
        else if (m.isBeginner)   opener = pick([
          '運動がほぼ初めてで不安でしたが、思い切って来てみました',
          'ジムはほとんど初めてでしたが、思い切って体験してみました',
          '運動経験ゼロに近い状態で、勇気を出して伺いました',
        ]);
        else                     opener = pick([
          '気になっていて思い切って来てみました',
          '体を動かしたくてジムを探していました',
          'ずっと気になっていたお店に、ようやく足を運びました',
          '何か新しい運動を始めたくて予約してみました',
        ]);

        // サービス+感想の文（短くまとめる）
        let expSent;
        if (m.didKickboxing && m.moreFunThanExpected)
          expSent = pick([
            'キックボクシングは初めてでしたが、思った以上に楽しくてかなり汗をかけました',
            'キックボクシングに初挑戦しましたが、想像以上に全身を使えて楽しかったです',
            '初めての打撃練習が予想を超えて面白く、ずっと集中していました',
            '格闘技系デビューでしたが、楽しさに驚いて夢中で動いていました',
          ]);
        else if (m.didKickboxing)
          expSent = pick([
            'キックボクシングは初めてでしたが、楽しく体験できました',
            'キックボクシングを体験して、気持ちよく体を動かせました',
            '初体験のキックでしたが、動きを覚える楽しさがありました',
            'ミットを叩く感触が新鮮で、集中して取り組めました',
          ]);
        else if (m.didHIIT && m.bigSweat)
          expSent = pick([
            'HIITを体験しましたが、かなりいい汗がかけてよかったです',
            'HIITに取り組んで、全身をしっかり動かせた達成感がありました',
            '短時間の高強度メニューで、汗だくになって気持ちよかったです',
            '心拍を上げるメニューを受けて、代謝が上がった感覚がありました',
          ]);
        else if (m.didStrength)
          expSent = pick([
            '筋力トレーニングを丁寧に教えてもらえて、一人でやるより全然いいと感じました',
            '筋トレを教えてもらいながら体験して、想像より充実していました',
            'ウェイト種目を基礎から教わり、自己流との差を感じました',
            'マシンの使い方まで丁寧に案内してもらい、安心して追い込めました',
          ]);
        else
          expSent = lightImpression(m, pick);

        const close = closingPhrase(m, pick) || pick([
          'また来ようと思います',
          'また通いたいと思いました',
          'リピートしたいです',
          '次回も予約を入れたくなりました',
          '素直に継続したいと感じました',
        ]);
        return `${opener}。${expSent}。${close}。`;
      },
    },
    {
      id: 'P03', tier: 'short',
      condition: (m) => m.didKickboxing || m.didHIIT || m.didStrength,
      build: (m, pick, free) => {
        let svcSurprise;
        if (m.didKickboxing && m.didMituchi)
          svcSurprise = pick([
            'キックボクシングでミット打ちまでやらせてもらいましたが、こんなに爽快だとは思っていませんでした',
            'ミット打ちが想像以上に気持ちよくて、夢中で体を動かしていました',
            'グローブをつけてミットを叩く感覚が新鮮で、気分がかなり晴れました',
            '打撃の基礎からミットまで一通り経験でき、短時間でも手応えがありました',
          ]);
        else if (m.didKickboxing)
          svcSurprise = pick([
            'キックボクシングは初めてでしたが、こんなに楽しいとは思っていませんでした',
            'キックボクシングを体験して、想像以上に全身を使えることに驚きました',
            '打撃練習が頭も使う運動だと知って、新鮮な体験になりました',
            '格闘技系に触れるのは初めてでしたが、ハマりそうな予感がしました',
          ]);
        else if (m.didHIIT)
          svcSurprise = pick([
            'HIITを体験しましたが、思った以上に強度があって、いい意味で驚きました',
            'HIITは思っていたより全身を使えて、かなりいい汗がかけました',
            '短時間でも心拍がしっかり上がる構成で、効率よく追い込めました',
            'インターバル形式のメニューが新鮮で、集中して動けました',
          ]);
        else
          svcSurprise = pick([
            '筋力トレーニングを教えてもらいましたが、フォームから丁寧に指導してもらえて、一人でやるより全然いいと感じました',
            '筋トレを体験して、ちゃんとした指導があるのとないのでは全然違うと思いました',
            'ウェイト種目の正しい姿勢を教わり、普段のやり方との差に驚きました',
            '基本動作から丁寧にレクチャーしてもらえ、効率よく鍛える方法を知れました',
          ]);

        const emo = (() => {
          if (m.refresh && m.stressRelief) return pick([
            '終わった後はスッキリして、ストレスも吹き飛んだ感じでした',
            '運動後はとても清々しくて、ストレスが発散できました',
            'モヤモヤが消えて、心も体も軽くなりました',
          ]);
          if (m.refresh) return pick([
            '終わった後はかなりスッキリしました',
            '汗をかいた後の爽快感がよかったです',
            '帰り道が清々しくて気分最高でした',
          ]);
          if (m.achievement) return pick([
            '終わった後の達成感が大きかったです',
            'やり切った達成感があって、また来ようと思いました',
            '走り切った手応えが心地よく残りました',
          ]);
          return pick([
            'とても充実した体験でした',
            'やってみてよかったと思います',
            '満足度の高い時間になりました',
            '来てよかったと感じられる内容でした',
          ]);
        })();
        return `${svcSurprise}。${emo}。`;
      },
    },
    {
      id: 'P04', tier: 'short',
      condition: (m) => m.wasNervous || m.isBeginner,
      build: (m, pick, free) => {
        const worry = pick([
          '最初は初心者でついていけるか不安でしたが',
          '参加前は正直緊張していましたが',
          'できるかどうか心配でしたが',
          '体力に自信がなくて不安だったのですが',
          '予約当日まで尻込みしていたのですが',
          '周りに迷惑をかけないか気がかりでしたが',
        ]);
        const relief = m.trainerGood
          ? pick([
              'トレーナーさんが丁寧に教えてくれて安心できました',
              'スタッフさんのサポートで気持ちよく取り組めました',
              '担当の方が常に気を配ってくれ、迷わず動けました',
              'インストラクターの方の声がけが優しくて緊張がほぐれました',
            ])
          : pick([
              '雰囲気がよくてすぐリラックスできました',
              '始まってみたらすぐに馴染めました',
              '店内の空気が明るくて気負わず入れました',
              '周りの方々も温かくて、肩の力が抜けました',
            ]);
        const emo = pick([
          `${m.didKickboxing ? 'キックボクシング' : 'トレーニング'}も楽しかったです`,
          '運動自体も楽しくてよかったです',
          '気づけば夢中になっていました',
          '取り組みに没頭でき満足でした',
          '思っていた以上に体が動いて嬉しかったです',
          '笑顔で終われる時間になりました',
        ]);
        return `${worry}、${relief}。${emo}。`;
      },
    },

    // --- STANDARD (160-240字) ---
    {
      id: 'P05', tier: 'standard',
      condition: (m) => true,
      build: (m, pick, free) => {
        // 文構造を先に選ぶ（structKeyに反映され構造ごとに独立したカウントになる）
        const tpl  = pick([0, 1, 2, 3]);
        const prev = prevSituationPhrase(m, pick) || pick([
          '運動不足が続いていて何かしなきゃと思っていました',
          '体を動かす機会がなくてもやもやしていました',
          'このままじゃまずいと感じて何か始めたくなっていました',
          '気になりつつもなかなか行動に移せずにいました',
          '最近体を動かせていなくて、このままでは不健康だと感じていました',
          '体力の衰えが気になり始めていました',
        ]);
        const svc  = serviceDidPhrase(m, pick);
        const impr = pick([
          '思った以上に楽しくてかなりいい汗がかけました',
          '予想以上に動けて達成感がありました',
          '想像以上に楽しくて時間を忘れました',
          '夢中になれる内容で、集中して取り組めました',
          '想定していた以上に体を使えて驚きました',
          '充実した内容でテンポよく動けました',
          '始めてみると体が自然とノってきて気持ちよかったです',
          '体を動かしながら没頭できる時間になりました',
          'こんなに全身を使える運動だとは思っていませんでした',
          '気づいたらかなりいいペースで動けていました',
        ]);
        const uniq = uniquePhrase(m, pick) || pick([
          '少人数なのでトレーナーさんにも見てもらえました',
          '周りの雰囲気もよくて取り組みやすかったです',
          '一緒に動く仲間がいる環境がちょうどよかったです',
          'アットホームな雰囲気で気負わず参加できました',
          'スタッフさんが近くにいてくれて安心でした',
          '和気あいあいとした空気感がよかったです',
          '初めてでも馴染みやすい雰囲気でした',
          '一人でやるよりずっと力が出ました',
        ]);
        const closing = closingPhrase(m, pick) || pick([
          'これなら続けられそうだと思いました',
          '通い続けていけそうな気がしています',
          '継続したいと素直に思えました',
          '生活の一部にできそうな手応えがありました',
        ]);
        if (tpl === 0) return `${prev}。実際に来てみると、${svc}。${impr}。${uniq}ので、${closing}。`;
        if (tpl === 1) return `${prev}。${svc}。${impr}。${uniq}し、${closing}。`;
        if (tpl === 2) return `${prev}。${svc}。${uniq}。${impr}し、${closing}。`;
        return `${prev}。${uniq}。${svc}。${impr}し、${closing}。`;
      },
    },
    {
      id: 'P06', tier: 'standard',
      condition: (m) => m.hasArea,
      build: (m, pick, free) => {
        const area = areaPhrase(m, pick);
        // 目的と来店理由（エリア情報も含む）
        let entryLine;
        if (m.hasDiet)   entryLine = `${area}ダイエットができるジムを探していて見つけました`;
        else if (m.hasKickboxingPurpose) entryLine = `${area}キックボクシングができるジムを探していて来てみました`;
        else if (m.hasStress) entryLine = `${area}ストレス発散になる運動を探していて来てみました`;
        else if (m.hasHealth) entryLine = `${area}通えるジムを探していて、運動不足解消のために来てみました`;
        else entryLine = `${area}通えるジムを探していて見つけました`;

        // 来店前の状況（あれば）
        const prevLine = (() => {
          if (m.had24hrFail)      return pick([
            '以前24時間ジムに通っていましたが続かなかったので、違うスタイルを探していました',
            '24時間ジムが続かなかった経験があって、少人数制に興味を持ちました',
            'セルフ型のジムで足が遠のいた経験があり、別の形を探していました',
          ]);
          if (m.aloneNoGood)      return pick([
            '一人だと続かないタイプなので、こういう形式が気になっていました',
            '一人でジムが長続きしないのが悩みで、みんなで動けるスタイルを探していました',
            'ソロでの運動が苦手で、仲間と動けるジムを探していました',
          ]);
          if (m.isBeginner)       return pick([
            '運動はほぼ初めてに近いので、最初は少し不安でした',
            'ジムは初めてに近かったので、ついていけるか心配でした',
            '経験がほとんどなく、できるか自信がないまま来ました',
          ]);
          return '';
        })();

        // サービス体験（目的と被らないよう調整）
        let svcLine;
        if (m.hasKickboxingPurpose && m.didKickboxing)
          svcLine = pick([
            '実際に体験してみると、思った以上に楽しくて夢中で動いていました',
            '体験してみると、想像以上に充実していてかなりいい汗がかけました',
            '動いてみて感じたのは、想像を超える爽快感と手応えでした',
          ]);
        else if (m.didKickboxing)
          svcLine = pick([
            'キックボクシングを体験しましたが、こんなに楽しいとは思っていませんでした',
            'キックボクシングは初めてでしたが、かなり楽しくて時間を忘れました',
            '打撃練習を初体験しましたが、集中して動けて爽快でした',
            '初めてのキックは新鮮で、動きを覚える過程までが面白かったです',
          ]);
        else
          svcLine = serviceDidPhrase(m, pick) + '。' + pick([
            '思った以上に動けて達成感がありました',
            '想像以上に充実した内容でした',
            '楽しく体を動かせてよかったです',
            '集中して取り組めて満足度が高かったです',
            '体をしっかり使えた充実感がありました',
            '予想以上に本格的な内容で驚きました',
            '短時間でもしっかり動けて達成感がありました',
            '体が温まって清々しい気持ちになりました',
          ]);

        const trainerLine = m.trainerGood ? trainerPhrase(m, pick) + '。' : '';
        const closing = closingPhrase(m, pick) || pick(['また来ようと思います', 'また通いたいと思いました', '継続したい気持ちになりました']);
        const parts = [entryLine + '。', prevLine ? prevLine + '。' : '', svcLine + '。', trainerLine, closing + '。'];
        return parts.filter(Boolean).join('');
      },
    },
    {
      id: 'P07', tier: 'standard',
      condition: (m) => m.had24hrFail,
      build: (m, pick, free) => {
        const past = pick([
          '以前24時間ジムに入ったことがありましたが、一人では全然続きませんでした',
          '前に24時間ジムに通っていたものの、一人だと長続きしませんでした',
          '過去にセルフ型のジムを契約しましたが、足が遠のいてしまいました',
          '24時間ジムを試した時期がありましたが、結局やめてしまった経験があります',
        ]);
        const here = pick([
          'ここは少人数でトレーナーさんが近くにいるので、一人でやるより頑張れます',
          'このジムは少人数で見てもらえるので、一人で黙々とやるより続けられそうです',
          'こちらはスタッフとの距離が近く、放置されずに進められる環境です',
          'ここはプログラム制で、仲間と一緒に動けるのが続きそうなポイントでした',
        ]);
        const svcShort = m.didKickboxing
          ? pick(['キックボクシングも楽しくて', 'キックも想像以上に楽しくて', '打撃練習も新鮮で', 'ミット打ちも爽快で'])
          : pick(['トレーニングも楽しくて', '内容も充実していて', 'プログラムも飽きずに取り組めて', 'メニューも手応えがあり']);
        const closing = pick([
          '続けていけそうな気がしています',
          'これなら続けられそうです',
          '今度こそ続けられそうです',
          '生活のリズムに組み込めそうな予感があります',
          'ようやく自分に合うジムに出会えた気がしました',
        ]);
        return `${past}。${here}。${svcShort}、${closing}。`;
      },
    },
    {
      id: 'P08', tier: 'standard',
      condition: (m) => m.aloneNoGood || m.notAlone || m.betterThanAlone,
      build: (m, pick, free) => {
        const prev = pick([
          '一人で運動が続かなくて悩んでいましたが',
          '一人だと続かないタイプなので心配でしたが',
          'どうしても一人だと長続きしないタイプでしたが',
          'ソロのトレーニングが苦手で続いた試しがなかったのですが',
          'モチベーションを一人で保つのが課題だったのですが',
        ]);
        const here = pick([
          'ここは少人数なので周りと一緒に頑張れます',
          'このジムは一緒にやる雰囲気があるので自然と力が出ます',
          'ここは仲間の存在がちょうどいい刺激になります',
          'このジムは適度にチーム感があって気持ちが乗ります',
        ]);
        const exp = pick([
          '体験してみたらかなり楽しくて、自然と全力で動けました',
          '実際にやってみたら想像以上に動けました',
          'メニューに取り組んでみると、集中力が切れずに続けられました',
          'やってみたら思いのほか夢中になり、笑顔で終われました',
        ]);
        const closing = pick([
          'こういう環境なら続けられそうです',
          'この雰囲気なら続けていけそうです',
          '自分の性格に合う運動の場だと感じました',
          'ようやく通い続けられそうな場所に出会えました',
        ]);
        return `${prev}、${here}。${exp}。${closing}。`;
      },
    },
    {
      id: 'P09', tier: 'standard',
      condition: (m) => m.isBeginner || m.wasNervous,
      build: (m, pick, free) => {
        const prev = pick([
          '正直、運動があまり得意ではないのですが、思い切って来てみました',
          '運動が本当に久しぶりで最初は不安でしたが、思い切って参加しました',
          '運動経験がほとんどなくて、最初はついていけるか心配でした',
          'ジムが初めてに近くて緊張していましたが、思い切って体験してみました',
          '運動はかなり久しぶりで、参加前は少し不安でした',
          '自分みたいな運動初心者でも大丈夫かなと思いながら来てみました',
        ]);
        const svc = m.didKickboxing
          ? pick(['キックボクシングは初めてでしたが', 'キックは未経験でしたが'])
          : pick(['トレーニングは初めてでしたが', '内容は初めてで戸惑いもありましたが']);
        const trainer = m.trainerGood
          ? pick(['トレーナーさんが丁寧に教えてくれるので、何をすればいいか迷うことがありませんでした', 'スタッフさんのサポートがあったので安心して取り組めました'])
          : pick(['少人数なので周りも気にならず自分のペースでできました', '雰囲気がよくて気負わず参加できました']);
        const closing = pick([
          '楽しく運動できて良かったです',
          '思っていたより気持ちよく体を動かせました',
          '参加してみて正解だったと感じました',
          '思い切って一歩を踏み出してよかったです',
          '不安が自信に変わる時間になりました',
          'ハードルを下げて来てみて本当に正解でした',
        ]);
        return `${prev}。${svc}、${trainer}。${closing}。`;
      },
    },
    {
      id: 'P10', tier: 'standard',
      condition: (m) => m.didKickboxing,
      build: (m, pick, free) => {
        const open = pick([
          'キックボクシングを体験しました',
          'キックボクシングに挑戦してきました',
          '気になっていたキックボクシングを体験してきました',
        ]);
        const mituchi = m.didMituchi
          ? pick(['ミット打ちが想像以上に爽快で夢中になりました', 'ミット打ちの気持ちよさに驚きました'])
          : pick(['思った以上に全身を使えて楽しかったです', 'こんなに動けるんだと驚きました']);
        const trainerBit = m.trainerForm
          ? pick(['フォームも見てもらえて', 'フォームを丁寧に教えてもらえて'])
          : pick(['トレーナーさんのサポートもあって', '雰囲気もよくて']);
        const after = m.refresh
          ? pick(['運動後はかなりスッキリしました', '終わった後のスッキリ感がよかったです'])
          : pick(['終わった後に気持ちいい達成感がありました', 'いい時間を過ごせました']);
        return `${open}。${mituchi}。${trainerBit}、${after}。`;
      },
    },
    {
      id: 'P11', tier: 'standard',
      condition: (m) => m.hasFriend || m.goodWithFriend,
      build: (m, pick, free) => {
        const open = pick([
          '友達と一緒に来てみました',
          '友人に誘われて二人で参加しました',
          '友達からの誘いで一緒に体験してきました',
          '気の合う友人と連れ立って訪ねてみました',
          '仲良しのメンバーで予約して伺いました',
        ]);
        const atmo = pick([
          '雰囲気がアットホームで、初めてでも気軽に参加できました',
          'スタッフさんの対応もよくて、二人ともすぐ馴染めました',
          '店内の空気が明るくて、入った瞬間からリラックスできました',
          '気さくに迎えてくれたので、緊張がすぐにほぐれました',
        ]);
        const exp = m.didKickboxing
          ? pick([
              'キックボクシングは一緒にやると余計に楽しくて、かなり盛り上がりました',
              'キックを友達と並んでやるのが新鮮で、思いきり笑えました',
              '打撃練習をペアで取り組めて、普段とは違う距離感が楽しかったです',
              '友人と技を見せ合いながらできて、終始笑顔でした',
            ])
          : pick([
              'トレーニングも一緒にやると自然と頑張れて楽しかったです',
              '友達と一緒だと余計に力が出て盛り上がりました',
              'ペアで励まし合いながら動けて、普段より頑張れました',
              'メニューを並んで取り組むのが楽しく、時間があっという間でした',
            ]);
        return `${open}。${atmo}。${exp}。`;
      },
    },
    {
      id: 'P16', tier: 'standard',
      condition: (m) => m.trainerGood,
      build: (m, pick, free) => {
        const trainerOpen = pick([
          'スタッフさんが最初から丁寧に説明してくれて、緊張がほぐれました',
          'トレーナーさんの対応が丁寧で、安心して参加できました',
          '最初からスタッフさんが優しく案内してくれて、気楽に始められました',
          '受付からインストラクターの方まで親切で、不安がすぐ消えました',
          '雰囲気づくりが上手な方ばかりで、肩の力が抜けました',
        ]);
        const svc = m.didKickboxing
          ? pick([
              'キックボクシングは初めてでしたが、フォームを見ながら声をかけてもらえるので安心して取り組めました',
              'キックは未経験でしたが、一つずつ教えてもらえるので迷わず動けました',
              '打撃の基本を順序立てて教わり、戸惑わずに動けました',
              'ミット打ちまで段階的に進めてもらえ、気持ちよくフォームを覚えられました',
            ])
          : pick([
              'トレーニングは初めてでしたが、一つひとつ見てもらえるので安心して進められました',
              '内容は未経験でしたが、ペースを合わせて指導してもらえてよかったです',
              '初めてのメニューでしたが、動作ごとに補助してもらえて助かりました',
              '流れを分かりやすく説明してもらえて、迷うことなく進められました',
            ]);
        const after = pick([
          '終わった後は達成感がありました',
          '運動後は気持ちよく充実感がありました',
          '帰る頃にはスッキリとした達成感がありました',
          '最後まで走り切った手応えが心地よかったです',
          '清々しい気分で店を後にできました',
        ]);
        return `${trainerOpen}。${svc}。${after}。`;
      },
    },

    // --- LONG (240-350字) ---
    {
      id: 'P12', tier: 'long',
      condition: (m) => true,
      build: (m, pick, free) => {
        // 来店目的の完全文
        let reasonLine;
        if (m.hasArea && m.hasDiet)  reasonLine = `${areaPhrase(m, pick)}ダイエットができるジムを探していました`;
        else if (m.hasArea)          reasonLine = `${areaPhrase(m, pick)}通えるジムを探していました`;
        else if (m.hasDiet)          reasonLine = pick(['ダイエットのためにジムを探していました', '体を引き締めたくてジムを探していました']);
        else if (m.hasKickboxingPurpose) reasonLine = pick(['前からキックボクシングに興味があってジムを探していました', 'キックボクシングができるジムを探していました']);
        else if (m.hasStress)        reasonLine = pick(['ストレス発散になる運動を探していました', '思い切り体を動かせる場所を探していました']);
        else reasonLine = pick(['運動不足が気になっていてジムを探していました', '何か体を動かそうとジムを探していました']);

        // 来店前状況
        const prev = prevSituationPhrase(m, pick) ||
          pick(['一人で続けることが苦手だったので、少人数制に興味を持ちました', '普通のジムだと続かなさそうで、こういうスタイルが合いそうだと思いました', 'ジムが長続きしなかった経験があって、別のスタイルを試してみました']);

        // サービス体験
        const svc = serviceDidPhrase(m, pick);
        const feel = (() => {
          if (m.didKickboxing && m.moreFunThanExpected) return pick(['思った以上に楽しくてかなりいい汗がかけました', 'キックボクシングがこんなに楽しいとは思っていませんでした', 'キックボクシングに夢中になってしまい、気づけば汗だくでした']);
          if (m.bigSweat && m.timeFlew) return pick(['汗をかきながら動いていたら、気づいたら時間が経っていました', '全身で動いていたら、あっという間に時間が過ぎていました', '汗だくになっていたら、もう終わりの時間で驚きました']);
          return pick([
            '思った以上に全身を使えて楽しかったです',
            '想像以上に動けて達成感がありました',
            '予想を超えて楽しくて時間を忘れました',
            '体が動くことの楽しさを改めて感じました',
            '集中して取り組めて短い時間でも充実感がありました',
            '始めたらすぐに夢中になれました',
            'こんなに気持ちよく動けるとは思っていませんでした',
            '体を動かすことが純粋に楽しかったです',
          ]);
        })();

        // トレーナー評価
        const trainerSent = m.trainerGood
          ? trainerPhrase(m, pick) + 'ので、安心して取り組めました'
          : pick([
              '少人数なのでトレーナーさんが近くにいて、気軽に質問できました',
              'スタッフさんのサポートもあって、迷わず取り組めました',
              '少人数制で周りをあまり気にせず自分のペースで進められました',
              '人数が少ない分、雰囲気がよくて集中できました',
              'コンパクトなクラスだったので、何かあればすぐ聞ける環境でした',
            ]);

        // 初心者向け補足（条件付き）
        const beginnerNote = (m.isBeginner || m.wasNervous)
          ? pick(['初めてでも分かりやすく教えてもらえてよかったです', '初心者でも迷わず進められました']) + '。'
          : '';

        const after = afterPhrase(m, pick) || pick(['運動後はかなりスッキリしました', '終わった後に気持ちのいい達成感がありました']);
        const close = closingPhrase(m, pick) || pick(['また来たいと思いました', 'また通おうと思いました']);
        return `${reasonLine}。${prev}。実際に${svc}が、${feel}。${trainerSent}。${beginnerNote}${after}し、${close}。`;
      },
    },
    {
      id: 'P13', tier: 'long',
      condition: (m) => m.wasNervous || m.isBeginner || m.wasLongAbsence,
      build: (m, pick, free) => {
        const open = pick([
          '運動がかなり久しぶりで、参加できるかどうか不安でした',
          'ほぼ運動経験がなかったので、ついていけるか心配でした',
          '久しぶりすぎて、正直ちゃんとできるか不安でした',
          '体力に自信がなく、入店前はかなり尻込みしていました',
          'ブランクが長く、ちゃんと動けるのか心配で緊張していました',
        ]);
        const relief = pick([
          'でも少人数だからか思ったよりリラックスできて、体験が始まったらすぐ楽しくなりました',
          'でも実際に来てみると雰囲気がよくてリラックスできました',
          'でも始まってみたら、思ったより気楽に取り組めました',
          'ただ受付の時点で温かく迎えてもらえ、肩の力が抜けました',
          'いざ入ってみると明るい空気感で、不安が自然と消えていきました',
        ]);
        const svc = m.didKickboxing
          ? pick([
              'キックボクシングがこんなに楽しいとは思っていなかったので、時間があっという間でした',
              'キックは初めてでしたが、気づけば夢中で動いていました',
              '初めての打撃練習が面白くて、集中している間に終了していました',
              '思い切りミットを叩ける爽快感が癖になりそうでした',
            ])
          : pick([
              'トレーニングも思っていたよりずっと楽しくて、時間があっという間でした',
              'メニューも想像以上に動けて、終わるのが早く感じました',
              '動きが新鮮で、集中しているうちにあっという間に終わりました',
              '想定より体を使うメニューでしたが、楽しんで取り組めました',
            ]);
        const trainer = trainerPhrase(m, pick) ||
          pick([
            'トレーナーさんが一つずつ教えてくれるので自分のペースでできました',
            'スタッフさんの対応もあって気負わず参加できました',
            '担当の方が常に目を配ってくれ、分からないことがすぐ解消できました',
          ]);
        const close = pick([
          'これなら続けていけそうです',
          'また来ようと思いますし、続けられそうです',
          '次も来ようと思いました',
          '通い続けたくなる体験でした',
          '一歩踏み出してよかったと素直に思えました',
        ]);
        return `${open}。${relief}。${svc}。${trainer}。${close}。`;
      },
    },
    {
      id: 'P14', tier: 'long',
      condition: (m) => m.personalExpensive,
      build: (m, pick, free) => {
        const open = pick([
          'パーソナルトレーニングに興味はあったんですが、費用のことを考えると踏み出せずにいました',
          'パーソナルは費用面がネックで、ずっと迷っていました',
          'マンツーマン指導に憧れつつも、料金で諦めかけていました',
          '個別指導を受けたい気持ちはあったものの、価格が壁になっていました',
        ]);
        const here = pick([
          'ここはセミパーソナル形式で、個別に見てもらいながら費用はかなり抑えられます',
          'このジムは少人数制で、パーソナルより費用を抑えつつ丁寧に見てもらえます',
          'こちらは少人数シェア型なので、金額を抑えつつマンツーマンに近い指導が受けられます',
          'ここは費用対効果が高く、個別指導の良さをリーズナブルに体験できます',
        ]);
        const svc = serviceDidPhrase(m, pick);
        const exp = pick([
          '実際に体験してみると、少人数なのでトレーナーさんが近くにいてくれて、普通のジムより丁寧に教えてもらえる感じがしました',
          'やってみると、距離が近い分だけフォームも細かく見てもらえて、安心して取り組めました',
          '参加してみて感じたのは、個別対応の密度が思った以上に高いということでした',
          '体験してみると、指導のきめ細かさに驚きました。価格以上の価値を感じました',
        ]);
        const close = closingPhrase(m, pick) || pick(['続けていけそうだと感じました', 'これから通ってみたいと思います', 'ここなら予算内で続けられそうだと確信しました']);
        return `${open}。${here}。${svc}。${exp}。${close}。`;
      },
    },
    {
      id: 'P15', tier: 'long',
      condition: (m) => m.hasArea,
      build: (m, pick, free) => {
        const area = areaPhrase(m, pick);
        const reason = purposeReason(m, pick);
        const prev = pick([
          '一人で続けることが苦手だったので、少人数でトレーナーがいるスタイルが自分に合いそうだと思って来てみました',
          'いろいろ比べた中で、少人数で見てもらえるこのスタイルが自分に合いそうだと感じて選びました',
          'ネットでいくつか候補を見比べた上で、ここの雰囲気に惹かれて予約しました',
          '口コミが良さそうで、プログラム制の方が続けやすそうだと感じて選びました',
        ]);
        const svc = m.didKickboxing
          ? pick([
              'キックボクシングを初めて体験しましたが、思った以上に動けて楽しかったです',
              'キックボクシングに挑戦してみると、想像以上に全身を使えました',
              '打撃練習は初めてでしたが、動きのリズムに乗って気持ちよく取り組めました',
              '初体験の格闘技系メニューでしたが、新鮮で夢中になれました',
            ])
          : pick([
              '実際にメニューを体験してみると、想像以上に動けて楽しかったです',
              'やってみると、思っていた以上に充実した内容でした',
              'プログラムを受けてみて、密度の濃さに感心しました',
              '動いてみると想定を超える手応えがあり、満足度の高い内容でした',
            ]);
        const close = pick([
          'これなら続けられそうだと思いました',
          '長く通っていけそうな気がしました',
          'また来ようと思います',
          '通勤帰りに寄れそうで、生活に組み込みやすいと感じました',
          '定期的に顔を出したいと素直に思えました',
        ]);
        return `${area}${reason}使えるジムを探していて見つけました。${prev}。${svc}。${close}。`;
      },
    },
    {
      id: 'P17', tier: 'long',
      condition: (m) => m.wasLongAbsence || m.isBeginner,
      build: (m, pick, free) => {
        const open = pick([
          '運動が久しぶりすぎて、正直ちゃんとできるか心配でした',
          '何年もまともに運動していなかったので、不安が大きかったです',
          '運動経験がほとんどなかったので、ついていけるか心配でした',
          'かなり久しぶりに運動しようと決めたものの、正直不安でした',
          'ブランクが相当あったため、恥をかかないか気がかりでした',
          '体力がどこまで落ちているか分からず、少し怖いくらいでした',
        ]);
        const atmo = pick([
          'でも実際に来てみると雰囲気がよくてリラックスできました',
          '来てみると想像していたよりずっとアットホームで、すぐ馴染めました',
          'でも始まってみたら、思ったより気楽に取り組めました',
          'でもスタッフさんの対応がよくて、すぐに緊張がほぐれました',
          'ただ入店した瞬間の明るい空気で、不安が自然と消えていきました',
          'いざレッスンが始まると、集中するあまり心配するのを忘れていました',
        ]);
        const svc = m.didKickboxing && m.didMituchi
          ? pick(['キックボクシングもミット打ちも初めてでしたが、トレーナーさんが一つずつ教えてくれるので自分のペースでできました', 'キックとミット打ちを体験しましたが、ペースを合わせてもらえたのでついていけました'])
          : m.didKickboxing
            ? pick(['キックボクシングも初めてでしたが、トレーナーさんが一つずつ教えてくれるので自分のペースでできました', 'キックは未経験でしたが、ペースを合わせてもらえたので無理なく取り組めました', 'キックボクシングは初めてでしたが、教え方が丁寧で迷わず体を動かせました'])
            : pick(['トレーニングも初めてでしたが、トレーナーさんが一つずつ教えてくれるので自分のペースでできました', '内容も未経験でしたが、ペースを合わせてもらえて迷わず取り組めました', '初めての体験でしたが、丁寧に指導してもらえて気持ちよく動けました']);
        const feel = pick([
          'こんなに楽しく運動できると思っていなかったので、また来ようと思います',
          '想像以上に楽しくて、続けていけそうな気がしました',
          'ここまで気持ちよく動けると思わなかったので、また通いたいです',
          'こんなに充実した時間になるとは思っていなくて、嬉しい驚きでした',
          '不安が自信に変わる体験で、ぜひ継続していきたいです',
          '予想以上に満ち足りた気持ちになれ、次回が楽しみになりました',
        ]);
        return `${open}。${atmo}。${svc}。${feel}。`;
      },
    },
    {
      id: 'P19', tier: 'long',
      condition: (m) => true,
      build: (m, pick, free) => {
        // 体験から開始 → なぜ来たか → 少人数・トレーナー → 感情 → 継続
        const svcOpen = (() => {
          if (m.didKickboxing && m.moreFunThanExpected)
            return pick(['キックボクシングを初めて体験しましたが、こんなに楽しいとは思っていませんでした', 'キックボクシングを体験して、想像以上に楽しくて夢中になってしまいました']);
          if (m.didKickboxing && m.bigSweat)
            return pick(['キックボクシングを体験しました。かなり全身を使って、想像以上にいい汗がかけました', 'キックボクシングでかなり汗をかきました。こんなに動ける運動だとは思っていませんでした']);
          if (m.didKickboxing)
            return pick(['キックボクシングを初めて体験してきました。思ったより全身を使えて驚きました', 'キックボクシングを体験しました。想像していたより難しくて、それがまた楽しかったです']);
          if (m.didHIIT && m.toughButFun)
            return pick(['HIITを体験しましたが、キツいけど楽しくて夢中で動いていました', 'HIITに挑戦しましたが、ハードな分だけ終わった後の達成感が大きかったです']);
          if (m.didHIIT)
            return pick(['HIITを体験しました。思っていた以上に全身を使えて、充実した内容でした', 'HIITに取り組みましたが、短時間でしっかり動けて達成感がありました']);
          return pick(['セミパーソナルトレーニングを体験しました。個別に見てもらえる分、普通のジムより密度が高かったです', 'トレーニングを体験しましたが、思ったより充実した内容で時間があっという間でした']);
        })();

        const whyCame = (() => {
          if (m.hasDiet)    return pick(['もともとダイエット目的で探していたのですが、体を動かすこと自体の楽しさを感じました', 'ダイエットのためと思って来ましたが、運動の楽しさを改めて気づかせてもらいました']);
          if (m.hasStress)  return pick(['ストレス発散のために来てみたのですが、想像以上に体も心もスッキリしました', 'ストレスを発散したくて来たのですが、それ以上に楽しい時間になりました']);
          if (m.hasHealth)  return pick(['運動不足を解消したくて来てみたのですが、これは続けたくなりました', '健康のために何か始めようと来ましたが、思った以上にいい選択でした']);
          return pick(['初めての体験でしたが、思った以上に自分に合っていました', 'ちょっと試しに来てみただけでしたが、予想以上に楽しかったです']);
        })();

        const smallGroupLine = pick([
          '少人数制なのでトレーナーさんに近くで見てもらえるのが安心でした',
          '少人数だからこそ、丁寧に指導してもらえる雰囲気がよかったです',
          '少人数の環境で、分からないことをすぐ聞けるのがよかったです',
          '少人数なので一人ひとりに目が届いて、初心者でも気負わずできました',
          '定員が絞られているため、常に目配りが行き届いているのを感じました',
          'クラスサイズが小さく、放置されずに最後まで指導を受けられました',
          '参加人数が少ない分、周りを気にせず自分の動きに集中できました',
        ]);

        const after = afterPhrase(m, pick) || pick(['運動後はかなりスッキリしました', '終わった後に気持ちのいい達成感がありました', '帰り道が清々しかったです']);
        const close = closingPhrase(m, pick) || pick(['また来ようと思います', '続けていけそうです', 'リピートしたいです']);
        return `${svcOpen}。${whyCame}。${smallGroupLine}。${after}。${close}。`;
      },
    },
    {
      id: 'P20', tier: 'long',
      condition: (m) => true,
      build: (m, pick, free) => {
        // 状況から始まる → 体験 → トレーナー or 少人数 → 比較・気づき → 継続
        const situation = (() => {
          if (m.had24hrFail && m.aloneNoGood)
            return pick(['24時間ジムに入ったことがありますが、一人だと続かなくてやめてしまいました。こういうスタイルが合うかもしれないと思って来てみました', '以前は24時間ジムに通っていましたが、一人では長続きしなくて。みんなで動けるジムを探していました']);
          if (m.had24hrFail)
            return pick(['24時間ジムに入ったことがありましたが続かなかったので、別のスタイルを試してみようと思いました', '以前24時間ジムに通っていましたが続かなかった経験があり、こういう形式に興味を持ちました']);
          if (m.aloneNoGood)
            return pick(['一人だとジムが続かないのが自分の課題でした。少人数で一緒に動ける環境を探していました', '一人で運動が続かないタイプなのですが、ここは少人数なので周りと一緒に取り組めます']);
          if (m.personalExpensive)
            return pick(['パーソナルトレーニングは費用のことが気になってなかなか踏み出せずにいました', 'パーソナルジムに興味はあったのですが費用面がネックで、こういうスタイルを試してみました']);
          if (m.dontKnowWhat)
            return pick(['何から始めていいか分からなくてずっと迷っていました', 'ジムに入りたいけど何をすればいいか分からなくて来てみました']);
          if (m.boredSolo)
            return pick(['普通の筋トレだけだと飽きてしまうのが悩みで、違う形式を探していました', '一人で黙々と筋トレするのが続かなくて、楽しくできる場所を探していました']);
          return pick(['体を動かしたくてジムを探していました。いくつか見た中でここが気になって来てみました', 'ちょっと運動を始めたくて、いいジムがないか探していました']);
        })();

        const experience = (() => {
          if (m.didKickboxing)
            return pick(['実際にキックボクシングを体験してみると、思っていた以上に全身を使えて楽しかったです', 'キックボクシングを体験しましたが、想像以上に動けてかなりいい汗がかけました', 'キックボクシングに初挑戦しましたが、楽しくて気づいたら夢中で動いていました']);
          if (m.didHIIT)
            return pick(['HIITを体験してみると、全身を動かす感覚が気持ちよくて達成感がありました', 'HIITに取り組んで、思っていたよりハードでしたが、その分達成感も大きかったです']);
          return pick(['実際に体験してみると、思っていたより動けて達成感がありました', 'メニューを体験して、想像以上に充実した内容だと感じました']);
        })();

        const comparison = (() => {
          if (m.had24hrFail || m.aloneNoGood)
            return pick(['一人でやるより確実に頑張れますし、続けやすい環境だと思いました', '一人でジムに行くのと全然違って、自然と全力で動けました', '一人でやっていたときとは全然違う充実感がありました']);
          if (m.personalExpensive)
            return pick(['パーソナルほど費用はかからないのに、しっかり見てもらえるのがいいと思いました', 'コスパよくトレーナーに見てもらえるスタイルで、自分には合っていました']);
          if (m.smallGroupGood || m.trainerNearby)
            return pick(['少人数なのでトレーナーさんが近くにいてくれて、気軽に質問できました', 'トレーナーさんが近くにいてくれて、初めてでも安心して取り組めました']);
          return pick(['雰囲気がよくて、初めてでも気負わず参加できたのがよかったです', 'アットホームな環境で、自分のペースで体を動かせました']);
        })();

        const close = closingPhrase(m, pick) || pick(['また来ようと思います', '続けていけそうです', 'リピートしたいと思いました']);
        return `${situation}。${experience}。${comparison}。${close}。`;
      },
    },

    // --- DETAILED (350-500字) ---
    {
      id: 'P18', tier: 'detailed',
      condition: (m) => m.richness >= 14,
      build: (m, pick, free) => {
        const area = areaPhrase(m, pick);
        const reason = purposeReason(m, pick);
        const open = area
          ? `${area}${reason}通えるジムを探していて、こちらに来てみました`
          : `${reason}${cameAction(pick)}`;
        const prev = prevSituationPhrase(m, pick);
        const prevSentence = prev ? `${prev}。` : '';
        const svc = serviceDidPhrase(m, pick);
        const impr = pick([
          '思った以上に全身を使えて、気づけば夢中になっていました',
          '予想を超えて動けて、楽しさに驚きました',
          '想像以上に汗もかけて、達成感がありました',
          '集中している間に時間があっという間に過ぎていました',
          'こんなに気持ちよく体を動かせるとは思っていませんでした',
          '体が動くことの喜びを久しぶりに感じました',
          '動きの一つひとつが新鮮で、最後まで飽きずに取り組めました',
          '全身を使い切った達成感と爽快感が心地よかったです',
        ]);
        const uniq = uniquePhrase(m, pick) || pick([
          '少人数なのでトレーナーさんにも近くで見てもらえました',
          'アットホームな雰囲気で初めてでも気負わず参加できました',
          '少人数制だから一人ひとりをしっかり見てもらえました',
          '和気あいあいとした雰囲気でリラックスして参加できました',
          '周りの方たちも温かくて、すぐに馴染めました',
          'スタッフさんが常に気を配ってくれて安心できました',
        ]);
        const trainer = trainerPhrase(m, pick);
        const trainerSentence = trainer ? `${trainer}ので、初心者でも迷うことなく進められました。` : '';
        const after = afterPhrase(m, pick) || pick(['運動後はしっかりスッキリして、清々しい気持ちになりました', '終わった後の達成感とスッキリ感がよかったです']);
        const close = closingPhrase(m, pick) || pick([
          'これなら続けていけそうですし、また来ようと思います',
          'リピートしたいですし、長く通っていけそうです',
          '長く続けられそうな予感がしますし、また予約を入れようと思います',
          'ここなら習慣にできそうだと感じましたし、定期的に通いたいです',
          '充実した時間だったのでリピート確定です',
          '次回も楽しみにしながら帰路につきました',
        ]);
        return `${open}。${prevSentence}実際にやってみると、${svc}。${impr}。${uniq}し、${trainerSentence}${after}。${close}。`;
      },
    },
  ];

  function pickFromArr(arr, pick) {
    // trace index via pick wrapper
    return pick(arr);
  }

  // ======================================================
  // tier -> 文字数レンジ
  // ======================================================
  const TIER_RANGE = {
    micro:    [60, 100],
    short:    [100, 160],
    standard: [160, 240],
    long:     [240, 350],
    detailed: [350, 500],
  };

  // ======================================================
  // generate 本体
  // ======================================================
  function generate(answers, seed) {
    const actualSeed = (seed !== undefined && seed !== null)
      ? seed
      : ((Date.now() + Math.random() * 1e9) | 0);
    const rng = createRNG(actualSeed);
    const m   = extractMeanings(answers);
    const free = (answers.freeText || '').trim();
    const hasFreeText = free.length > 0;

    const tier = determineLength(m, rng, hasFreeText);

    // 候補パターンを絞り込む
    let candidates = PATTERNS.filter(p => p.tier === tier && p.condition(m));
    if (candidates.length === 0) {
      // tierのみ一致
      candidates = PATTERNS.filter(p => p.tier === tier);
    }
    if (candidates.length === 0) {
      // 近いtierにフォールバック
      const order = ['micro', 'short', 'standard', 'long', 'detailed'];
      const idx = order.indexOf(tier);
      for (let dist = 1; dist < order.length && candidates.length === 0; dist++) {
        for (const d of [-1, 1]) {
          const ni = idx + d * dist;
          if (ni >= 0 && ni < order.length) {
            const t = order[ni];
            const c = PATTERNS.filter(p => p.tier === t);
            if (c.length > 0) { candidates = c; break; }
          }
        }
      }
    }

    // 重み付き選択（同一条件に複数パターンがある場合に均等化）
    const PATTERN_WEIGHT = { P12: 1, P05: 1, P19: 2, P20: 2, P13: 2, P15: 2, P17: 2 };
    const weightedCandidates = candidates.flatMap(p => {
      const w = PATTERN_WEIGHT[p.id] ?? 1;
      return Array.from({ length: w }, () => p);
    });
    const pattern = weightedCandidates[Math.floor(rng() * weightedCandidates.length)];
    const trace = { v: [] };
    const pick  = makePick(rng, trace);

    let text = pattern.build(m, pick, free);

    // 自由入力を末尾に追加
    if (hasFreeText) {
      let appended = free;
      if (!/[。！!？?]$/.test(appended)) appended += '。';
      text += appended;
    }

    const variantSig = trace.v.join('_');
    const structKey  = `${pattern.id}__${variantSig}`;

    return {
      text,
      patternId: pattern.id,
      structKey,
      seed: actualSeed,
      length: tier,
    };
  }

  // ======================================================
  // 公開
  // ======================================================
  return {
    generate,
    extractMeanings,
    PATTERNS,
    TIER_RANGE,
  };

})();
