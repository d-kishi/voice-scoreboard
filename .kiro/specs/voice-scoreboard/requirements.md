# Requirements Document

## Introduction
音声操作対応スポーツスコアボードアプリ（Voice Scoreboard）の要件定義。
バレーボール練習時に得点板の代わりとして使用するモバイルアプリケーション。
音声入力と音声読み上げによる双方向インターフェース（K.I.T.T.スタイル）を備え、
タッチ操作と音声操作の両方でスコアを管理できる。

初期リリース（v1.0）は6人制バレーボール（25点マッチ・デュース対応）のみを対象とする。

## Requirements

### Requirement 1: 得点表示
**Objective:** 練習参加者として、左右チームのスコアを大きく見やすく表示してほしい。離れた位置からでも得点を確認できるようにするため。

#### Acceptance Criteria
1. The Voice Scoreboard shall 横画面（ランドスケープ）で左右に分割されたスコア表示エリアを提供する
2. The Voice Scoreboard shall 各チームの現在の得点を大きな数字で表示する
3. The Voice Scoreboard shall ダークモードの背景でスコアを表示する

### Requirement 2: タッチによる得点操作
**Objective:** 練習参加者として、画面タップで直感的にスコアを変更したい。音声を使えない状況でも操作できるようにするため。

#### Acceptance Criteria
1. When ユーザーがチームの+1ボタンをタップした, the Voice Scoreboard shall 該当チームの得点を1点加算する
2. When ユーザーがチームの-1ボタンをタップした, the Voice Scoreboard shall 該当チームの得点を1点減算する（誤操作修正用）
3. When ユーザーがロールバックボタンをタップした, the Voice Scoreboard shall 直前の1操作を取り消す
4. When ユーザーがリセットボタンをタップした, the Voice Scoreboard shall 確認ダイアログを表示する
5. When リセット確認ダイアログでユーザーがリセットを承認した, the Voice Scoreboard shall 両チームの得点を0-0にリセットする

### Requirement 3: 6人制バレーボール試合ルール
**Objective:** 練習参加者として、バレーボールの得点ルールが自動適用されてほしい。手動で試合終了を判断する手間をなくすため。

#### Acceptance Criteria
1. When いずれかのチームが25点に到達し、かつ相手チームとの点差が2点以上ある, the Voice Scoreboard shall 試合終了と判定する
2. While 両チームの得点が24-24以降の状態, the Voice Scoreboard shall 2点差がつくまで試合を継続する（デュース）
3. When 試合終了が判定された, the Voice Scoreboard shall スコアを固定表示し、ホイッスル音を3秒間再生する
4. While 試合終了状態, the Voice Scoreboard shall 得点の加算・減算・ロールバック操作を受け付けない
5. While 試合終了状態, the Voice Scoreboard shall リセット操作（ボタンまたは音声）のみ受け付ける
6. When 試合終了状態でリセットが実行された, the Voice Scoreboard shall 0-0の状態に戻し、新しい試合を開始可能にする

### Requirement 4: 音声認識（ウェイクワード検知）
**Objective:** 練習参加者として、「スコア」と発声するだけで音声操作モードに入りたい。手を使わずに得点を変更できるようにするため。

#### Acceptance Criteria
1. While 音声認識が有効な状態, the Voice Scoreboard shall 常時リスニングを行い、ウェイクワード「スコア」を待機する（IDLE状態）
2. When IDLE状態でウェイクワード「スコア」が検知された, the Voice Scoreboard shall Ready TTS を fire-and-forget で再生しつつ、即座にLISTENING状態に遷移する
3. While LISTENING状態, the Voice Scoreboard shall 画面中央にマイクアイコンと「Ready」テキストを表示し、背景のスコアをディム表示にする
4. While LISTENING状態, the Voice Scoreboard shall 5秒間のカウントダウンを表示する
5. When LISTENING状態で5秒間コマンドが検知されなかった, the Voice Scoreboard shall IDLE状態に自動的に戻る

### Requirement 5: 音声コマンド操作
**Objective:** 練習参加者として、音声コマンドでスコアを操作したい。試合中にスマートフォンに触れずに得点管理するため。

#### Acceptance Criteria
1. When LISTENING状態で「右」が検知された, the Voice Scoreboard shall 「Roger」と応答し、画面右側のチームに1点加算する
2. When LISTENING状態で「左」が検知された, the Voice Scoreboard shall 「Roger」と応答し、画面左側のチームに1点加算する
3. When LISTENING状態で「ロールバック」が検知された, the Voice Scoreboard shall 「Roger」と応答し、直前の1操作を取り消した後、現在のスコアを読み上げる
4. When LISTENING状態で「リセット」が検知された, the Voice Scoreboard shall 「Roger」と応答し、確認なしで即座に0-0にリセットした後、現在のスコアを読み上げる
5. When 音声コマンドが実行された, the Voice Scoreboard shall IDLE状態に戻る

### Requirement 6: 音声読み上げ・サウンド
**Objective:** 練習参加者として、操作に対するシステム応答を音声で受け取りたい。画面を見なくても操作結果を確認できるようにするため。

#### Acceptance Criteria
1. When ウェイクワードが検知された, the Voice Scoreboard shall Ready TTS を fire-and-forget で再生する（完了を待たずコマンド認識を即時開始する）
2. When 音声コマンドが検知された, the Voice Scoreboard shall 「Roger」と音声で読み上げる
3. When 音声コマンド（右/左/ロールバック/リセット）が実行された, the Voice Scoreboard shall 「左{点数} 右{点数}」の形式で現在のスコアを読み上げる
5. When タッチ操作で得点が変更された, the Voice Scoreboard shall 音声読み上げは行わない
6. When 試合終了が判定された, the Voice Scoreboard shall ホイッスル音を3秒間再生する

### Requirement 7: 画面スリープ防止・常時点灯
**Objective:** 練習参加者として、アプリ使用中は画面が消えないでほしい。試合中に画面が暗くなって見えなくなることを防ぐため。

#### Acceptance Criteria
1. While アプリがフォアグラウンドで起動中, the Voice Scoreboard shall 画面スリープを防止し、常時点灯状態を維持する

### Requirement 8: 設定管理
**Objective:** 練習参加者として、音声認識と読み上げのオン/オフを切り替えたい。環境や状況に応じて音声機能を制御するため。

#### Acceptance Criteria
1. The Voice Scoreboard shall 音声認識のオン/オフ切り替え機能を提供する
2. The Voice Scoreboard shall 音声読み上げのオン/オフ切り替え機能を提供する
3. When 音声認識がオフに設定された, the Voice Scoreboard shall ウェイクワードの検知を停止する
4. When 音声読み上げがオフに設定された, the Voice Scoreboard shall 「Roger」およびスコアの読み上げを行わない（Ready TTS・ホイッスル音は読み上げ設定に関係なく常に再生する）
5. When 設定が変更された, the Voice Scoreboard shall 設定値を永続化し、次回起動時に復元する

### Requirement 9: パフォーマンス・非機能要件
**Objective:** 練習参加者として、快適に使えるレスポンスとオフライン動作を期待する。体育館などネットワーク環境が不安定な場所でも安定動作させるため。

#### Acceptance Criteria
1. The Voice Scoreboard shall 3秒以内にアプリを起動完了する
2. The Voice Scoreboard shall 音声認識から操作実行まで1秒以内にレスポンスする
3. The Voice Scoreboard shall ネットワーク接続なしでオフライン動作する
4. The Voice Scoreboard shall マイク権限を適切に要求・管理する
5. The Voice Scoreboard shall iOS 14.0以上およびAndroid 10以上で動作する
