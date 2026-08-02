// Plan Comptable Général (PCG) — Règlement n° 2014-03 du 5 juin 2014
// Mis à jour janvier 2023

export type CompteBase = { code: string; libelle: string; comptes?: CompteBase[] };

// ─── CLASSE 1 — COMPTES DE CAPITAUX ────────────────────────────────────────
export const CLASSE_1: CompteBase[] = [
  {
    code: "10", libelle: "Capital et réserves", comptes: [
      { code: "101", libelle: "Capital", comptes: [
        { code: "1011", libelle: "Capital souscrit — non appelé" },
        { code: "1012", libelle: "Capital souscrit — appelé, non versé" },
        { code: "1013", libelle: "Capital souscrit — appelé, versé", comptes: [
          { code: "10131", libelle: "Capital non amorti" },
          { code: "10132", libelle: "Capital amorti" },
        ]},
        { code: "1018", libelle: "Capital souscrit soumis à des réglementations particulières" },
      ]},
      { code: "102", libelle: "Fonds fiduciaires" },
      { code: "104", libelle: "Primes liées au capital social", comptes: [
        { code: "1041", libelle: "Primes d'émission" },
        { code: "1042", libelle: "Primes de fusion" },
        { code: "1043", libelle: "Primes d'apport" },
        { code: "1044", libelle: "Primes de conversion d'obligations en actions" },
        { code: "1045", libelle: "Bons de souscription d'actions" },
      ]},
      { code: "105", libelle: "Écarts de réévaluation", comptes: [
        { code: "1051", libelle: "Réserve spéciale de réévaluation" },
        { code: "1052", libelle: "Écart de réévaluation libre" },
        { code: "1053", libelle: "Réserve de réévaluation" },
        { code: "1055", libelle: "Écarts de réévaluation (autres opérations légales)" },
        { code: "1057", libelle: "Autres écarts de réévaluation en France" },
        { code: "1058", libelle: "Autres écarts de réévaluation à l'étranger" },
      ]},
      { code: "106", libelle: "Réserves", comptes: [
        { code: "1061", libelle: "Réserve légale", comptes: [
          { code: "10611", libelle: "Réserve légale proprement dite" },
          { code: "10612", libelle: "Plus-values nettes à long terme" },
        ]},
        { code: "1062", libelle: "Réserves indisponibles" },
        { code: "1063", libelle: "Réserves statutaires ou contractuelles" },
        { code: "1064", libelle: "Réserves réglementées", comptes: [
          { code: "10641", libelle: "Plus-values nettes à long terme" },
          { code: "10643", libelle: "Réserves consécutives à l'octroi de subventions d'investissement" },
          { code: "10648", libelle: "Autres réserves réglementées" },
        ]},
        { code: "1068", libelle: "Autres réserves", comptes: [
          { code: "10681", libelle: "Réserve de propre assureur" },
          { code: "10688", libelle: "Réserves diverses" },
        ]},
      ]},
      { code: "107", libelle: "Écart d'équivalence" },
      { code: "108", libelle: "Compte de l'exploitant" },
      { code: "109", libelle: "Actionnaires : capital souscrit — non appelé" },
    ],
  },
  {
    code: "11", libelle: "Report à nouveau (solde créditeur ou débiteur)", comptes: [
      { code: "110", libelle: "Report à nouveau (solde créditeur)" },
      { code: "119", libelle: "Report à nouveau (solde débiteur)" },
    ],
  },
  {
    code: "12", libelle: "Résultat de l'exercice (bénéfice ou perte)", comptes: [
      { code: "120", libelle: "Résultat de l'exercice (bénéfice)" },
      { code: "129", libelle: "Résultat de l'exercice (perte)" },
    ],
  },
  {
    code: "13", libelle: "Subventions d'investissement", comptes: [
      { code: "131", libelle: "Subventions d'équipement", comptes: [
        { code: "1311", libelle: "État" },
        { code: "1312", libelle: "Régions" },
        { code: "1313", libelle: "Départements" },
        { code: "1314", libelle: "Communes" },
        { code: "1315", libelle: "Collectivités publiques" },
        { code: "1316", libelle: "Entreprises publiques" },
        { code: "1317", libelle: "Entreprises et organismes privés" },
        { code: "1318", libelle: "Autres" },
      ]},
      { code: "138", libelle: "Autres subventions d'investissement" },
      { code: "139", libelle: "Subventions d'investissement inscrites au compte de résultat", comptes: [
        { code: "1391", libelle: "Subventions d'équipement", comptes: [
          { code: "13911", libelle: "État" },
          { code: "13912", libelle: "Régions" },
          { code: "13913", libelle: "Départements" },
          { code: "13914", libelle: "Communes" },
          { code: "13915", libelle: "Collectivités publiques" },
          { code: "13916", libelle: "Entreprises publiques" },
          { code: "13917", libelle: "Entreprises et organismes privés" },
          { code: "13918", libelle: "Autres" },
        ]},
        { code: "1398", libelle: "Autres subventions d'investissement" },
      ]},
    ],
  },
  {
    code: "14", libelle: "Provisions réglementées", comptes: [
      { code: "142", libelle: "Provisions réglementées relatives aux immobilisations", comptes: [
        { code: "1423", libelle: "Provisions pour reconstitution des gisements miniers et pétroliers" },
        { code: "1424", libelle: "Provisions pour investissement (participation des salariés)" },
      ]},
      { code: "143", libelle: "Provisions réglementées relatives aux stocks", comptes: [
        { code: "1431", libelle: "Hausse des prix" },
        { code: "1432", libelle: "Fluctuation des cours" },
      ]},
      { code: "144", libelle: "Provisions réglementées relatives aux autres éléments de l'actif" },
      { code: "145", libelle: "Amortissements dérogatoires" },
      { code: "146", libelle: "Provision spéciale de réévaluation" },
      { code: "147", libelle: "Plus-values réinvesties" },
      { code: "148", libelle: "Autres provisions réglementées" },
    ],
  },
  {
    code: "15", libelle: "Provisions", comptes: [
      { code: "151", libelle: "Provisions pour risques", comptes: [
        { code: "1511", libelle: "Provisions pour litiges" },
        { code: "1512", libelle: "Provisions pour garanties données aux clients" },
        { code: "1513", libelle: "Provisions pour pertes sur marchés à terme" },
        { code: "1514", libelle: "Provisions pour amendes et pénalités" },
        { code: "1515", libelle: "Provisions pour pertes de change" },
        { code: "1516", libelle: "Provisions pour pertes sur contrats" },
        { code: "1518", libelle: "Autres provisions pour risques" },
      ]},
      { code: "153", libelle: "Provisions pour pensions et obligations similaires" },
      { code: "154", libelle: "Provisions pour restructurations" },
      { code: "155", libelle: "Provisions pour impôts" },
      { code: "156", libelle: "Provisions pour renouvellement des immobilisations (entreprises concessionnaires)" },
      { code: "157", libelle: "Provisions pour charges à répartir sur plusieurs exercices", comptes: [
        { code: "1572", libelle: "Provisions pour gros entretien ou grandes révisions" },
      ]},
      { code: "158", libelle: "Autres provisions pour charges", comptes: [
        { code: "1581", libelle: "Provisions pour remises en état" },
      ]},
    ],
  },
  {
    code: "16", libelle: "Emprunts et dettes assimilées", comptes: [
      { code: "161", libelle: "Emprunts obligataires convertibles" },
      { code: "162", libelle: "Obligations représentatives de passifs nets remis en fiducie" },
      { code: "163", libelle: "Autres emprunts obligataires" },
      { code: "164", libelle: "Emprunts auprès des établissements de crédit" },
      { code: "165", libelle: "Dépôts et cautionnements reçus", comptes: [
        { code: "1651", libelle: "Dépôts" },
        { code: "1655", libelle: "Cautionnements" },
      ]},
      { code: "166", libelle: "Participation des salariés aux résultats", comptes: [
        { code: "1661", libelle: "Comptes bloqués" },
        { code: "1662", libelle: "Fonds de participation" },
      ]},
      { code: "167", libelle: "Emprunts et dettes assortis de conditions particulières", comptes: [
        { code: "1671", libelle: "Émissions de titres participatifs" },
        { code: "1674", libelle: "Avances conditionnées de l'État" },
        { code: "1675", libelle: "Emprunts participatifs" },
      ]},
      { code: "168", libelle: "Autres emprunts et dettes assimilées", comptes: [
        { code: "1681", libelle: "Autres emprunts" },
        { code: "1685", libelle: "Rentes viagères capitalisées" },
        { code: "1687", libelle: "Autres dettes" },
        { code: "1688", libelle: "Intérêts courus", comptes: [
          { code: "16881", libelle: "Sur emprunts obligataires convertibles" },
          { code: "16883", libelle: "Sur autres emprunts obligataires" },
          { code: "16884", libelle: "Sur emprunts auprès des établissements de crédit" },
          { code: "16885", libelle: "Sur dépôts et cautionnements reçus" },
          { code: "16886", libelle: "Sur participation des salariés aux résultats" },
          { code: "16887", libelle: "Sur emprunts et dettes assortis de conditions particulières" },
          { code: "16888", libelle: "Sur autres emprunts et dettes assimilées" },
        ]},
      ]},
      { code: "169", libelle: "Primes de remboursement des obligations" },
    ],
  },
  {
    code: "17", libelle: "Dettes rattachées à des participations", comptes: [
      { code: "171", libelle: "Dettes rattachées à des participations (groupe)" },
      { code: "174", libelle: "Dettes rattachées à des participations (hors groupe)" },
      { code: "178", libelle: "Dettes rattachées à des sociétés en participation", comptes: [
        { code: "1781", libelle: "Principal" },
        { code: "1788", libelle: "Intérêts courus" },
      ]},
    ],
  },
  {
    code: "18", libelle: "Comptes de liaison des établissements et sociétés en participation", comptes: [
      { code: "181", libelle: "Comptes de liaison des établissements" },
      { code: "186", libelle: "Biens et prestations de services échangés entre établissements (charges)" },
      { code: "187", libelle: "Biens et prestations de services échangés entre établissements (produits)" },
      { code: "188", libelle: "Comptes de liaison des sociétés en participation" },
    ],
  },
];

