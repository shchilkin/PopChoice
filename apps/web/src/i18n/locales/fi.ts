import { en, type Translations } from './en';

export const fi: Translations = {
  nav: {
    howItWorks: 'Miten se toimii',
    availableMovies: 'Elokuvat',
    findAMovie: 'Etsi elokuva',
    signUp: 'Rekisteröidy',
    toggleTheme: 'Vaihda teema',
    switchLanguage: 'Vaihda kieli',
    openMenu: 'Avaa valikko',
    closeMenu: 'Sulje valikko',
    styleGuide: 'Designjärjestelmä',
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
    badge: 'Tekoäly löytää sinulle sopivan elokuvan',
    descriptionPre: 'Viisi kysymystä kertoo maustasi. Tekoäly löytää',
    perfectMovie: 'täydellisen elokuvan',
    descriptionPost: 'yli 400 analysoidun elokuvan joukosta. Yksin tai ryhmässä.',
    findMyMovie: 'Löydä elokuvani',
    howItWorks: 'Miten se toimii',
    noSignup: 'Ei rekisteröitymistä · ~60 sekuntia · Toimii puhelimella',
  },
  features: {
    headline: 'Ei suodatin. Täsmäys.',
    subheadline: 'Tunnelma, rytmi, tyyli — koodattuna 5 kysymykseen, haettuna tekoälyllä.',
    aiPowered: {
      title: 'Maku, ei tagit',
      desc: 'Vastauksistasi muodostuu makuprofiili, jota verrataan ennalta analysoituihin elokuviin tunteen, rytmin ja tyylin perusteella — ei genrelaatikoihin.',
    },
    fiveQuestions: {
      title: 'Viisi kysymystä',
      desc: 'Lempifilmi, aikakausi, mieliala, sävy, näyttelijä. Kuusikymmentä sekuntia rakentaa makuprofiilin, jolla hakeminen onnistuu.',
    },
    groupMode: {
      title: 'Ryhmätila',
      desc: 'Jokainen vastaa samalla laitteella. PopChoice löytää kohdan, jossa maut kohtaavat — ei väittelyä, ei arvontaa.',
      worksFor: 'Sopii 2–6 henkilölle',
    },
    instantResults: {
      title: 'Kuusi harkittua ehdotusta',
      desc: 'Paras osuma ja viisi vaihtoehtoa — jokaiselle tekoälyn kirjoittama selitys, miksi juuri tämä elokuva sopii sinulle.',
    },
  },
  cta: {
    headline: 'Oikea elokuva löytyy sieltä. Anna tekoälyn etsiä se.',
    description:
      '60 sekuntia, 5 kysymystä. Toimii sekä yksin katsomiseen että ryhmän elokuvaväittelyn ratkaisemiseen.',
    button: 'Löydä elokuvani',
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
    morePicksStalled: 'Kestää liian kauan — yritä myöhemmin uudelleen.',
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
          a: 'PopChoicea voi käyttää ilman rekisteröitymistä — vastaa vain testiin ja saat suosituksesi. Voit halutessasi luoda ilmaisen tilin tallentaaksesi tuloksesi.',
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
  styleGuide: {
    title: 'Designjärjestelmä',
    description:
      'Elokuvatasoisen suosittelusovelluksen visuaalinen kieli. Kulta signaalina, Oswald auktoriteettina, Manrope lämpönä. Kaksi tasavertaista teemaa. Yksi sääntö: tasainen lepotilassa, syvyys tilassa.',
    componentsTitle: 'Komponentit',
    componentsDescription: 'Kaikki uudelleenkäytettävät UI-komponentit propseillaan ja tiloineen.',
    footerTokens: 'PopChoice-designjärjestelmä: suunnittelutokenit ja komponentit',
    footerComponents: 'PopChoice-designjärjestelmä: interaktiivinen komponenttikirjasto',
    backLink: '← Designjärjestelmä',
    forwardLink: 'Komponentit →',
    nav: {
      brandPalette: 'Väripaletti',
      typography: 'Typografia',
      buttons: 'Painikkeet',
      progressDots: 'Edistymispisteet',
      components: 'Komponentit',
    },
    sections: {
      brandVoice: 'Brändin ääni',
      mascot: 'Maskotti',
      brandPalette: 'Brändipaletti',
      backgrounds: 'Taustat',
      textColors: 'Tekstivärit',
      brandColors: 'Brändivärit',
      gradients: 'Gradientit',
      typography: 'Typografia',
      buttons: 'Painikkeet',
      ageRatingChips: 'Ikärajasirut',
      progressDots: 'Edistymispisteet',
      borders: 'Reunukset',
      shadows: 'Varjot',
      goldAccentStates: 'Kultatehosteet',
      spacingScale: 'Välimatka-asteikko',
      borderRadius: 'Reunojen pyöristys',
      headerControls: 'Otsikkoelementit',
      breadcrumbs: 'Polkuelementit',
      tmdbAttribution: 'TMDB-attribuutio',
      similarityBadge: 'Samankaltaisuusmerkki',
      starRating: 'Tähtiarvio',
      ageRatingPill: 'Ikärajapilli',
      movieCards: 'Elokuvakortit',
      skeletonLoading: 'Luuranko / lataaustilat',
      aiContentBlock: 'Tekoälysisältölohko',
      alertBanners: 'Ilmoitusbannereita',
      featureCards: 'Ominaisuuskortit',
      genreSelector: 'Genrevalitsin',
      toneSelector: 'Sävyvalitsin',
      eraSelector: 'Aikakausivalitsin',
      textInputs: 'Tekstikentät',
      numberBadge: 'Numeromerkki',
      quizNavigation: 'Tietokilpailun navigointi',
      stepHeaderPattern: 'Vaiheen otsikkorakenne',
    },
    voice: {
      cinematic: {
        word: 'Elokuvallinen',
        desc: 'Herättää oikean elokuvateatterin tunteen kopioimatta sen estetiikkaa. Typografia on elokuvan nimi; paletti on mainoskyltti yöllä. Ei suoratoistopalvelun tummansininen. Ei elokuvafestivaalien teeskentely.',
      },
      confident: {
        word: 'Vakuuttava',
        desc: 'Tuotteella on mielipiteitä. Teksti sanoo "oikea elokuva on siellä" eikä "luulemme, että saatat pitää." Oswald julistaa eikä epäile. Yksi CTA, selvästi kultainen, pinnalla joka ei kilpaile.',
      },
      playful: {
        word: 'Leikkisä',
        desc: 'Ilo elää yksityiskohdissa: konfettiräjähdys, muuttuva edistymispiste, latausvinkit. Persoonallisuus ansaitaan tarkkuudella, ei kovaäänisellä koristeella tai emojilla laajassa mittakaavassa.',
      },
    },
    principles: {
      p01: {
        title: 'Kulta signaalina',
        body: 'Kultaa on enintään 10 % mistä tahansa näytöstä: CTA:t, aktiiviset tilat, logon sanamerkki. Sen harvinaisuus tekee siitä tarkoituksen signaalin. Kun kultaa ilmestyy, jokin on tärkeää.',
      },
      p02: {
        title: 'Oswald julistaa, Manrope keskustelee',
        body: 'Tiivistetty versaalijärjestys auktoriteetti otsikoille, lämmin humanistinen luettavuus kaikkeen keskustelevaan. Pari on Cinematic Concierge typografisessa muodossa: luottavainen otsikko, lämmin ääni.',
      },
      p03: {
        title: 'Kaksi tasavertaista teemaa',
        body: 'Lämmin pergamentti ja viileä keskiyö: molemmat tarkoituksellisia, molemmille annetaan yhtäläinen visuaalinen huomio. Kumpikaan ei ole tumman tilan kytkin jälkikäteen lisätty.',
      },
      p04: {
        title: 'Tasainen levossa, syvyys tilassa',
        body: 'Pinnat ovat tasaisia. Kortin varjo on hiljainen vihje. Ainoastaan CTA kantaa ilmeikästä kultahehkua. Ei koristeellista syvyyttä. Vain syvyyttä joka ansaitsee paikkansa.',
      },
    },
    tokens: {
      pageBackground: 'Sivun tausta',
      cardSurface: 'Kortti / pinta',
      hoveredSurface: 'Pinta hover-tilassa',
      deepSurface: 'Syvä / sisäkkäinen pinta',
      subtleInteractive: 'Hienovarainen interaktiivinen täyttö',
      primaryText: 'Ensisijainen teksti',
      secondaryText: 'Toissijainen teksti',
      tertiaryText: 'Kolmansijainen teksti',
      mutedText: 'Vaimea teksti',
      goldText: 'Kultainen teksti (saavutettava)',
      amberText: 'Meripihkainen teksti (saavutettava)',
      ctaGradient: 'CTA',
      ctaHorizontal: 'CTA vaakasuuntainen',
      progressGradient: 'Edistyminen',
      subtleBorder: 'bd1 — subtle',
      defaultBorder: 'bd2 — default',
      mediumBorder: 'bd3 — medium',
      strongBorder: 'bd4 — strong',
      cardShadow: 'Kortin varjo',
      ctaShadow: 'CTA-varjo',
      ctaShadowHover: 'CTA-varjo hover-tilassa',
    },
    typo: {
      oswaldLabel: 'Oswald — Otsikot',
      manropeLabel: 'Manrope — Teksti / UI',
      sizes: 'Koot',
      allRatings: 'Kaikki ikärajat',
    },
    btns: {
      ctaButton: 'CTA-painike',
      defaultButton: 'Oletusnäppäin',
      ghostButton: 'Ghost-painike',
      ctaDisabled: 'CTA poissa käytöstä',
      defaultDisabled: 'Oletus poissa käytöstä',
      ghostDisabled: 'Ghost poissa käytöstä',
    },
    ageChip: {
      note: 'AgeRatingChip — semanttinen väri per ikärajataso (G=vihreä, PG=turkoosi, R=punainen jne.). Käytetään MoviesTable-komponentissa ja yksityiskohtanäkymissä, joissa ikäraja kantaa merkitystä. Neutraalille pillille käytä AgeRatingPillä (ks. Komponentit-sivu).',
      sizes: 'Koot',
      allRatings: 'Kaikki ikärajat',
    },
    progress: {
      step1: 'Vaihe 1 / 5',
      step3: 'Vaihe 3 / 5',
      step5: 'Vaihe 5 / 5',
    },
    mascotSection: {
      name: 'Popcorn',
      desc: 'Raidoitettu elokuvateatteriämpäri, välittömästi tunnistettava ja aidosti innostunut. Ei logo. Hahmo. Cinematic Concierge fyysisenä hahmona: luottavainen muoto, lämpimät kultaiset jyvät, raitorakenne lainattu klassisesta elokuvateatteriämpäristä.',
      clickIt: 'Klikkaa sitä.',
      stripeColorsLabel: 'Raitojen värit',
      stripeColorsValue:
        'Punainen #f20000 ja valkoinen — klassinen elokuvateatteriämpäri, ilman epäilyksiä.',
      kernelFillLabel: 'Ytimien täyttö',
      kernelFillValue:
        'Kultainen #F7B017 — suoraan kartoitettu brändin aksenttiväriin. Sama sävy, sama signaali.',
      interactionLabel: 'Vuorovaikutus',
      interactionValue:
        'Klikkaus laukaisee kultaisen konfettiräjähdyksen. Ilo joka on ansaittu, ei koristeellinen — se laukeaa vain kun itse valitset sen.',
      usageLabel: 'Käyttö',
      usageValue: 'Hero, CTA-osio, lataus- ja tyhjät tilat. Aina levossa — kunnes kutsutaan.',
    },
    comp: {
      mascotNote: 'Klikkaa maskottia käynnistääksesi konfetti. Hyväksyy width- ja height-propsit.',
      breadcrumbsNote:
        'Käyttää Oswald condensed uppercase text-xs / tracking-[0.12em] -arvoilla. Viimeinen elementti on aria-current="page", ilman linkkiä.',
      ageRatingPillNote:
        'AgeRatingPill — neutraali, ilman värisemantikkaa. Käytetään SmallSuggestionCard-komponentissa, jossa tila on rajallinen. AgeRatingChip — semanttinen väri per vyöhyke. Käytetään MoviesTable-komponentissa ja yksityiskohtanäkymissä, joissa ikäraja on ensisijainen datapiste (ks. Designjärjestelmä).',
      movieCardsNote:
        'Klikkaa vaihtaaksesi aktiivisen tilan. SmallSuggestionCard käytetään tulosten vieritysrivillä.',
      movieCardsLabel: 'SmallSuggestionCard — aktiivinen / ei-aktiivinen tilat',
      stateLabel: 'Tila:',
      loading: 'Ladataan',
      loaded: 'Ladattu',
      aiBlockContent:
        'Christopher Nolanin mieltä taivuttava trilleri seuraa taitavaa varasta, joka varastaa salaisuuksia unista. Täydellinen valinta älyllisen scifin ystäville, jotka arvostavat hengästyttäviä visuaaleja.',
      aiBlockLabel:
        'var(--pc-ai-bg) / var(--pc-ai-bd) — käytetään tekoälyn tuottamissa kuvauksissa',
      aiPickLabel: 'Tekoälyn valinta',
      alertInfo: 'Elokuvatietokanta latautuu — näytetään välimuistissa olevat tulokset.',
      alertWarning: 'Joitakin elokuvapostereita ei voitu ladata TMDB:stä.',
      alertError: 'Suosittelupalvelu ei ole käytettävissä. Yritä uudelleen.',
      featureCardsNote:
        'Käytetään FeaturesSection-komponentissa aloitussivulla. Propsit: icon: LucideIcon, title: string, desc: string, color: string (brändin hex palette-kokoelmasta). Ikonin sävy ja tausta johdetaan color-arvosta alpha-suffixilla.',
      featureCardsLabel:
        'FeatureCard — tasainen levossa, ikoni sävy color-arvolle, pinta var(--pc-surface)',
      featureAiTitle: 'Tekoälypohjainen',
      featureAiDesc: 'Käyttää OpenAI-vektoreita älykkäisiin suosituksiin',
      featureQuestionsTitle: '5 kysymystä',
      featureQuestionsDesc: 'Vastaa lyhyeen tietokilpailuun personoituja ehdotuksia varten',
      featureGroupTitle: 'Ryhmätila',
      featureGroupDesc: 'Löydä elokuva, josta kaikki ryhmässä pitävät',
      featureInstantTitle: 'Välittömät tulokset',
      featureInstantDesc: 'Saat suosituksia sekunneissa, ei minuuteissa',
      genreSelectorNote: 'Monivalinta. Klikkaa vaihtaaksesi genre. Käytetään MoodStep-vaiheessa.',
      toneSelectorNote: 'Yksivalinta. Klikkaa valitaksesi sävyn. Käytetään ToneStep-vaiheessa.',
      eraSelectorNote:
        'Yksivalinta. Klikkaa valitaksesi elokuvan aikakausi. Käytetään EraStep-vaiheessa.',
      inputFavouriteMovie: 'Lempielokuva',
      inputFavouriteActor: 'Lempinäyttelijä',
      inputWithNumberBadge: 'Numeromerkillä',
      inputsLabel: 'Oletus · fokus: kultainen reunus + rengas · käytetään tietokilpailun vaiheissa',
      numberBadgeNote: 'Käytetään GroupSetup-vaiheessa osallistujien merkitsemiseen.',
      quizNavCanProceed: 'Voidaan jatkaa · kesken tietokilpailu',
      quizNavCannotProceed: 'Ei voida jatkaa',
      quizNavLastStep: 'Viimeinen vaihe · lähetetään',
      stepHeaderNote:
        'Ikonimerkki + Oswald-otsikko käytetään kaikkien tietokilpailun vaiheotsikkojen kanssa.',
      similarity95: '95%+ — Teal',
      similarity90: '90–94% — Gold',
      similarity85: '85–89% — Amber',
      similarityLow: '< 85% — Purple',
      breadcrumbHome: 'Etusivu',
      breadcrumbQuiz: 'Tietokilpailu',
      breadcrumbResults: 'Tulokset',
      breadcrumbStyleGuide: 'Designjärjestelmä',
      skeletonMoviesNote: 'MoviesTableSkeleton / MoviesTable',
      skeletonCardNote: 'SkeletonCard / SmallSuggestionCard',
    },
  },
  register: {
    title: 'Luo tili',
    subtitle: 'Tallenna suosikkisi ja löydä lisää',
    emailLabel: 'Sähköpostiosoite',
    emailPlaceholder: 'sinä@esimerkki.fi',
    passwordLabel: 'Salasana',
    passwordPlaceholder: 'Vähintään 8 merkkiä',
    confirmPasswordLabel: 'Vahvista salasana',
    confirmPasswordPlaceholder: 'Toista salasanasi',
    submitButton: 'Luo tili',
    submitting: 'Luodaan tiliä…',
    successTitle: 'Tili luotu!',
    successMessage: 'Voit nyt kirjautua PopChoiceen.',
    backToHome: 'Etusivulle',
    errors: {
      emailRequired: 'Sähköpostiosoite vaaditaan.',
      emailInvalid: 'Anna kelvollinen sähköpostiosoite.',
      passwordRequired: 'Salasana vaaditaan.',
      passwordTooShort: 'Salasanan on oltava vähintään 8 merkkiä.',
      confirmPasswordRequired: 'Vahvista salasanasi.',
      passwordMismatch: 'Salasanat eivät täsmää.',
      emailTaken: 'Tämä sähköpostiosoite on jo rekisteröity.',
      generic: 'Jokin meni pieleen. Yritä uudelleen.',
    },
  },
};
