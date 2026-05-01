import type { Translations } from './en';

export const fi: Translations = {
  nav: {
    howItWorks: 'Miten se toimii',
    availableMovies: 'Elokuvat',
    findAMovie: 'Etsi elokuva',
    toggleTheme: 'Vaihda teema',
    switchLanguage: 'Vaihda kieli',
    openMenu: 'Avaa valikko',
    closeMenu: 'Sulje valikko',
    styleGuide: 'Tyyliopas',
  },
  footer: {
    builtBy: 'Rakentanut',
    authorName: 'Aleksandr Shchilkin',
    tagline: 'kurssin harjoitustyö, joka meni käsistä',
  },
  tmdbAttribution: {
    disclaimer: 'PopChoice käyttää TMDB API:a, mutta ei ole TMDB:n hyväksymä tai sertifioima.',
    visitLink: 'Vieraile The Movie Database -sivustolla',
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
    subheadline: 'Ei loputonta selaamista, ei arvausta — vain sopivat elokuvat.',
    aiPowered: {
      title: 'Tekoälypohjainen',
      desc: 'Löytää elokuvia, jotka todella sopivat tunnelmaasi',
    },
    fiveQuestions: {
      title: '5 nopeaa kysymystä',
      desc: 'Ei pitkiä lomakkeita — vain 60 sekunnin makutesti',
    },
    groupMode: {
      title: 'Ryhmätila',
      desc: 'Valinta, josta kaikki tosiaan innostuvat. Ei väittelyä.',
    },
    instantResults: {
      title: 'Välittömät tulokset',
      desc: 'Saat 6 harkittua suositusta sekunneissa',
    },
  },
  cta: {
    headline: 'Seuraava lempifilmisi löytyy yhdellä testillä',
    description:
      'Olipa kyse rauhallisesta yksinäisestä illasta tai isomman kaveriporukan leffatuokiosta — PopChoice tunnistaa tilanteen ja löytää valinnan, josta kaikki pitävät.',
    button: 'Aloita testi',
  },
  quiz: {
    intro: {
      title: 'Löydetään sinulle elokuva',
      subtitle: 'Katsotko yksin vai muiden kanssa?',
      soloTitle: 'Vain minä',
      soloDesc: 'Sooloelokuvailta — personoitu juuri sinulle',
      groupTitle: 'Ryhmätila 🎉',
      groupDesc: 'Jokainen vastaa itse — yksi laite, 2–6 henkilöä',
      youLabel: 'Sinä',
    },
    groupSetup: {
      title: 'Kuka katsoo?',
      subtitle: 'Lisää kaikkien nimet, jotta voimme personoida tuloksesi',
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
    labels: ['Lempifilmi', 'Vanha vai uusi?', 'Tunnelmasi', 'Valitse sävy', 'Lempinäyttelijä'],
    favoriteMovie: {
      title: 'Mikä on lempifilmisi?',
      hint: 'Tämä auttaa meitä ymmärtämään makuasi. Mikä tahansa elokuva, joka on jäänyt mieleen.',
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
      'Puretaan elokuvallinen DNA:si… 🧠',
      'Käydään läpi 10 000+ elokuvaa täydellisen osuman löytämiseksi… 🎬',
      'Sovitetaan tunnelmia, ei vain genrejä… ✨',
      'Suodatetaan pois elokuvat, jotka ystäväsi ovat jo spoilanneet… 🤫',
      'Lasketaan täydellinen kesto illallesi… ⏱️',
      'Kuullaan tekoälyn elokuvakriitikkoa… 🍷',
      'Melkein valmista — täydellinen valintasi latautuu… 🍿',
    ],
    retryableError: 'Jokin meni pieleen. Yritä uudelleen.',
    moderatedError:
      'Syötteesi sisältää sopimatonta sisältöä. Tarkista mieltymyksesi ja yritä uudelleen.',
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
    subtitle: 'Sovitettu {count} elokuvasta juuri sinulle',
    topPick: 'Paras valinta',
    moreSuggestions: 'Lisää ehdotuksia',
    loading: 'Ladataan suosituksiasi…',
    noResultsTitle: 'Ei osumia…',
    noResultsHint: 'Kokeile eri tunnelmalla.',
    tryAgain: 'Yritä uudelleen',
    tryWithFriends: 'Kokeile kavereiden kanssa',
    disclaimer: 'Tekoälyn valitsemat juuri sinulle. Varoitus: saattaa aiheuttaa leffamaratonin.',
    scrollLeft: 'Vieritä vasemmalle',
    scrollRight: 'Vieritä oikealle',
    showDetails: 'Näytä tiedot elokuvalle {name}',
    aiPick: 'Tekoälyn valinta',
    match: 'osuma',
    minUnit: 'min',
    whyThisFilm: 'Miksi tämä elokuva',
    whyThisFilmForYou: 'Miksi tämä elokuva sinulle',
    broaderSearch: 'Laajennettu haku — sisältää TMDB-tuloksia',
    foundInDb: 'Löydetty kirjastostamme',
    foundOnTmdb: 'Löydetty TMDB:stä',
    morePicksButton: 'Lisää valintoja TMDB:stä',
    morePicksLoading: 'Haetaan lisää…',
    morePicksEmpty: 'Ei enempää tuloksia juuri nyt.',
  },
  about: {
    badge: 'Miten PopChoice toimii',
    title: 'Tekoäly, joka ymmärtää makuasi',
    descriptionPre:
      'PopChoice ei ole pelkkä genresuodatin. Se tunnistaa, mikä tekee elokuvasta oikean juuri',
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
          desc: 'Vastauksistasi muodostuu rikas makuprofiili, joka tallentaa mieltymystesi vivahteet — ei vain genrejä, vaan myös elokuvallista tyyliä, kerronnan syvyyttä ja tunnosävyä.',
        },
        {
          title: 'Tekoäly etsii elokuvatietokannastamme',
          desc: 'Tekoälyn avulla löydämme tietokannastamme elokuvat, jotka vastaavat parhaiten makuprofiiliasi. Jokainen elokuva on ennalta analysoitu sävyn, vauhdin, teemojen ja tunnelatauksen osalta.',
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
          desc: 'Kuratoitua metatietoa, mukaan lukien sävy, teemat ja elokuvakerronnan tyyli',
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
          a: 'Ei! PopChoice on täysin anonyymi eikä vaadi rekisteröitymistä. Vastaa vain testiin ja saat suosituksesi.',
        },
        {
          q: 'Miten ryhmätila toimii?',
          a: 'Jokainen ryhmän jäsen täyttää 5 kysymyksen testin samalla laitteella. PopChoice löytää sitten elokuvia, jotka sopivat kaikkien makuun — kompromissi, joka yllättävän hyvin toimii.',
        },
        {
          q: 'Kuinka tarkkoja suositukset ovat?',
          a: 'Tekoäly analysoi elokuvan useita ominaisuuksia — ei vain genreä — mikä johtaa yllättävän tarkkaan makujen yhteensovittamiseen. Tietenkin elokuvamaku on subjektiivinen — siksi annamme sinulle 6 vaihtoehtoa!',
        },
        {
          q: 'Mistä elokuvatiedot tulevat?',
          a: 'Elokuvatietokantamme on koottu julkisista elokuvametadatoista, mukaan lukien arvostelut, kesto, ohjaaja, genretagit ja teemaanalyysi, jonka tekoälymme on suorittanut.',
        },
      ],
    },
  },
  moviesPage: {
    title: 'Saatavilla olevat elokuvat',
    loading: 'Ladataan elokuvia…',
    tryAgain: 'Yritä uudelleen',
    showing: 'Näytetään {start}–{end} / {total} elokuvaa',
    noMoviesFound: 'Elokuvia ei löydy',
    prev: 'Edell.',
    next: 'Seur.',
    pageOf: 'Sivu {current} / {total}',
    columns: {
      name: 'Nimi',
      ageRating: 'Ikäraja',
      duration: 'Kesto',
      score: 'Pisteet',
    },
  },
};