// ─── CLASSE 2 — COMPTES D'IMMOBILISATIONS ──────────────────────────────────
export const CLASSE_2: CompteBase[] = [
  {
    code: "20", libelle: "Immobilisations incorporelles", comptes: [
      { code: "201", libelle: "Frais d'établissement", comptes: [
        { code: "2011", libelle: "Frais de constitution" },
        { code: "2012", libelle: "Frais de premier établissement", comptes: [
          { code: "20121", libelle: "Frais de prospection" },
          { code: "20122", libelle: "Frais de publicité" },
        ]},
        { code: "2013", libelle: "Frais d'augmentation de capital et d'opérations diverses" },
      ]},
      { code: "203", libelle: "Frais de recherche et de développement" },
      { code: "205", libelle: "Concessions et droits similaires, brevets, licences, marques, procédés, logiciels, droits et valeurs similaires" },
      { code: "206", libelle: "Droit au bail" },
      { code: "207", libelle: "Fonds commercial" },
      { code: "208", libelle: "Autres immobilisations incorporelles" },
    ],
  },
  {
    code: "21", libelle: "Immobilisations corporelles", comptes: [
      { code: "211", libelle: "Terrains", comptes: [
        { code: "2111", libelle: "Terrains nus" },
        { code: "2112", libelle: "Terrains aménagés" },
        { code: "2113", libelle: "Sous-sols et sur-sols" },
        { code: "2114", libelle: "Terrains de carrières (tréfonds)" },
        { code: "2115", libelle: "Terrains bâtis" },
      ]},
      { code: "212", libelle: "Agencements et aménagements de terrains" },
      { code: "213", libelle: "Constructions", comptes: [
        { code: "2131", libelle: "Bâtiments" },
        { code: "2135", libelle: "Installations générales, agencements, aménagements des constructions" },
      ]},
      { code: "214", libelle: "Constructions sur sol d'autrui" },
      { code: "215", libelle: "Installations techniques, matériels et outillage industriels", comptes: [
        { code: "2151", libelle: "Installations complexes spécialisées" },
        { code: "2153", libelle: "Installations à caractère spécifique" },
        { code: "2154", libelle: "Matériel industriel" },
        { code: "2155", libelle: "Outillage industriel" },
        { code: "2157", libelle: "Agencements et aménagements du matériel et outillage industriels" },
      ]},
      { code: "218", libelle: "Autres immobilisations corporelles", comptes: [
        { code: "2181", libelle: "Installations générales, agencements, aménagements divers" },
        { code: "2182", libelle: "Matériel de transport" },
        { code: "2183", libelle: "Matériel de bureau et matériel informatique" },
        { code: "2184", libelle: "Mobilier" },
        { code: "2185", libelle: "Cheptel" },
        { code: "2186", libelle: "Emballages récupérables" },
        { code: "2187", libelle: "Mali de fusion sur actifs corporels" },
      ]},
    ],
  },
  { code: "22", libelle: "Immobilisations mises en concession" },
  {
    code: "23", libelle: "Immobilisations en cours", comptes: [
      { code: "231", libelle: "Immobilisations corporelles en cours" },
      { code: "232", libelle: "Immobilisations incorporelles en cours" },
      { code: "237", libelle: "Avances et acomptes versés sur commandes d'immobilisations corporelles" },
      { code: "238", libelle: "Avances et acomptes versés sur commandes d'immobilisations incorporelles" },
    ],
  },
  {
    code: "26", libelle: "Participations et créances rattachées à des participations", comptes: [
      { code: "261", libelle: "Titres de participation" },
      { code: "266", libelle: "Autres formes de participation" },
      { code: "267", libelle: "Créances rattachées à des participations" },
      { code: "268", libelle: "Créances rattachées à des sociétés en participation" },
      { code: "269", libelle: "Versements restant à effectuer sur titres de participation non libérées" },
    ],
  },
  {
    code: "27", libelle: "Autres immobilisations financières", comptes: [
      { code: "271", libelle: "Titres immobilisés autres que les titres immobilisés de l'activité de portefeuille" },
      { code: "272", libelle: "Titres immobilisés (droit de créance)" },
      { code: "273", libelle: "Titres immobilisés de l'activité de portefeuille" },
      { code: "274", libelle: "Prêts" },
      { code: "275", libelle: "Dépôts et cautionnements versés" },
      { code: "276", libelle: "Autres créances immobilisées" },
      { code: "277", libelle: "Actions propres ou parts propres" },
      { code: "279", libelle: "Versements restant à effectuer sur titres immobilisés non libérés" },
    ],
  },
  {
    code: "28", libelle: "Amortissements des immobilisations", comptes: [
      { code: "280", libelle: "Amortissements des immobilisations incorporelles" },
      { code: "281", libelle: "Amortissements des immobilisations corporelles" },
      { code: "282", libelle: "Amortissements des immobilisations mises en concession" },
    ],
  },
  {
    code: "29", libelle: "Dépréciations des immobilisations", comptes: [
      { code: "290", libelle: "Dépréciations des immobilisations incorporelles" },
      { code: "291", libelle: "Dépréciations des immobilisations corporelles" },
      { code: "293", libelle: "Dépréciations des immobilisations mises en concession" },
      { code: "296", libelle: "Dépréciations des participations et créances rattachées à des participations" },
      { code: "297", libelle: "Dépréciations des autres immobilisations financières" },
    ],
  },
];

