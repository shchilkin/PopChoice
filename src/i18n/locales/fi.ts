import type { Translations } from './en';

export const fi: Translations = {
  nav: {
    howItWorks: 'Miten se toimii',
    findAMovie: 'Etsi elokuva',
    toggleTheme: 'Vaihda teema',
    switchLanguage: 'Vaihda kieli',
  },
  footer: {
    builtBy: 'Rakentanut',
    tagline: 'kurssin harjoitustyö, joka meni käsistä',
  },
  hero: {
    badge: 'Tekoälypohjainen elokuvahaku',
    descriptionPre:
      'Lopeta loputon selaaminen. Vastaa 5 nopeaan kysymykseen ja anna tekoälyn löytää',
    perfectMovie: 'täydellinen elokuva',
    descriptionPost: 'mielialaasi, iltaasi ja tunnelmaasi varten.',
    findMyMovie: 'Löydä elokuvani',
    howItWorks: 'Miten se toimii',
    noSignup: '✨ Ei rekisteröitymistä · Kestää ~60 sekuntia · Toimii puhelimella',
  },
  features: {
    headline: 'Elokuvailta, hoidettu.',
    subheadline: 'Ei algoritmeja, ei loputonta selaamista — vain täydellisiä valintoja.',
    aiPowered: {
      title: 'Tekoälypohjainen',
      desc: 'Vektorihaku löytää elokuvia, jotka todella sopivat tunnelmaasi',
    },
    fiveQuestions: {
      title: '5 nopeaa kysymystä',
      desc: 'Ei pitkiä lomakkeita — vain 60 sekunnin makutesti',
    },
    groupMode: {
      title: 'Ryhmätila',
      desc: 'Löydä elokuva, josta kaikki elokuvailtaan osallistujat nauttivat',
    },
    instantResults: {
      title: 'Välittömät tulokset',
      desc: 'Saat 6 harkittua suositusta sekunneissa',
    },
  },
  cta: {
    headline: 'Seuraava lempifilmisi on yhden testin päässä',
    description:
      'Olipa kyse viihtyisästä iltapäivästä yksin tai meluisasta ryhmänäytöksestä, PopChoice lukee tilanteen ja löytää valinnan, josta kaikki pitävät.',
    button: 'Aloita testi',
  },
  quiz: {
    intro: {
      title: 'Löydetään sinulle elokuva',
      subtitle: 'Katsotko yksin vai muiden kanssa?',
      soloTitle: 'Vain minä',
      soloDesc: 'Sooloelokuvailta — personoitu juuri sinulle',
      groupTitle: 'Ryhmätila 🎉',
      groupDesc: 'Löydä täydellinen elokuva 2–6 hengelle',
      youLabel: 'Sinä',
    },
    groupSetup: {
      title: 'Kuka katsoo?',
      subtitle: 'Lisää kaikkien nimet, jotta voimme räätälöidä testin',
      personPlaceholder: 'Henkilön {n} nimi',
      addPerson: 'Lisää henkilö',
      back: 'Takaisin',
      letsGo: 'Mennään!',
    },
    between: {
      turnDone: '{name}n vuoro on ohi!',
      nowIts: 'Nyt on {name}n vuoro. Anna puhelin eteenpäin!',
      ready: 'Olen valmis, {name}! →',
    },
    nav: {
      back: 'Takaisin',
      continue: 'Jatka',
      nextPerson: 'Seuraava henkilö',
      findMyMovie: 'Löydä elokuvani ✨',
      submitting: 'Lähetetään…',
      ofTotal: '{current} / {total}',
      personTurn: '{name}n vuoro',
    },
    labels: [
      'Lempifilmi',
      'Vanha vai uusi?',
      'Tunnelmasi',
      'Valitse sävy',
      'Lempinäyttelijä',
    ],
    favoriteMovie: {
      title: 'Mikä on lempifilmisi?',
      hint: 'Tämä auttaa meitä ymmärtämään makuasi. Mikä tahansa elokuva, joka teki vaikutuksen sinuun.',
      placeholder: 'esim. The Dark Knight, Loinen, Coco…',
      popularPicks: 'SUOSITUT VALINNAT',
      why: 'MIKSI?',
      whyOptional: '(valinnainen)',
      whyPlaceholder: 'Jaa ajatuksesi — juoni, hahmot, mikä teki siitä erityisen…',
    },
    era: {
      title: 'Uudet elokuvat vai ajattomat klassikot?',
      new: { title: 'Uudet julkaisut', desc: 'Viimeisen 5 vuoden aikana ilmestyneet elokuvat' },
      classic: {
        title: 'Ajattomat klassikot',
        desc: 'Kultaiset elokuvat, jotka ovat kestäneet aikaa',
      },
      both: {
        title: 'Olen avoin molemmille',
        desc: 'Yllätä minut — vanha tai uusi, kunhan se on hyvä',
      },
    },
    mood: {
      title: 'Millainen tunnelma sinulla on tänä iltana?',
      pickOne: 'Valitse yksi tai useampi',
      selectedSingular: '✓ {n} genre valittu',
      selectedPlural: '✓ {n} genreä valittu',
    },
    tone: {
      title: 'Millaista sävyä etsit?',
    },
    actor: {
      title: 'Kuka on lempinäyttelijäsi?',
      hint: 'Valinnainen — auttaa löytämään elokuvia, joissa esiintyvät jo rakastamasi näyttelijät.',
      placeholder: 'esim. Tom Hanks, Meryl Streep, Cillian Murphy…',
      popularPicks: 'SUOSITUT VALINNAT',
    },
  },
  genres: {
    action: 'Toiminta',
    comedy: 'Komedia',
    drama: 'Draama',
    scifi: 'Sci-Fi',
    thriller: 'Trilleri',
    romance: 'Romantiikka',
    horror: 'Kauhu',
    adventure: 'Seikkailu',
    animation: 'Animaatio',
    documentary: 'Dokumentti',
  },
  tones: {
    light: { label: 'Kevyt & Hauska', desc: 'Rento, piristävä' },
    balanced: { label: 'Tasapainoinen', desc: 'Kaikkea sekoitettuna' },
    serious: { label: 'Vakava', desc: 'Ajattelua herättävä' },
    dark: { label: 'Tumma & Intensiivinen', desc: 'Mukaansatempaava, monimutkainen' },
  },
  loading: {
    title: 'Etsitään täydellistä valintaasi',
    errorTitle: 'Oho…',
    tips: [
      'Analysoidaan makuprofiiliasi vektoriupotusten avulla… 🧠',
      'Ristiinviitataan yli 10 000 elokuvaa tietokannassamme… 🎬',
      'Sovitetaan tunnelmia, ei vain genrejä… ✨',
      'Suodatetaan pois elokuvat, jotka ystäväsi ovat jo spoilanneet… 🤫',
      'Lasketaan täydellinen kesto illallesi… ⏱️',
      'Konsultoidaan tekoäly-elokuvasommelieria… 🍷',
      'Melkein valmista — täydellinen valintasi latautuu… 🍿',
    ],
    retryableError: 'Jokin meni pieleen. Yritä uudelleen.',
    fatalError: 'Palvelu ei ole tällä hetkellä saatavilla. Yritä myöhemmin uudelleen.',
    savedAnswers:
      'Vastauksesi on tallennettu selaimeen — palaa takaisin ja jatkamme siitä mihin jäimme.',
    tryAgain: 'Yritä uudelleen',
    backToQuiz: 'Takaisin testiin',
    goHome: 'Etusivulle',
    funFact: '🍿 Tiesitkö?',
    funFactText:
      'Tavallinen ihminen käyttää {time} katseluvalinnan tekemiseen — PopChoice tekee sen sekunneissa.',
    funFactTime: '18 minuuttia',
  },
  results: {
    badge: 'Henkilökohtaiset suosituksesi',
    title: 'Löysimme täydellisen elokuvasi',
    subtitle: 'Sovitettu yli 10 000 elokuvasta tekoälyn makuanalyysillä',
    topPick: 'Paras valinta',
    moreSuggestions: 'Lisää ehdotuksia',
    loading: 'Ladataan suosituksiasi…',
    noResultsTitle: 'Suosituksia ei löydy',
    noResultsHint: 'Yritä testiä uudelleen erilaisilla vastauksilla.',
    tryAgain: 'Yritä uudelleen',
    tryWithFriends: 'Kokeile kavereiden kanssa',
    disclaimer: 'Suositukset ovat tekoälyn luomia makuprofiilisi perusteella.',
    scrollLeft: 'Vieritä vasemmalle',
    scrollRight: 'Vieritä oikealle',
    showDetails: 'Näytä tiedot elokuvalle {name}',
  },
  about: {
    badge: 'Miten PopChoice toimii',
    title: 'Tekoäly, joka ymmärtää makuasi',
    descriptionPre:
      'PopChoice ei ole pelkkä genresuodatin. Se käyttää vektoriupotuksia ja tekoälyä ymmärtääkseen, mikä tekee elokuvasta oikean juuri',
    you: 'sinulle',
    descriptionPost: '— ja löytää elokuvia, jotka aidosti vastaavat tätä tunnetta.',
    ctaTitle: 'Valmis löytämään tämän illan elokuvan?',
    ctaSubtitle: '60 sekuntia. 5 kysymystä. Täydellinen elokuva.',
    ctaButton: 'Aloita testi',
    howItWorks: {
      title: 'Prosessi',
      steps: [
        {
          title: 'Vastaat 5 nopeaan kysymykseen',
          desc: 'Kerro meille lempifilmisi (ja miksi!), suositko klassikkoja vai uutuuksia, nykyinen tunnelmasi (valitse useita genrejä!), haluamasi sävy ja lempinäyttelijäsi. Se kestää noin 60 sekuntia.',
        },
        {
          title: 'Rakennamme makuprofiilisi',
          desc: 'Vastauksesi muunnetaan moniulotteiseksi vektoriksi, joka tallentaa mieltymystesi vivahteet — ei vain genrejä, vaan myös elokuvallista tyyliä, kerronnan monimutkaisuutta ja tunnesävyä.',
        },
        {
          title: 'Tekoäly etsii elokuvatietokannastamme',
          desc: 'Vektorin samankaltaisuushaun avulla löydämme tietokannastamme elokuvat, jotka ovat lähinnä makuprofiiliasi. Jokainen elokuva on ennalta analysoitu sävyn, vauhdin, teemojen ja tunnelatauksen osalta.',
        },
        {
          title: 'Saat harkitut tulokset',
          desc: 'Näytämme parhaan vastauksesi sekä 5 muuta hienoa vaihtoehtoa, joista jokaisen kohdalla on personoitu tekoälyn kirjoittama selitys siitä, miksi se sopii makuusi tänä iltana.',
        },
      ],
    },
    techStack: {
      title: 'Konepellin alla',
      items: [
        {
          name: 'Vektorihaku',
          desc: 'Semanttinen samankaltaisuusvastaavuus yli 10 000 elokuvassa',
        },
        {
          name: 'Tekoälyn kielimalli',
          desc: 'Luo personoituja suosituksia jokaiselle käyttäjälle',
        },
        {
          name: 'Elokuvatietokanta',
          desc: 'Kuratoitua metatietoa, mukaan lukien sävy, teemat ja elokuvallisuus',
        },
        {
          name: 'Reaaliaikainen käsittely',
          desc: 'Nopeat tulokset — lähetyksestä suosituksiin sekunneissa',
        },
      ],
    },
    faq: {
      title: 'UKK',
      items: [
        {
          q: 'Tarvitaanko PopChoiceen tiliä?',
          a: 'Ei! PopChoice on täysin anonyymi eikä vaadi rekisteröitymistä. Vain vastaa testiin ja saat suosituksesi.',
        },
        {
          q: 'Miten ryhmätila toimii?',
          a: 'Jokainen ryhmän jäsen täyttää 5 kysymyksen testin samalla laitteella. PopChoice löytää sitten elokuvia, jotka saavat korkeat pisteet kaikkien makuprofiilien perusteella — todellinen kompromissi, mutta hyvä sellainen.',
        },
        {
          q: 'Kuinka tarkkoja suositukset ovat?',
          a: 'Tekoäly käyttää vektorisamankaltaisuutta useiden elokuvan ominaisuuksien perusteella (ei vain genren), mikä johtaa yllättävän tarkkaan makujen yhteensovittamiseen. Tietenkin elokuvamaku on subjektiivinen — siksi annamme sinulle 6 vaihtoehtoa!',
        },
        {
          q: 'Mistä elokuvatiedot tulevat?',
          a: 'Elokuvatietokantamme on koottu julkisista elokuvametadatoista, mukaan lukien arvostelut, ajoaika, ohjaaja, genretagit ja teemaanalyysi, jonka suorittaa tekoälyputkistomme.',
        },
      ],
    },
  },
};
