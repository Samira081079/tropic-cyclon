import { MissionConfig } from '../types/game';

export const MISSIONS: MissionConfig[] = [
  {
    id: 1,
    title: 'Mərhələ 1: İlk Barometrik Xəbərdarlıq',
    oceanName: 'Şimali Atlantik Okeanı',
    cycloneName: 'Aysel',
    category: 1,
    hemisphere: 'north',
    maxWindKnots: 78,
    minPressureHpa: 982,
    cycloneRadiusNM: 55,
    cycloneSpeedKnots: 12,
    cycloneTrackDeg: 315, // Northwestward
    shipStart: { x: -48, z: 58, headingDeg: 38 },
    cycloneStart: { x: 42, z: 36 },
    portPosition: { x: 35, z: -68, name: 'Bermud Limanı' },
    briefing:
      'Kateqoriya 1 tropik siklon "Aysel" Şimali Atlantikdə şimal-qərbə doğru hərəkət edir. Uzaqdan atmosfer təzyiqinin düşməsini izləyin və təhlükəli sektora girmədən Bermud limanına çatın.',
    scientificTip:
      'Şimal yarımkürəsində Koriolis qüvvəsi küləyi siklon mərkəzi ətrafında saat əqrəbinin əksinə yönəldir.',
    questions: [
      {
        id: 'm1-q1',
        triggerKind: 'observation',
        triggerDistanceNM: 82,
        title: 'Uzaqdan Müşahidə: Barometrik Təzyiq',
        question:
          'Gəminin barometri son 3 saatda 1012 hPa-dan 999 hPa-a düşüb, üfüqdə sıx lələkli (Cirrus) buludlar görünür. Okeanologiyaya görə bu nəyin əlamətidir?',
        options: [
          'Yaxınlaşan tropik siklonun xarici aşağı təzyiq sahəsinin',
          'Yalnız səth sularının soyumasının və sakit hava cəbhəsinin',
          'Quru küləklərinin okeandan materikə doğru əsməsinin',
          'Dəniz dibində seysmik dalğaların (sunami) yaranmasının',
        ],
        correctIndex: 0,
        explanation:
          'Tropik siklonların mərkəzində güclü alçaq təzyiq zonası olur. Barometrin kəskin düşməsi və yüksək Cirrus buludlarının görünməsi siklonun yaxınlaşdığını uzaqdan xəbər verir.',
        safeTurnDeg: -38,
        dangerTurnDeg: 42,
      },
      {
        id: 'm1-q2',
        triggerKind: 'evasion',
        triggerDistanceNM: 56,
        title: 'Buys Ballot Qanunu və Sektor Seçimi',
        question:
          'Şimal yarımkürəsində üzünüzü küləyin əsdiyi istiqamətə (küləyə qarşı) çevirsəniz, siklonun mərkəzi hansı tərəfinizdə yerləşər və hansı yarımkürə təhlükəlidir?',
        options: [
          'Mərkəz sağ tərəfdə olar; siklonun hərəkət yolunun sağ tərəfi təhlükəlidir',
          'Mərkəz sol tərəfdə olar; siklonun hərəkət yolunun sol tərəfi təhlükəlidir',
          'Mərkəz düz arxada olar; hər iki tərəf eyni dərəcədə sakitdir',
          'Mərkəz düz öndə olar; göz divarı ən təhlükəsiz keçid zonasıdır',
        ],
        correctIndex: 0,
        explanation:
          'Buys Ballot qanununa görə Şimal yarımkürəsində küləyə qarşı durduqda alçaq təzyiq mərkəzi sağda (bir qədər arxada) yerləşir. Siklonun irəliləmə sürəti ilə fırlanma sürəti toplandığı üçün yolun SAĞ tərəfi Təhlükəli Yarımkürədir.',
        safeTurnDeg: -48,
        dangerTurnDeg: 55,
      },
      {
        id: 'm1-q3',
        triggerKind: 'emergency',
        triggerDistanceNM: 34,
        title: 'Fövqəladə Manevr: Keçilə Bilən Sektora Çıxış',
        question:
          'Külək sürətlə artır və dalğalar gəmini yırğalayır. Şimal yarımkürəsində təhlükəli sağ sektordan çıxmaq üçün küləyi gəminin hansı tərəfindən alaraq uzaqlaşmalısınız?',
        options: [
          'Küləyi sağ ön (starboard bow) tərəfdən alıb saat əqrəbi istiqamətində dönməklə',
          'Mühərriki söndürüb dalğalara yan (bortla) dayanmaqla',
          'Küləyi sol arxa tərəfdən alıb birbaşa siklonun gözünə doğru üzməklə',
          'Sürəti minimuma endirib siklonla eyni istiqamətdə irəliləməklə',
        ],
        correctIndex: 0,
        explanation:
          'Dənizçilik qaydalarına görə Şimal yarımkürəsində təhlükəli sektordan çıxmaq üçün küləyi sağ burun (starboard bow) tərəfdən 45° bucaqla alıb maksimum təhlükəsiz sürətlə uzaqlaşmaq lazımdır.',
        safeTurnDeg: -65,
        dangerTurnDeg: 35,
      },
    ],
  },
  {
    id: 2,
    title: 'Mərhələ 2: Koriolis və Təhlükəli Kvadrat',
    oceanName: 'Karib Dənizi',
    cycloneName: 'Marlin',
    category: 2,
    hemisphere: 'north',
    maxWindKnots: 98,
    minPressureHpa: 964,
    cycloneRadiusNM: 62,
    cycloneSpeedKnots: 14,
    cycloneTrackDeg: 295,
    shipStart: { x: -58, z: 62, headingDeg: 44 },
    cycloneStart: { x: 46, z: 24 },
    portPosition: { x: 30, z: -72, name: 'Havana Limanı' },
    briefing:
      'Kateqoriya 2 qasırğası "Marlin" Karib sularında güclənir. Bu missiyada Koriolis qüvvəsinin külək paylanmasına təsirini və yayınma kursunu düzgün hesablamalısınız.',
    scientificTip:
      'Tropik siklonlar Koriolis qüvvəsinin yetərincə zəif olduğu ekvatorun 5° yaxınlığında demək olar ki, yaranmır.',
    questions: [
      {
        id: 'm2-q1',
        triggerKind: 'observation',
        triggerDistanceNM: 88,
        title: 'Koriolis Qüvvəsi və Fırlanma İstiqaməti',
        question:
          'Nə üçün tropik siklonlar bilavasitə ekvator xətti (0° enlik) üzərində formalaşmır və Karib dənizində (18° Şm. en.) hansı istiqamətdə fırlanır?',
        options: [
          'Ekvatorda Koriolis qüvvəsi sıfıra bərabərdir; Şimalda saat əqrəbinin əksinə fırlanır',
          'Ekvatorda okean suyu çox soyuqdur; Şimalda saat əqrəbi istiqamətində fırlanır',
          'Ekvatorda atmosfer təzyiqi həmişə 1050 hPa-dan yüksəkdir',
          'Koriolis qüvvəsi yalnız Cənub yarımkürəsində təsir göstərir',
        ],
        correctIndex: 0,
        explanation:
          'Yerin öz oxu ətrafında fırlanmasından yaranan Koriolis qüvvəsi ekvatorda sıfırdır, buna görə hava axınları burulğan yarada bilmir. 5° enlikdən şimalda Koriolis qüvvəsi havanı sağa meyilləndirərək siklonu saat əqrəbinin əksinə fırladır.',
        safeTurnDeg: -42,
        dangerTurnDeg: 48,
      },
      {
        id: 'm2-q2',
        triggerKind: 'evasion',
        triggerDistanceNM: 58,
        title: 'Təhlükəli Sektorun Fiziki Səbəbi',
        question:
          'Şimal yarımkürəsində siklon 14 düyün sürətlə hərəkət edirsə, niyə onun sağ tərəfində (Təhlükəli Yarımkürədə) külək və dalğa daha dağıdıcı olur?',
        options: [
          'Siklonun irəliləmə sürəti fırlanma küləyinin sürəti ilə toplanır və gəmini yola itələyir',
          'Sol tərəfdə okean dibi daha dərin olduğu üçün dalğalar sönür',
          'Sağ tərəfdə günəş şüaları suyu daha tez buxarlandırır',
          'Sol tərəfdə atmosfer təzyiqi mərkəzdən daha aşağı olur',
        ],
        correctIndex: 0,
        explanation:
          'Təhlükəli yarımkürədə siklonun translyasiya (irəliləmə) vektoru ilə siklonik fırlanma vektoru eyni istiqamətə yönəlir, nəticədə külək sürəti artır və külək gəmini siklonun mərkəzi yolunun önünə sürükləyir.',
        safeTurnDeg: -50,
        dangerTurnDeg: 52,
      },
      {
        id: 'm2-q3',
        triggerKind: 'emergency',
        triggerDistanceNM: 36,
        title: 'Barometrik Düşmə və Təhlükəli Zonadan Qurtuluş',
        question:
          'Barometr 976 hPa göstərir və külək saat əqrəbi istiqamətində dəyişir (veering). Bu, gəminin təhlükəli yarımkürədə olduğunu sübut edir. Nə etməlisiniz?',
        options: [
          'Dərhal sola — keçilə bilən sektorun arxa tərəfinə doğru kursu dəyişmək',
          'Külək istiqamətində düz mərkəzə doğru sürəti artırmaq',
          'Lövbər salıb fırtınanın okeanda dayanmasını gözləmək',
          'Sağa dönüb siklonun irəliləmə yolunu kəsməyə çalışmaq',
        ],
        correctIndex: 0,
        explanation:
          'Küləyin istiqamətinin saat əqrəbi üzrə dəyişməsi (veering) Şimal yarımkürəsində təhlükəli sağ yarımkürədə olduğunuzu göstərir. Siklonun yolunu kəsmədən sola/geri dönərək keçilə bilən sektora çıxmaq həyati əhəmiyyətlidir.',
        safeTurnDeg: -72,
        dangerTurnDeg: 38,
      },
    ],
  },
  {
    id: 3,
    title: 'Mərhələ 3: Cənub Yarımkürəsi Güzgü Qaydası',
    oceanName: 'Cənubi Hind Okeanı',
    cycloneName: 'Muson',
    category: 3,
    hemisphere: 'south',
    maxWindKnots: 115,
    minPressureHpa: 946,
    cycloneRadiusNM: 68,
    cycloneSpeedKnots: 15,
    cycloneTrackDeg: 225, // Southwestward
    shipStart: { x: -55, z: -60, headingDeg: 145 },
    cycloneStart: { x: 48, z: -28 },
    portPosition: { x: 32, z: 72, name: 'Mavriki Limanı' },
    briefing:
      'Diqqət! Cənubi Hind okeanındasınız. Kateqoriya 3 siklon "Muson" cənub-qərbə irəliləyir. Cənub yarımkürəsində Koriolis qüvvəsi əks istiqamətdə işlədiyi üçün bütün naviqasiya qaydaları güzgü kimi tərsinə çevrilir!',
    scientificTip:
      'Cənub yarımkürəsində siklonlar saat əqrəbi istiqamətində fırlanır və hərəkət yolunun SOL tərəfi təhlükəli yarımkürə sayılır.',
    questions: [
      {
        id: 'm3-q1',
        triggerKind: 'observation',
        triggerDistanceNM: 92,
        title: 'Ölü Dalğalar (Swell) və Cənub Fırlanması',
        question:
          'Siklon hələ 90 mil uzaqdadır, lakin uzun periodlu (14 saniyəlik) ölü dalğalar (swell) gəmiyə çatır. Cənub yarımkürəsində bu siklonun fırlanması necədir?',
        options: [
          'Saat əqrəbi istiqamətində fırlanır; ölü dalğalar küləkdən əvvəl xəbərdarlıq verir',
          'Saat əqrəbinin əksinə fırlanır; ölü dalğalar yalnız fırtına bitdikdə yaranır',
          'Fırlanmır, yalnız şaquli burulğan yaradır',
          'Həm Şimal, həm Cənub yarımkürəsində fırlanma eynidir',
        ],
        correctIndex: 0,
        explanation:
          'Böyük dalğalar siklonun özündən daha sürətlə yayıldığı üçün uzaqdan gələn uzun periodlu ölü dalğalar (swell) yaxınlaşan fırtınanın istiqamətini göstərir. Cənub yarımkürəsində siklon saat əqrəbi istiqamətində fırlanır.',
        safeTurnDeg: 40,
        dangerTurnDeg: -45,
      },
      {
        id: 'm3-q2',
        triggerKind: 'evasion',
        triggerDistanceNM: 62,
        title: 'Cənub Yarımkürəsində Təhlükəli Sektor',
        question:
          'Cənub yarımkürəsində siklon cənub-qərbə doğru irəliləyir. İrəliləmə sürəti ilə fırlanma sürətinin toplandığı "Təhlükəli Yarımkürə" hansı tərəfdir?',
        options: [
          'Siklonun hərəkət istiqamətinin SOL tərəfi',
          'Siklonun hərəkət istiqamətinin SAĞ tərəfi',
          'Yalnız siklonun arxa hissəsi',
          'Ekvatora ən yaxın kənar zolaq',
        ],
        correctIndex: 0,
        explanation:
          'Cənub yarımkürəsində hava kütləsi saat əqrəbi istiqamətində fırlandığından, siklonun hərəkət xəttinin SOL tərəfində fırlanma və irəliləmə vektorları toplanır. Buna görə SOL yarımkürə təhlükəlidir!',
        safeTurnDeg: 52,
        dangerTurnDeg: -50,
      },
      {
        id: 'm3-q3',
        triggerKind: 'emergency',
        triggerDistanceNM: 38,
        title: 'Cənubda Təhlükəli Sektordan Çıxış Manevri',
        question:
          'Gəmi Cənub yarımkürəsində təhlükəli sol sektora düşmə riski altındadır. Küləyi hansı tərəfdən alıb keçilə bilən (sağ) sektora qaçmalısınız?',
        options: [
          'Küləyi sol burun (port bow) tərəfdən 45° bucaqla alıb saat əqrəbinin əksinə çıxmaqla',
          'Küləyi sağ bortdan alıb mərkəzə paralel üzməklə',
          'Tam geri gedişə (reverse) keçib gözləməklə',
          'Küləyi düz arxadan alıb siklonla yarışmaqla',
        ],
        correctIndex: 0,
        explanation:
          'Cənub yarımkürəsində Şimalın əksinə olaraq təhlükəli sol sektordan çıxmaq üçün küləyi sol burun (port bow) tərəfdən alıb maksimum sürətlə keçilə bilən sağ yarımkürəyə uzaqlaşmaq lazımdır.',
        safeTurnDeg: 70,
        dangerTurnDeg: -40,
      },
    ],
  },
  {
    id: 4,
    title: 'Mərhələ 4: 1-2-3 Qaydası və Tayfun Qurşağı',
    oceanName: 'Qərbi Sakit Okean',
    cycloneName: 'Kuroşio',
    category: 4,
    hemisphere: 'north',
    maxWindKnots: 132,
    minPressureHpa: 928,
    cycloneRadiusNM: 74,
    cycloneSpeedKnots: 16,
    cycloneTrackDeg: 350, // Turning northward (recurvature)
    shipStart: { x: -64, z: 54, headingDeg: 52 },
    cycloneStart: { x: 26, z: 46 },
    portPosition: { x: 54, z: -72, name: 'Yokohama Limanı' },
    briefing:
      'Kateqoriya 4 Tayfun "Kuroşio" şimala doğru dönmə (recurvature) mərhələsindədir. Okeanologiya və dənizçilikdə tətbiq olunan məşhur 1-2-3 Qaydasından istifadə edərək tayfunun yolunu kəsmədən keçin.',
    scientificTip:
      '1-2-3 Qaydası 24, 48 və 72 saatlıq proqnozlarda müvafiq olaraq 100, 200 və 300 dəniz mili təhlükə buferi saxlamağı tələb edir.',
    questions: [
      {
        id: 'm4-q1',
        triggerKind: 'observation',
        triggerDistanceNM: 80,
        title: 'Okean Enerjisi və Tayfunun Güclənməsi',
        question:
          'Tayfun "Kuroşio" isti cərəyan üzərindən keçərkən Kateqoriya 4-ə yüksəlib. Tropik siklonların əsas enerji mənbəyi nədir?',
        options: [
          'Səth temperaturu ≥ 26.5°C olan isti okean suyunun buxarlanması və gizli istilik (latent heat)',
          'Qütb buzlaqlarından gələn soyuq dərinlik cərəyanları',
          'Ayın qabarma-çəkilmə cazibə qüvvəsi',
          'Okean səthində duzluluğun kəskin azalması',
        ],
        correctIndex: 0,
        explanation:
          'Tropik siklonlar ≥ 26.5°C isti okean suyundan buxarlanan rütubətin yuxarı qalxıb kondensasiya zamanı buraxdığı gizli istilik (latent heat) hesabına qidalanır.',
        safeTurnDeg: -45,
        dangerTurnDeg: 45,
      },
      {
        id: 'm4-q2',
        triggerKind: 'evasion',
        triggerDistanceNM: 68,
        title: 'Dənizçilikdə 1-2-3 Yayınma Qaydası',
        question:
          'ABŞ Hərbi Dəniz Qüvvələri və beynəlxalq okeanologiyada tətbiq olunan "1-2-3 Qaydası" gəmilərə nəyi tövsiyə edir?',
        options: [
          '34 düyünlü külək radiusuna əlavə olaraq 24/48/72 saatlıq proqnoz üçün 100/200/300 mil xəta buferi saxlamağı',
          'Yalnız 1, 2 və 3-cü kateqoriyalı siklonlardan yayınmağı, 4-cü kateqoriyadan keçməyi',
          'Hər 1 saatdan bir sürəti 2 dəfə azaldıb 3 dəfə artırmağı',
          'Siklonun gözünə 10 mil qalana qədər kursu dəyişməməyi',
        ],
        correctIndex: 0,
        explanation:
          'Trayektoriya proqnozları 100% dəqiq olmadığı üçün 1-2-3 Qaydası 34 kt külək dairəsini 24 saatda 100 NM, 48 saatda 200 NM, 72 saatda isə 300 NM genişləndirərək təhlükə zonasından kənarda qalmağı təmin edir.',
        safeTurnDeg: -56,
        dangerTurnDeg: 58,
      },
      {
        id: 'm4-q3',
        triggerKind: 'emergency',
        triggerDistanceNM: 40,
        title: 'Göz Divarı (Eyewall) Təhlükəsi',
        question:
          'Radarda siklonun mərkəzi gözünün ətrafında parlaq halqa (göz divarı) görünür. Nə üçün "gözə girib dincəlmək" ölümcül səhvdir?',
        options: [
          'Göz divarı ən şiddətli külək, xaotik piramida dalğaları və ani külək istiqaməti dəyişikliyi yaradır',
          'Gözün içində suyun sıxlığı sıfıra enir və gəmi anında batır',
          'Göz divarında temperatur -40°C-yə düşüb gəmini dondurur',
          'Gözün içində maqnit sahəsi kompasları əbədi sıradan çıxarır',
        ],
        correctIndex: 0,
        explanation:
          'Gözün özündə hava müvəqqəti sakitləşsə də, onu əhatə edən Göz Divarı (Eyewall) siklonun ən dağıdıcı küləklərinin və hər tərəfdən toqquşan xaotik dalğaların yerləşdiyi zonadır.',
        safeTurnDeg: -75,
        dangerTurnDeg: 30,
      },
    ],
  },
  {
    id: 5,
    title: 'Mərhələ 5: Super Siklon "Okean" (Kat. 5)',
    oceanName: 'Mərcan Dənizi',
    cycloneName: 'Okean',
    category: 5,
    hemisphere: 'south',
    maxWindKnots: 148,
    minPressureHpa: 908,
    cycloneRadiusNM: 80,
    cycloneSpeedKnots: 17,
    cycloneTrackDeg: 205,
    shipStart: { x: -66, z: -64, headingDeg: 138 },
    cycloneStart: { x: 40, z: -36 },
    portPosition: { x: 52, z: 74, name: 'Brisben Limanı' },
    briefing:
      'Final imtahanı! Cənub yarımkürəsində Kateqoriya 5 Super Siklon "Okean" 14 metr hündürlüyündə dalğalar və 908 hPa mərkəzi təzyiq yaradır. Bütün okeanologiya biliklərinizi tətbiq edərək gəmini Brisben limanına sağ-salamat çatdırın.',
    scientificTip:
      'Kateqoriya 5 siklonlarda dalğalar gəminin rezonans yırğalanmasını (parametric rolling) kəskin artırır; dalğalara qarşı bucaq seçimi kritikdir.',
    questions: [
      {
        id: 'm5-q1',
        triggerKind: 'observation',
        triggerDistanceNM: 94,
        title: 'Saffir-Simpson Şkalası və Bofort Dəniz Vəziyyəti',
        question:
          'Mərkəzi təzyiqi 908 hPa, 1 dəqiqəlik orta küləyi 148 düyün (274 km/saat) olan Kateqoriya 5 siklonunda açıq okeanda dalğa hündürlüyü və təhlükə necə olur?',
        options: [
          '14 metrdən hündür nəhəng dalğalar, sıx dəniz köpüyü zolaqları və sıfıra yaxın görünüş',
          'Maksimum 2 metrlik hamar dalğalar və açıq günəşli üfüq',
          'Yalnız sahil zonasında dalğalar olur, açıq okean sakit qalır',
          'Külək 148 düyündə su səthini tamamilə düzləşdirir',
        ],
        correctIndex: 0,
        explanation:
          'Bofort 12 (Qasırğa) və Saffir-Simpson Kat. 5 şəraitində 14+ metr hündürlüyündə dalğalar, havada uçuşan su zərrəcikləri (spindrift) və gəmi stabilliyini pozan kəskin yırğalanma yaranır.',
        safeTurnDeg: 46,
        dangerTurnDeg: -48,
      },
      {
        id: 'm5-q2',
        triggerKind: 'evasion',
        triggerDistanceNM: 72,
        title: 'Mərcan Dənizində Külək Dəyişimi və Sektor Diaqnozu',
        question:
          'Cənub yarımkürəsində üzən gəmidə barometr sürətlə düşür və külək saat əqrəbinin əksinə (backing) dönür. Bu sizə hansı sektorda olduğunuzu bildirir?',
        options: [
          'Təhlükəli SOL yarımkürədəsiniz — dərhal sol burunu küləyə verib sağ sektora uzaqlaşmalısınız',
          'Təhlükəsiz açıq okeandasınız — sürəti artırıb siklona yaxınlaşa bilərsiniz',
          'Keçilə bilən sağ yarımkürədəsiniz — sol tərəfə dönməlisiniz',
          'Siklon artıq dağılıb və sönüb',
        ],
        correctIndex: 0,
        explanation:
          'Cənub yarımkürəsində küləyin saat əqrəbinin əksinə dönməsi (backing) gəminin təhlükəli SOL yarımkürədə olduğunu göstərir. Küləyi sol burun tərəfdən alıb təhlükəsiz yarımkürəyə keçmək lazımdır.',
        safeTurnDeg: 62,
        dangerTurnDeg: -56,
      },
      {
        id: 'm5-q3',
        triggerKind: 'emergency',
        triggerDistanceNM: 44,
        title: 'Kritik Dalğalarda Gəmi Stabilliyi və Xilas Kursu',
        question:
          'Gəmi yüksək dalğalarda güclü yırğalanır və batma riski artır. Niyə dalğalara tam yan (90° bortla) dayanmaq olmaz və nə edilməlidir?',
        options: [
          'Yan dalğa sinxron yırğalanma (roll) yaradıb gəmini aşıra bilər; dalğaları 30–45° burun bucağı ilə kəsib təhlükəli zonadan çıxmalı',
          'Yan dayanmaq gəminin sürətini 2 dəfə artırdığı üçün qadağandır',
          'Dalğalara düz arxa vermək həmişə gəmini yırğalanmadan tam qoruyur',
          'Bütün balast çənlərini boşaldıb gəmini yüngülləşdirmək lazımdır',
        ],
        correctIndex: 0,
        explanation:
          'Dalğa uzunluğu gəmi eninə təsir etdikdə bortdan gələn dalğalar kritik yana yatma (roll) və aşma riski doğurur. Burunu dalğaya ~35–45° bucaq altında saxlayıb təhlükəli sektordan çıxmaq ən etibarlı üsuldur.',
        safeTurnDeg: 78,
        dangerTurnDeg: -35,
      },
    ],
  },
];