// ─── CLASSE 3 — COMPTES DE STOCKS ET EN-COURS ──────────────────────────────
export const CLASSE_3: CompteBase[] = [
  {
    code: "31", libelle: "Matières premières (et fournitures)", comptes: [
      { code: "311", libelle: "Matière (ou groupe) A" },
      { code: "312", libelle: "Matière (ou groupe) B" },
      { code: "317", libelle: "Fournitures A, B, C…" },
    ],
  },
  {
    code: "32", libelle: "Autres approvisionnements", comptes: [
      { code: "321", libelle: "Matières consommables" },
      { code: "322", libelle: "Fournitures consommables", comptes: [
        { code: "3221", libelle: "Combustibles" },
        { code: "3222", libelle: "Produits d'entretien" },
        { code: "3223", libelle: "Fournitures d'atelier et d'usine" },
        { code: "3224", libelle: "Fournitures de magasin" },
        { code: "3225", libelle: "Fournitures de bureau" },
      ]},
      { code: "326", libelle: "Emballages" },
    ],
  },
  { code: "33", libelle: "En-cours de production de biens", comptes: [
    { code: "331", libelle: "Produits en cours" },
    { code: "335", libelle: "Travaux en cours" },
  ]},
  { code: "34", libelle: "En-cours de production de services", comptes: [
    { code: "341", libelle: "Études en cours" },
    { code: "345", libelle: "Prestations de services en cours" },
  ]},
  { code: "35", libelle: "Stocks de produits", comptes: [
    { code: "351", libelle: "Produits intermédiaires" },
    { code: "355", libelle: "Produits finis" },
    { code: "358", libelle: "Produits résiduels (ou matières de récupération)" },
  ]},
  { code: "37", libelle: "Stocks de marchandises", comptes: [
    { code: "371", libelle: "Marchandises (ou groupe) A" },
    { code: "372", libelle: "Marchandises (ou groupe) B" },
  ]},
  {
    code: "39", libelle: "Dépréciations des stocks et en-cours", comptes: [
      { code: "391", libelle: "Dépréciations des matières premières (et fournitures)" },
      { code: "392", libelle: "Dépréciations des autres approvisionnements" },
      { code: "393", libelle: "Dépréciations des en-cours de production de biens" },
      { code: "394", libelle: "Dépréciations des en-cours de production de services" },
      { code: "395", libelle: "Dépréciations des stocks de produits" },
      { code: "397", libelle: "Dépréciations des stocks de marchandises" },
    ],
  },
];

