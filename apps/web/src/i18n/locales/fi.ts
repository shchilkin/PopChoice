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
    techStack: 'Teknologia',
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
      worksFor: 'Sopii 2–6 henkilölle',
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
    title: 'Tekoäly, joka ymmärtää makuasi',
    originDescription:
      'Alkoi Scrimba AI -insinöörikurssin harjoitustyönä. Kurssin jälkeen jatkoin kehitystä — muutin sen oikeaksi full-stack-järjestelmäksi oppiakseni osat, joita tutoriaalit sivuuttavat: vektoritietokannat, taustatyöjonot, monorepositorio-työkalut ja kontitetut käyttöönotot. Elokuvasuositukset ovat aitoja.',
    sourceCode: 'Tämän projektin lähdekoodi on saatavilla',
    sourceCodeLink: 'täällä',
    whatItDoesLabel: 'Mitä se tekee',
    whatItDoesDescription:
      'PopChoice tarjoaa 5 kysymyksen makutestin — lempifilmi, suosittu aikakausi, nykyinen tunnelma, sävy ja lempinäyttelijä — ja muuntaa vastauksesi vektorirepresentaatioksi OpenAI-rajapinnan avulla. Tätä vertaillaan yli 400 ennalta analysoituun elokuvaan PostgreSQL:ssä pgvector-laajennuksella. Jos paikallisesta kokoelmasta ei löydy laadukasta vastaavuutta, järjestelmä laajentaa hakua automaattisesti TMDb-tietokantaan. Läheisimmät vastaavuudet esitetään suosituksina, joista jokaiselle on GPT:n luoma selitys siitä, miksi se sopii juuri sinulle. Genre on vain yksi ulottuvuus — järjestelmä tunnistaa myös elokuvallisen tyylin, kerronnallisen monimutkaisuuden ja tunnesävyn.',
    backgroundNote:
      'Kaikki tämä tapahtuu taustalla. Sinulle näkyy: 60 sekunnin testi ja elokuva, jota kannattaa katsoa.',
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
          desc: 'Näytämme parhaan vastauksesi sekä 5 muuta hienoa vaihtoehtoa, joista jokaisen kohdalla on personoitu tekoälyn kirjoittama selitys siitä, miksi se sopii makuusi.',
        },
      ],
    },
    techStack: {
      title: 'Konepellin alla',
      linkText: 'Täydellinen teknologiapurku →',
      groups: [
        {
          label: 'Frontend',
          items: [
            {
              name: 'Next.js 16',
              why: 'App Router ja palvelinkomponentit streaming-renderöintiä ja full-stack TypeScriptia varten',
            },
            {
              name: 'React 19',
              why: 'Rinnakkainen renderöinti ja Actions responsiiviseen testikokemukseen',
            },
            {
              name: 'XState',
              why: 'Testilogiikka formaaliksi tilakoneeksi — ennustettava kulku, ei if-spagettia',
            },
            {
              name: 'Tailwind CSS 4',
              why: 'Utility-first-tyylittely CSS-muuttujien design-tokeneilla',
            },
          ],
        },
        {
          label: 'Tekoäly + Data',
          items: [
            {
              name: 'OpenAI text-embedding-3-large',
              why: 'Makuprofiilin enkoodaus 3072-ulotteisiksi vektoreiksi semanttista hakua varten',
            },
            {
              name: 'gpt-5.4-mini',
              why: 'Nopea ja kustannustehokas personoitujen suositusselitysten generointi',
            },
            {
              name: 'PostgreSQL',
              why: 'Ensisijainen tietokanta 400+ kuratoitua elokuvaa, metatietoa ja vektoreita varten',
            },
            {
              name: 'pgvector',
              why: 'Itse isännöity vektorihaku automaattisella varavalintatoiminnolla TMDb:hen',
            },
          ],
        },
        {
          label: 'Infrastruktuuri',
          items: [
            {
              name: 'Redis',
              why: 'Korkean suorituskyvyn koordinaatiokerros työjonoille ja API-nopeusrajoitukselle',
            },
            {
              name: 'BullMQ',
              why: 'Taustatyöprosessointi elokuvatietojen täydennys- ja löytämisputkea varten',
            },
            {
              name: 'Railway',
              why: 'Pilvisovellusalusta kontitetulle web-sovellukselle, worker-palveluille ja tietokannoille',
            },
            {
              name: 'Turborepo',
              why: 'Monorepositorio-rakennusjärjestelmä korkean suorituskyvyn välimuistilla ja tehtäväorkestroinnilla',
            },
            {
              name: 'Docker',
              why: 'Kontitettu käyttöönotto yhtenäistä ympäristöä varten kaikissa palveluissa',
            },
          ],
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
          a: 'Tekoäly analysoi elokuvan useita ominaisuuksia — ei vain genreä — mikä johtaa yllättävän tarkkaan makujen yhteensovittamiseen. Elokuvamaku on subjektiivinen — siksi annamme sinulle 6 vaihtoehtoa.',
        },
        {
          q: 'Mistä elokuvatiedot tulevat?',
          a: 'Elokuvatietokantamme on koottu julkisista elokuvametadatoista, mukaan lukien arvostelut, kesto, ohjaaja, genretagit ja teemaanalyysi, jonka tekoälymme on suorittanut.',
        },
      ],
    },
  },
  techStackPage: {
    breadcrumbAbout: 'Tietoja',
    breadcrumbStack: 'Pino',
    title: 'Konepellin alla',
    intro:
      'Jokainen valinta on tehty oppiakseni osat, joita kurssiprojektit sivuuttavat: itse isännöity vektorihaku, taustatyöjonot, monorepositorio-työkalut ja kontitetut monipalvelukäyttöönotot. Alla olevat päätökset selittävät perustelut, eivät vain lopputuloksen.',
    backToAbout: '← Takaisin tietoihin',
    tryQuiz: 'Kokeile testiä →',
    groups: [
      {
        label: 'Frontend',
        items: [
          {
            name: 'Next.js 16',
            role: 'Full-stack-kehys',
            rationale:
              'Next.js 16 ja App Router tarjoavat sovelluksen rungon. Palvelinkomponentit mahdollistavat streaming-renderöinnin ja layout-tason datan haun, kun taas full-stack TypeScript eliminoi API-sopimusten epäyhtenäisyydet.',
            detail:
              'Tulokset-sivu käyttää palvelinkomponentteja elokuvatietojen hakemiseen ja suoratoistoon ilman asiakaspuolen ketjuja — käyttöliittymä renderöityy asteittain suositusten saapuessa.',
          },
          {
            name: 'React 19',
            role: 'Käyttöliittymäkirjasto',
            rationale:
              'React 19:n rinnakkaiset ominaisuudet pitävät testin käyttöliittymän responsiivisena raskaiden asynkronisten operaatioiden aikana. Actionien käyttö yksinkertaistaa lomakkeiden käsittelyä ja tilasiirtymiä koko sovelluksessa.',
            detail: null,
          },
          {
            name: 'XState',
            role: 'Tilanhallinta',
            rationale:
              '5 kysymyksen testi on mallinnettu formaaliksi tilakoneeksi. Tämä estää laittomia tilasiirtymiä ja tarjoaa selkeän, ennustettavan kulun monimutkaiselle haarautumislogiikalle.',
            detail:
              '@xstate/react:n käyttö mahdollistaa UI:n reagoinnin koneen tilamuutoksiin, käsitellen lataustilat ja siirtymät ilman yhtäkään "if (loading)" spagettikoodia.',
          },
          {
            name: 'Tailwind CSS 4',
            role: 'Tyylikerros',
            rationale:
              'Utility-first-tyylittely CSS-muuttujien design-tokeneilla totuuden lähteenä. Tailwind 4 generoi luokat dynaamisesti, kun taas tokenit kantavat semanttisen merkityksen teemoille.',
            detail:
              'Kaikki teemaan mukautuvat värit (vaalea/tumma tila) elävät CSS-muuttujissa. Yksittäinen className voi reagoida teemaan ilman JavaScriptia.',
          },
          {
            name: 'Motion',
            role: 'Animaatiot',
            rationale:
              'Entinen Framer Motion -kirjasto käsittelee kaikki jousipohjaiset siirtymät ja sisääntuloanimaatiot, varmistaen että käyttöliittymä tuntuu elävältä ja reagoivalta.',
            detail: null,
          },
          {
            name: 'Lucide React',
            role: 'Ikonisarja',
            rationale:
              'Puhdas, yhtenäinen ikonkirjasto, joka on täysin tree-shakeable ja optimoitu moderneille React-ympäristöille.',
            detail: null,
          },
        ],
      },
      {
        label: 'Tekoäly + Data',
        items: [
          {
            name: 'OpenAI text-embedding-3-large',
            role: 'Makuprofiilin koodaus',
            rationale:
              'Testivastaukset kootaan rakenteellisiksi syötteiksi ja koodataan 3072-ulotteisiksi vektoreiksi. Tämä tallentaa syvän semanttisen merkityksen: "perheen dynamiikka" ja "moraalinen monimutkaisuus" sijoittuvat lähelle toisiaan vektoriavaruudessa.',
            detail:
              'Vektorointipyyntö on ainoa AI-kutsu, joka estää käyttäjää. Kaikki muu suoritetaan asynkronisesti taustatyöntekijöissä.',
          },
          {
            name: 'gpt-5.4-mini',
            role: 'Selitysten generointi',
            rationale:
              'Generoi personoituja selityksiä jokaiselle suositukselle. gpt-5.4-mini tarjoaa poikkeuksellisen tasapainon nopeuden ja päättelylaadun välillä reaaliaikaisiin sovelluksiin.',
            detail:
              '6 selitystä per testilähety — koko gpt-5.4-mallin käyttö lisäisi latenssia. "Mini"-versio tarjoaa lähes välittömät tulokset.',
          },
          {
            name: 'PostgreSQL',
            role: 'Elokuvatietokanta',
            rationale:
              'Toimii 400+ kuratoidun elokuvan, metatietojen ja vektorien keskusvarastona. Kaiken tallentaminen yhteen relaatiotietokantaan yksinkertaistaa tietojen eheyttä ja ristiviittauksia.',
            detail: null,
          },
          {
            name: 'pgvector',
            role: 'Vektorihaku',
            rationale:
              'PostgreSQL-laajennus, joka mahdollistaa vektorisamankaltaisuushaun suoraan tietokannassamme. Tämä välttää erillisen vektoritietokannan hallinnan ylimääräiset kustannukset.',
            detail:
              'Kosinisamankaltaisuushaku löytää lähimmät naapurit käyttäjän makuvektorille alle 100ms suorituskyvyllä skaalassa.',
          },
        ],
      },
      {
        label: 'Infrastruktuuri',
        items: [
          {
            name: 'Redis',
            role: 'Tietovarasto',
            rationale:
              'Toimii taustatyötehtäviemme työvarastona ja globaalin nopeusrajoituksen koordinaatiokerroksena AI-putkilinjassamme.',
            detail:
              'Redis varmistaa, että jopa useilla worker-instansseilla emme koskaan ylitä OpenAI API:n token-per-minuutti- tai pyyntö-per-minuutti-kiintiöitä.',
          },
          {
            name: 'BullMQ',
            role: 'Työjono',
            rationale:
              'Käsittelee taustatyön aikataulutuksen, uudelleenyritykset ja vikasietoisuuden elokuvatietojen täydennys- ja löytämisputkelle.',
            detail: null,
          },
          {
            name: 'Railway',
            role: 'Käyttöönottofoorumi',
            rationale:
              'Tuotantoympäristö monisovellusarkkitehtuurillemme. Railway orkestroi Next.js-sovelluksen, worker-palvelut, PostgreSQL:n ja Redisin yhtenäisessä putkilinjassa.',
            detail:
              'Repositorio on yhdistetty Railwayn GitHub-integraation kautta, joka käyttää automaattisesti monorepon aina kun muutoksia työnnetään päähaaraan.',
          },
          {
            name: 'Turborepo',
            role: 'Rakennusjärjestelmä',
            rationale:
              'Hallinnoi monorepon rakennuksia korkean suorituskyvyn välimuistilla. Varmistaa, että jaetut paketit rakennetaan oikein ennen niitä kuluttavia sovelluksia.',
            detail: null,
          },
          {
            name: 'Docker',
            role: 'Kontitus',
            rationale:
              'Varmistaa yhtenäiset ympäristöt paikallisesta kehityksestä tuotantoon. Monivaiheiset Dockerfilet pitävät lopulliset tuotantokuvat kevyinä ja turvallisina.',
            detail: null,
          },
        ],
      },
      {
        label: 'Laatu',
        items: [
          {
            name: 'Vitest',
            role: 'Testikehys',
            rationale:
              'Vite-natiivi testikehys, joka tarjoaa lähes välittömän palautteen kehityksen aikana. Käsittelee yksikkö- ja integraatiotestit koko monorepon laajuudella.',
            detail: null,
          },
          {
            name: 'Playwright',
            role: 'E2E-testaus',
            rationale:
              'Varmistaa, että kriittinen polku testilähtyksestä elokuvasuosituksiin toimii moitteettomasti kaikissa moderneissa selainmoottoreissa.',
            detail: null,
          },
          {
            name: 'Storybook',
            role: 'Komponenttilaboratorio',
            rationale:
              'Mahdollistaa käyttöliittymäkomponenttien eristetyn kehityksen ja testauksen, varmistaen visuaalisen johdonmukaisuuden ja saavutettavuuden ennen integraatiota.',
            detail: null,
          },
          {
            name: 'MSW',
            role: 'API-simulointi',
            rationale:
              'Mock Service Worker sieppaa verkkopyyntöjä selaintasolla, mahdollistaen käyttöliittymän kehittämisen realististen API-vastausten perusteella ilman live-backendiä.',
            detail: null,
          },
        ],
      },
    ],
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