// ─── CLASSE 4 — COMPTES DE TIERS ──────────────────────────────────────────
export const CLASSE_4: CompteBase[] = [
  {
    code: "40", libelle: "Fournisseurs et comptes rattachés", comptes: [
      { code: "401", libelle: "Fournisseurs", comptes: [
        { code: "4011", libelle: "Fournisseurs — Achats de biens et prestations de services" },
        { code: "4017", libelle: "Fournisseurs — Retenues de garantie" },
      ]},
      { code: "403", libelle: "Fournisseurs — Effets à payer" },
      { code: "404", libelle: "Fournisseurs d'immobilisations", comptes: [
        { code: "4041", libelle: "Fournisseurs — Achats d'immobilisations" },
        { code: "4047", libelle: "Fournisseurs d'immobilisations — Retenues de garantie" },
      ]},
      { code: "405", libelle: "Fournisseurs d'immobilisations — Effets à payer" },
      { code: "408", libelle: "Fournisseurs — Factures non parvenues", comptes: [
        { code: "4081", libelle: "Fournisseurs" },
        { code: "4084", libelle: "Fournisseurs d'immobilisations" },
        { code: "4088", libelle: "Fournisseurs — Intérêts courus" },
      ]},
      { code: "409", libelle: "Fournisseurs débiteurs", comptes: [
        { code: "4091", libelle: "Fournisseurs — Avances et acomptes versés sur commandes" },
        { code: "4096", libelle: "Fournisseurs — Créances pour emballages et matériel à rendre" },
        { code: "4097", libelle: "Fournisseurs — Autres avoirs" },
        { code: "4098", libelle: "Rabais, remises, ristournes à obtenir et autres avoirs non encore reçus" },
      ]},
    ],
  },
  {
    code: "41", libelle: "Clients et comptes rattachés", comptes: [
      { code: "411", libelle: "Clients", comptes: [
        { code: "4111", libelle: "Clients — Ventes de biens ou de prestations de services" },
        { code: "4117", libelle: "Clients — Retenues de garantie" },
      ]},
      { code: "413", libelle: "Clients — Effets à recevoir" },
      { code: "416", libelle: "Clients douteux ou litigieux" },
      { code: "418", libelle: "Clients — Produits non encore facturés", comptes: [
        { code: "4181", libelle: "Clients — Factures à établir" },
        { code: "4188", libelle: "Clients — Intérêts courus" },
      ]},
      { code: "419", libelle: "Clients créditeurs", comptes: [
        { code: "4191", libelle: "Clients — Avances et acomptes reçus sur commandes" },
        { code: "4196", libelle: "Clients — Dettes sur emballages et matériels consignés" },
        { code: "4197", libelle: "Clients — Autres avoirs" },
        { code: "4198", libelle: "Rabais, remises, ristournes à accorder et autres avoirs à établir" },
      ]},
    ],
  },
  {
    code: "42", libelle: "Personnel et comptes rattachés", comptes: [
      { code: "421", libelle: "Personnel — Rémunérations dues" },
      { code: "422", libelle: "Comités d'entreprise, d'établissement…" },
      { code: "424", libelle: "Participation des salariés aux résultats" },
      { code: "425", libelle: "Personnel — Avances et acomptes" },
      { code: "426", libelle: "Personnel — Dépôts" },
      { code: "427", libelle: "Personnel — Oppositions" },
      { code: "428", libelle: "Personnel — Charges à payer et produits à recevoir", comptes: [
        { code: "4282", libelle: "Dettes provisionnées pour congés à payer" },
        { code: "4284", libelle: "Dettes provisionnées pour participation des salariés aux résultats" },
        { code: "4286", libelle: "Autres charges à payer" },
        { code: "4287", libelle: "Produits à recevoir" },
      ]},
    ],
  },
  {
    code: "43", libelle: "Sécurité sociale et autres organismes sociaux", comptes: [
      { code: "431", libelle: "Sécurité sociale" },
      { code: "437", libelle: "Autres organismes sociaux" },
      { code: "438", libelle: "Organismes sociaux — Charges à payer et produits à recevoir", comptes: [
        { code: "4382", libelle: "Charges sociales sur congés à payer" },
        { code: "4386", libelle: "Autres charges à payer" },
        { code: "4387", libelle: "Produits à recevoir" },
      ]},
    ],
  },
  {
    code: "44", libelle: "État et autres collectivités publiques", comptes: [
      { code: "441", libelle: "État — Subventions à recevoir", comptes: [
        { code: "4411", libelle: "Subventions d'investissement" },
        { code: "4417", libelle: "Subventions d'exploitation" },
        { code: "4418", libelle: "Subventions d'équilibre" },
        { code: "4419", libelle: "Avances sur subventions" },
      ]},
      { code: "442", libelle: "État — Impôts et taxes recouvrés pour le compte de l'État" },
      { code: "443", libelle: "Opérations particulières avec l'État, les collectivités publiques, les organismes internationaux" },
      { code: "444", libelle: "État — Impôts sur les bénéfices" },
      { code: "445", libelle: "État — Taxes sur le chiffre d'affaires", comptes: [
        { code: "4455", libelle: "Taxes sur le chiffre d'affaires à décaisser", comptes: [
          { code: "44551", libelle: "TVA à décaisser" },
          { code: "44558", libelle: "Taxes assimilées à la TVA" },
        ]},
        { code: "4456", libelle: "Taxes sur le chiffre d'affaires déductibles", comptes: [
          { code: "44562", libelle: "TVA sur immobilisations" },
          { code: "44566", libelle: "TVA sur autres biens et services" },
        ]},
        { code: "4457", libelle: "Taxes sur le chiffre d'affaires collectées par l'entreprise" },
        { code: "4458", libelle: "Taxes sur le chiffre d'affaires à régulariser ou en attente" },
      ]},
      { code: "447", libelle: "Autres impôts, taxes et versements assimilés" },
      { code: "448", libelle: "État — Charges à payer et produits à recevoir" },
    ],
  },
  {
    code: "48", libelle: "Comptes de régularisation", comptes: [
      { code: "481", libelle: "Charges à répartir sur plusieurs exercices" },
      { code: "486", libelle: "Charges constatées d'avance" },
      { code: "487", libelle: "Produits constatés d'avance" },
      { code: "488", libelle: "Comptes de répartition périodique des charges et des produits" },
    ],
  },
  {
    code: "49", libelle: "Dépréciations des comptes de tiers", comptes: [
      { code: "491", libelle: "Dépréciations des comptes de clients" },
      { code: "495", libelle: "Dépréciations des comptes du groupe et des associés" },
      { code: "496", libelle: "Dépréciations des comptes de débiteurs divers" },
    ],
  },
];

// ─── CLASSE 5 — COMPTES FINANCIERS ─────────────────────────────────────────
export const CLASSE_5: CompteBase[] = [
  {
    code: "50", libelle: "Valeurs mobilières de placement", comptes: [
      { code: "501", libelle: "Parts dans des entreprises liées" },
      { code: "502", libelle: "Actions propres" },
      { code: "503", libelle: "Actions" },
      { code: "504", libelle: "Autres titres conférant un droit de propriété" },
      { code: "505", libelle: "Obligations et bons émis par la société et rachetés par elle" },
      { code: "506", libelle: "Obligations" },
      { code: "507", libelle: "Bons du Trésor et bons de caisse à court terme" },
      { code: "508", libelle: "Autres valeurs mobilières de placement et créances assimilées" },
      { code: "509", libelle: "Versements restant à effectuer sur valeurs mobilières de placement non libérées" },
    ],
  },
  {
    code: "51", libelle: "Banques, établissements financiers et assimilés", comptes: [
      { code: "511", libelle: "Valeurs à l'encaissement", comptes: [
        { code: "5111", libelle: "Coupons échus à l'encaissement" },
        { code: "5112", libelle: "Chèques à encaisser" },
        { code: "5113", libelle: "Effets à l'encaissement" },
        { code: "5114", libelle: "Effets à l'escompte" },
      ]},
      { code: "512", libelle: "Banques", comptes: [
        { code: "5121", libelle: "Comptes en monnaie nationale" },
        { code: "5124", libelle: "Comptes en devises" },
      ]},
      { code: "514", libelle: "Chèques postaux" },
      { code: "515", libelle: "« Caisses » du Trésor et des établissements publics" },
      { code: "516", libelle: "Sociétés de bourse" },
      { code: "517", libelle: "Autres organismes financiers" },
      { code: "518", libelle: "Intérêts courus" },
      { code: "519", libelle: "Concours bancaires courants" },
    ],
  },
  {
    code: "52", libelle: "Instruments financiers à terme et jetons détenus", comptes: [
      { code: "521", libelle: "Instruments financiers à terme" },
      { code: "522", libelle: "Jetons détenus" },
      { code: "523", libelle: "Jetons auto-détenus" },
      { code: "524", libelle: "Jetons empruntés" },
    ],
  },
  {
    code: "53", libelle: "Caisse", comptes: [
      { code: "531", libelle: "Caisse siège social", comptes: [
        { code: "5311", libelle: "Caisse en monnaie nationale" },
        { code: "5314", libelle: "Caisse en devises" },
      ]},
      { code: "532", libelle: "Caisse succursale (ou usine) A" },
      { code: "533", libelle: "Caisse succursale (ou usine) B" },
    ],
  },
  { code: "54", libelle: "Régies d'avance et accréditifs" },
  { code: "58", libelle: "Virements internes" },
  {
    code: "59", libelle: "Dépréciations des comptes financiers", comptes: [
      { code: "590", libelle: "Dépréciations des valeurs mobilières de placement" },
    ],
  },
];

// ─── CLASSE 6 — COMPTES DE CHARGES ─────────────────────────────────────────
export const CLASSE_6: CompteBase[] = [
  {
    code: "60", libelle: "Achats (sauf 603)", comptes: [
      { code: "601", libelle: "Achats stockés — Matières premières (et fournitures)" },
      { code: "602", libelle: "Achats stockés — Autres approvisionnements" },
      { code: "603", libelle: "Variation des stocks (approvisionnements et marchandises)" },
      { code: "604", libelle: "Achats d'études et prestations de services" },
      { code: "605", libelle: "Achats de matériels, équipements et travaux" },
      { code: "606", libelle: "Achats non stockés de matières et fournitures" },
      { code: "607", libelle: "Achats de marchandises" },
      { code: "608", libelle: "Frais accessoires incorporés aux achats" },
      { code: "609", libelle: "Rabais, remises et ristournes obtenus sur achats" },
    ],
  },
  {
    code: "61", libelle: "Services extérieurs", comptes: [
      { code: "611", libelle: "Sous-traitance générale" },
      { code: "612", libelle: "Redevances de crédit-bail", comptes: [
        { code: "6122", libelle: "Crédit-bail mobilier" },
        { code: "6125", libelle: "Crédit-bail immobilier" },
      ]},
      { code: "613", libelle: "Locations" },
      { code: "614", libelle: "Charges locatives et de copropriété" },
      { code: "615", libelle: "Entretien et réparations" },
      { code: "616", libelle: "Primes d'assurance" },
      { code: "617", libelle: "Études et recherches" },
      { code: "618", libelle: "Divers" },
      { code: "619", libelle: "Rabais, remises et ristournes obtenus sur services extérieurs" },
    ],
  },
  {
    code: "62", libelle: "Autres services extérieurs", comptes: [
      { code: "621", libelle: "Personnel extérieur à l'entreprise" },
      { code: "622", libelle: "Rémunérations d'intermédiaires et honoraires" },
      { code: "623", libelle: "Publicité, publications, relations publiques" },
      { code: "624", libelle: "Transports de biens et transports collectifs du personnel" },
      { code: "625", libelle: "Déplacements, missions et réceptions" },
      { code: "626", libelle: "Frais postaux et de télécommunications" },
      { code: "627", libelle: "Services bancaires et assimilés" },
      { code: "628", libelle: "Divers" },
      { code: "629", libelle: "Rabais, remises et ristournes obtenus sur autres services extérieurs" },
    ],
  },
  {
    code: "63", libelle: "Impôts, taxes et versements assimilés", comptes: [
      { code: "631", libelle: "Impôts, taxes et versements assimilés sur rémunérations" },
      { code: "633", libelle: "Impôts, taxes et versements assimilés sur rémunérations (autres organismes)" },
      { code: "635", libelle: "Autres impôts, taxes et versements assimilés" },
      { code: "637", libelle: "Autres impôts, taxes et versements assimilés" },
    ],
  },
  {
    code: "64", libelle: "Charges de personnel", comptes: [
      { code: "641", libelle: "Rémunérations du personnel" },
      { code: "644", libelle: "Rémunération du travail de l'exploitant" },
      { code: "645", libelle: "Charges de Sécurité sociale et de prévoyance", comptes: [
        { code: "6451", libelle: "Cotisations à l'URSSAF" },
        { code: "6452", libelle: "Cotisations aux mutuelles" },
        { code: "6453", libelle: "Cotisations aux caisses de retraite" },
        { code: "6454", libelle: "Cotisations aux ASSEDIC" },
      ]},
      { code: "646", libelle: "Cotisations sociales personnelles de l'exploitant" },
      { code: "647", libelle: "Autres charges sociales" },
      { code: "648", libelle: "Autres charges de personnel" },
    ],
  },
  {
    code: "65", libelle: "Autres charges de gestion courante", comptes: [
      { code: "651", libelle: "Redevances pour concessions, brevets, licences, marques, procédés, droits et valeurs similaires" },
      { code: "653", libelle: "Jetons de présence" },
      { code: "654", libelle: "Pertes sur créances irrécouvrables" },
      { code: "655", libelle: "Quote-part de résultat sur opérations faites en commun" },
      { code: "658", libelle: "Charges diverses de gestion courante" },
    ],
  },
  {
    code: "66", libelle: "Charges financières", comptes: [
      { code: "661", libelle: "Charges d'intérêts" },
      { code: "664", libelle: "Pertes sur créances liées aux participations" },
      { code: "665", libelle: "Escomptes accordés" },
      { code: "666", libelle: "Pertes de change financières" },
      { code: "667", libelle: "Charges nettes sur cessions de valeurs mobilières de placement" },
      { code: "668", libelle: "Autres charges financières" },
    ],
  },
  {
    code: "67", libelle: "Charges exceptionnelles", comptes: [
      { code: "671", libelle: "Charges exceptionnelles sur opérations de gestion" },
      { code: "672", libelle: "Compte mis à la disposition des entités pour enregistrer, en cours d'exercice, les charges sur exercices antérieurs" },
      { code: "675", libelle: "Valeurs comptables des éléments d'actif cédés" },
      { code: "678", libelle: "Autres charges exceptionnelles" },
    ],
  },
  {
    code: "68", libelle: "Dotations aux amortissements, dépréciations et provisions", comptes: [
      { code: "681", libelle: "Dotations aux amortissements, dépréciations et provisions — Charges d'exploitation" },
      { code: "686", libelle: "Dotations aux amortissements, dépréciations et provisions — Charges financières" },
      { code: "687", libelle: "Dotations aux amortissements, dépréciations et provisions — Charges exceptionnelles" },
    ],
  },
  {
    code: "69", libelle: "Participation des salariés — Impôts sur les bénéfices et assimilés", comptes: [
      { code: "691", libelle: "Participation des salariés aux résultats" },
      { code: "695", libelle: "Impôts sur les bénéfices" },
      { code: "696", libelle: "Imposition forfaitaire sur les entreprises de réseaux" },
      { code: "698", libelle: "Intégration fiscale" },
      { code: "699", libelle: "Produits — Reports en arrière des déficits" },
    ],
  },
];

// ─── CLASSE 7 — COMPTES DE PRODUITS ─────────────────────────────────────────
export const CLASSE_7: CompteBase[] = [
  {
    code: "70", libelle: "Ventes de produits fabriqués, prestations de services, marchandises", comptes: [
      { code: "701", libelle: "Ventes de produits finis" },
      { code: "702", libelle: "Ventes de produits intermédiaires" },
      { code: "703", libelle: "Ventes de produits résiduels" },
      { code: "704", libelle: "Travaux" },
      { code: "705", libelle: "Études" },
      { code: "706", libelle: "Prestations de services" },
      { code: "707", libelle: "Ventes de marchandises" },
      { code: "708", libelle: "Produits des activités annexes" },
      { code: "709", libelle: "Rabais, remises et ristournes accordés par l'entreprise" },
    ],
  },
  {
    code: "71", libelle: "Production stockée (ou déstockage)", comptes: [
      { code: "713", libelle: "Variation des stocks (en-cours de production, produits)" },
    ],
  },
  {
    code: "72", libelle: "Production immobilisée", comptes: [
      { code: "721", libelle: "Immobilisations incorporelles" },
      { code: "722", libelle: "Immobilisations corporelles" },
    ],
  },
  {
    code: "74", libelle: "Subventions d'exploitation", comptes: [
      { code: "741", libelle: "Subventions d'exploitation" },
    ],
  },
  {
    code: "75", libelle: "Autres produits de gestion courante", comptes: [
      { code: "751", libelle: "Redevances pour concessions, brevets, licences, marques, procédés, droits et valeurs similaires" },
      { code: "752", libelle: "Revenus des immeubles non affectés à des activités professionnelles" },
      { code: "753", libelle: "Jetons de présence et rémunérations d'administrateurs, gérants…" },
      { code: "754", libelle: "Ristournes perçues des coopératives" },
      { code: "755", libelle: "Quotes-parts de résultat sur opérations faites en commun" },
      { code: "756", libelle: "Gains de change sur créances et dettes commerciales" },
      { code: "758", libelle: "Produits divers de gestion courante" },
    ],
  },
  {
    code: "76", libelle: "Produits financiers", comptes: [
      { code: "761", libelle: "Produits de participations" },
      { code: "762", libelle: "Produits des autres immobilisations financières" },
      { code: "763", libelle: "Revenus des autres créances" },
      { code: "764", libelle: "Revenus des valeurs mobilières de placement" },
      { code: "765", libelle: "Escomptes obtenus" },
      { code: "766", libelle: "Gains de change financiers" },
      { code: "767", libelle: "Produits nets sur cessions de valeurs mobilières de placement" },
      { code: "768", libelle: "Autres produits financiers" },
    ],
  },
  {
    code: "77", libelle: "Produits exceptionnels", comptes: [
      { code: "771", libelle: "Produits exceptionnels sur opérations de gestion" },
      { code: "772", libelle: "Compte mis à la disposition des entités pour enregistrer, en cours d'exercice, les produits sur exercices antérieurs" },
      { code: "775", libelle: "Produits des cessions d'éléments d'actif" },
      { code: "777", libelle: "Quote-part des subventions d'investissement virée au résultat de l'exercice" },
      { code: "778", libelle: "Autres produits exceptionnels" },
    ],
  },
  {
    code: "78", libelle: "Reprises sur amortissements, dépréciations et provisions", comptes: [
      { code: "781", libelle: "Reprises sur amortissements, dépréciations et provisions (à inscrire dans les produits d'exploitation)" },
      { code: "786", libelle: "Reprises sur dépréciations et provisions (à inscrire dans les produits financiers)" },
      { code: "787", libelle: "Reprises sur dépréciations et provisions (à inscrire dans les produits exceptionnels)" },
    ],
  },
  {
    code: "79", libelle: "Transferts de charges", comptes: [
      { code: "791", libelle: "Transferts de charges d'exploitation" },
      { code: "796", libelle: "Transferts de charges financières" },
      { code: "797", libelle: "Transferts de charges exceptionnelles" },
    ],
  },
];

// ─── CLASSE 8 — COMPTES SPÉCIAUX ──────────────────────────────────────────
export const CLASSE_8: CompteBase[] = [
  {
    code: "80", libelle: "Engagements", comptes: [
      { code: "801", libelle: "Engagements donnés par l'entité", comptes: [
        { code: "8011", libelle: "Avals, cautions, garanties" },
        { code: "8014", libelle: "Effets circulant sous l'endos de l'entité" },
        { code: "8016", libelle: "Redevances crédit-bail restant à courir" },
        { code: "8018", libelle: "Autres engagements donnés" },
      ]},
      { code: "802", libelle: "Engagements reçus par l'entité", comptes: [
        { code: "8021", libelle: "Avals, cautions, garanties" },
        { code: "8024", libelle: "Créances escomptées non échues" },
        { code: "8026", libelle: "Engagements reçus pour utilisation en crédit-bail" },
        { code: "8028", libelle: "Autres engagements reçus" },
      ]},
      { code: "809", libelle: "Contrepartie des engagements" },
    ],
  },
  { code: "88", libelle: "Résultat en instance d'affectation" },
  {
    code: "89", libelle: "Bilan", comptes: [
      { code: "890", libelle: "Bilan d'ouverture" },
      { code: "891", libelle: "Bilan de clôture" },
    ],
  },
];

// ─── Plan complet ───────────────────────────────────────────────────────────
export const PLAN_COMPTABLE = [
  { classe: "1", libelle: "Comptes de capitaux", comptes: CLASSE_1 },
  { classe: "2", libelle: "Comptes d'immobilisations", comptes: CLASSE_2 },
  { classe: "3", libelle: "Comptes de stocks et en-cours", comptes: CLASSE_3 },
  { classe: "4", libelle: "Comptes de tiers", comptes: CLASSE_4 },
  { classe: "5", libelle: "Comptes financiers", comptes: CLASSE_5 },
  { classe: "6", libelle: "Comptes de charges", comptes: CLASSE_6 },
  { classe: "7", libelle: "Comptes de produits", comptes: CLASSE_7 },
  { classe: "8", libelle: "Comptes spéciaux", comptes: CLASSE_8 },
];

// ─── Correspondance bilan ↔ comptes PCG ────────────────────────────────────
// Utilisé pour afficher les numéros de compte à côté des champs du bilan.
export const BILAN_CODES: Record<string, string> = {
  // Actif immobilisé
  immobIncorporellesBrut:      "20x",
  immobIncorporellesAmort:     "280x",
  immobCorporellesBrut:        "21x",
  immobCorporellesAmort:       "281x",
  immobFinancieresBrut:        "26x, 27x",
  immobFinancieresAmort:       "296x, 297x",
  capitalSouscritNonAppele:    "109",
  // Actif circulant
  stocksEnCours:               "3x",
  avancesAcomptesVerses:       "4091",
  creancesClientsManuel:       "411, 416",
  autresCreances:              "4xx",
  valeursMobilieresPlacement:  "50x",
  disponibilites:              "512, 514, 531",
  chargesConstateesAvance:     "486",
  // Capitaux propres
  capitalSocial:               "101",
  primesEmissionFusionApport:  "104",
  reserves:                    "106",
  reportANouveau:              "110 / 119",
  subventionsInvestissement:   "13x",
  provisionsReglementees:      "14x",
  // Dettes
  provisionsRisquesCharges:    "15x",
  empruntsDettesEtablissementsCredit: "164",
  empruntsDettesFinancieresDiverses:  "168x",
  avancesAcomptesRecus:        "4191",
  dettesFournisseursManuel:    "401, 404",
  dettesFiscalesSociales:      "42x, 43x, 44x",
  autresDettes:                "4xx",
  produitsConstatesAvance:     "487",
  // Compte de résultat — produits
  venteMarchandises:           "707",
  productionStockee:           "71x",
  productionImmobilisee:       "72x",
  subventionsExploitation:     "74x",
  reprisesProvisions:          "78x",
  autresProduitsExploitation:  "75x",
  // Compte de résultat — charges
  variationStock:              "603",
  impotsTaxesVersementsAssimiles: "63x",
  salairesTraitements:         "641",
  chargesSociales:             "645x",
  dotationsAmortissementsProvisions: "681",
  autresChargesExploitation:   "65x",
  // Financier / exceptionnel
  produitsFinanciers:          "76x",
  chargesFinancieres:          "66x",
  produitsExceptionnels:       "77x",
  chargesExceptionnelles:      "67x",
  participationSalaries:       "691",
  impotsBenefices:             "695",
};
