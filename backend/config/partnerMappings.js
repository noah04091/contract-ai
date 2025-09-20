// backend/config/partnerMappings.js
// ERWEITERTE VERSION MIT STRENGSTER VALIDIERUNG

const PARTNER_ID = process.env.CHECK24_PARTNER_ID || '1157688';
const TARIFCHECK_ID = process.env.TARIFCHECK_PARTNER_ID || '193010';

// 🆕 Debug Logging für Partner IDs
console.log('🔧 Partner IDs geladen:', {
  CHECK24: PARTNER_ID,
  TARIFCHECK: TARIFCHECK_ID,
  FROM_ENV: {
    CHECK24: process.env.CHECK24_PARTNER_ID ? 'YES' : 'NO',
    TARIFCHECK: process.env.TARIFCHECK_PARTNER_ID ? 'YES' : 'NO'
  }
});

const partnerMappings = {
  // ========== CHECK24 ENERGIE ==========
  strom: {
    provider: 'check24',
    type: 'energie',
    name: 'Stromvergleich',
    keywords: ['strom', 'energie', 'kwh', 'stadtwerke', 'stromanbieter', 'stromtarif', 'stromvertrag'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-power-iframe" data-scrollto="begin"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-power-iframe/power-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://files.check24.net/widgets/power.css">
<div style="width: 300px; min-height: 220px;" id="c24pp-power-widget" data-target="_self" data-whitelabel="no" data-form="https://www.check24.net/strom-vergleich/" ></div>
<script async src="https://files.check24.net/widgets/${PARTNER_ID}/c24pp-power-widget/power.js"></script>`,
        minWidth: 300,
        type: 'widget'
      },
      directLink: `https://a.check24.net/misc/click.php?pid=${PARTNER_ID}&aid=18&deep=stromanbieter-wechseln&cat=1`
    },
    scoreBonus: 15
  },

  oekostrom: {
    provider: 'check24',
    type: 'energie',
    name: 'Ökostrom-Vergleich',
    keywords: ['ökostrom', 'grüner strom', 'erneuerbare energie', 'solar', 'wind', 'öko'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-power-iframe" data-scrollto="begin" data-eco="yes"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-power-iframe/power-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://files.check24.net/widgets/power.css">
<div style="width: 300px; min-height: 220px;" id="c24pp-power-widget-eco" data-target="_self" data-whitelabel="no" data-form="https://www.check24.net/oekostrom-vergleich/" data-eco="yes" ></div>
<script async src="https://files.check24.net/widgets/${PARTNER_ID}/c24pp-power-widget-eco/power.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 15
  },

  gas: {
    provider: 'check24',
    type: 'energie',
    name: 'Gasvergleich',
    keywords: ['gas', 'erdgas', 'gasanbieter', 'gasvertrag', 'gastarif', 'm³', 'heizung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-gas-iframe" data-scrollto="begin"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-gas-iframe/gas-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://files.check24.net/widgets/gas.css">
<div style="width: 300px; min-height: 220px;" id="c24pp-gas-widget" data-target="_self" data-whitelabel="no" data-form="https://www.check24.net/gasanbieter-vergleich/" ></div>
<script async src="https://files.check24.net/widgets/${PARTNER_ID}/c24pp-gas-widget/gas.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 15
  },

  // ========== CHECK24 TELEKOMMUNIKATION ==========
  dsl: {
    provider: 'check24',
    type: 'telekommunikation',
    name: 'DSL & Internet',
    keywords: ['dsl', 'internet', 'breitband', 'telekom', 'vodafone', '1&1', 'o2', 'mbit', 'router', 'wlan'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-dsl-iframe"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-dsl-iframe/dsl-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  mobilfunk: {
    provider: 'check24',
    type: 'telekommunikation',
    name: 'Mobilfunk',
    keywords: ['handy', 'mobilfunk', 'smartphone', 'sim', 'tarif', 'vodafone', 'telekom', 'o2', 'gb', 'datenvolumen'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-mobileservice-iframe"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-mobileservice-iframe/sim-only-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  // ========== CHECK24 REISE ==========
  pauschalreise: {
    provider: 'check24',
    type: 'reise',
    name: 'Pauschalreisen',
    keywords: ['reise', 'urlaub', 'pauschal', 'hotel', 'flug', 'all inclusive', 'lastminute'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-package-iframe" data-offer="allgemein" data-scrollto="begin" data-forward-url="no"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-package-iframe/package-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://files.check24.net/widgets/packagebillboard.css">
<div style="width: 100%; min-height: 200px;" id="c24pp-package-widget" data-target="_self" data-whitelabel="no" data-form="https://www.check24.net/pauschalreisen-vergleich/" ></div>
<script async src="https://files.check24.net/widgets/${PARTNER_ID}/c24pp-package-widget/packagebillboard.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 8
  },

  mietwagen: {
    provider: 'check24',
    type: 'reise',
    name: 'Mietwagen',
    keywords: ['mietwagen', 'auto', 'miete', 'rental', 'car', 'autovermietung', 'sixt', 'hertz', 'avis'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="c24pp-rentalcar-iframe" data-scrollto="begin"></div><script src="https://files.check24.net/widgets/auto/${PARTNER_ID}/c24pp-rentalcar-iframe/rentalcar-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://files.check24.net/widgets/rentalcarbillboard.css">
<div style="width: 100%; min-height: 100px;" id="c24pp-rentalcar-widget" data-target="_self" data-whitelabel="no" data-form="https://www.check24.net/mietwagen-preisvergleich/" ></div>
<script async src="https://files.check24.net/widgets/${PARTNER_ID}/c24pp-rentalcar-widget/rentalcarbillboard.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 8
  },

  // ========== CHECK24 BANKING ==========
  c24bank: {
    provider: 'check24',
    type: 'banking',
    name: 'C24 Bank',
    keywords: ['c24', 'bank', 'konto', 'girokonto', 'banking'],
    widgets: {
      directLink: `https://a.check24.net/misc/click.php?pid=${PARTNER_ID}&aid=18&deep=c24bank&cat=14`
    },
    scoreBonus: 10
  },

  // ========== TARIFCHECK VERSICHERUNGEN ==========
  kfzversicherung: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'KFZ-Versicherung',
    keywords: ['kfz', 'auto', 'versicherung', 'haftpflicht', 'kasko', 'vollkasko', 'teilkasko', 'autoversicherung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-kfz"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-kfz/kfz-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://form.partner-versicherung.de/widgets/kfz-widget.css">
<div style="width: 300px" id="tcpp-widget-kfz" data-form="https://www.tarifcheck.de/kfz-versicherung/ergebnis/"></div>
<script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-widget-kfz/kfz-widget.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 18
  },

  motorrad: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Motorrad-Versicherung',
    keywords: ['motorrad', 'bike', 'versicherung', 'zweirad', 'motorradversicherung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-mot"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-mot/mot-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://form.partner-versicherung.de/widgets/mot-widget.css">
<div style="width: 300px" id="tcpp-widget-mot" data-form="https://www.tarifcheck.de/motorradversicherung/ergebnis/"></div>
<script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-widget-mot/mot-widget.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 15
  },

  haftpflicht: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Haftpflichtversicherung',
    keywords: ['haftpflicht', 'privathaftpflicht', 'versicherung', 'schaden', 'bavaria', 'bavariadirekt'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-phv"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-phv/phv-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  hausrat: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Hausratversicherung',
    keywords: ['hausrat', 'wohnung', 'versicherung', 'einbruch', 'feuer', 'wasser'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-hr"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-hr/hr-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  wohngebaeude: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Wohngebäudeversicherung',
    keywords: ['wohngebäude', 'haus', 'gebäude', 'versicherung', 'immobilie'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-wg"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-wg/wg-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  rechtsschutz: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Rechtsschutzversicherung',
    keywords: ['rechtsschutz', 'anwalt', 'recht', 'versicherung', 'klage', 'gericht'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-rs"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-rs/rs-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  tierhalter: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Tierhalterhaftpflicht',
    keywords: ['tier', 'hund', 'pferd', 'haftpflicht', 'tierhalterhaftpflicht'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-tie"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-tie/tie-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 10
  },

  hundekranken: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Hundekrankenversicherung',
    keywords: ['hund', 'tier', 'kranken', 'versicherung', 'tierarzt'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-tkv"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-tkv/tkv-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 8
  },

  // ========== TARIFCHECK GESUNDHEIT ==========
  pkv: {
    provider: 'tarifcheck',
    type: 'gesundheit',
    name: 'Private Krankenversicherung',
    keywords: ['pkv', 'private', 'kranken', 'versicherung', 'gesundheit'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-pkv"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-pkv/pkv-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 20
  },

  pkvBeamte: {
    provider: 'tarifcheck',
    type: 'gesundheit',
    name: 'PKV für Beamte',
    keywords: ['pkv', 'beamte', 'beihilfe', 'krankenversicherung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-pkv-beamte"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-pkv-beamte/pkv-beamte-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 18
  },

  krankenzusatz: {
    provider: 'tarifcheck',
    type: 'gesundheit',
    name: 'Krankenzusatzversicherung',
    keywords: ['zusatz', 'kranken', 'versicherung', 'zahn', 'brille'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-pkv-z"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-pkv-z/pkv-z-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 15
  },

  pflegezusatz: {
    provider: 'tarifcheck',
    type: 'gesundheit',
    name: 'Pflegezusatzversicherung',
    keywords: ['pflege', 'zusatz', 'versicherung', 'pflegeversicherung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-prv"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-prv/prv-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  // ========== TARIFCHECK ALTERSVORSORGE ==========
  rente: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Private Rentenversicherung',
    keywords: ['rente', 'altersvorsorge', 'versicherung', 'pension'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-rente"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-rente/rente-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 15
  },

  riesterrente: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Riester-Rente',
    keywords: ['riester', 'rente', 'förderung', 'altersvorsorge'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-riester"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-riester/riester-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 15
  },

  rueruprente: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Rürup-Rente',
    keywords: ['rürup', 'basis', 'rente', 'selbständig', 'altersvorsorge'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-r-rente"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-r-rente/r-rente-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 15
  },

  berufsunfaehigkeit: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Berufsunfähigkeitsversicherung',
    keywords: ['berufsunfähigkeit', 'bu', 'versicherung', 'erwerbsunfähigkeit'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-buv"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-buv/buv-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 18
  },

  risikoleben: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Risikolebensversicherung',
    keywords: ['risiko', 'leben', 'versicherung', 'todesfallschutz', 'hinterbliebene'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-rlv"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-rlv/rlv-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 15
  },

  leben: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Lebensversicherung',
    keywords: ['leben', 'versicherung', 'kapital', 'lebensversicherung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-leben"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-leben/leben-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  unfall: {
    provider: 'tarifcheck',
    type: 'altersvorsorge',
    name: 'Unfallversicherung',
    keywords: ['unfall', 'versicherung', 'invalidität'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-unf"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-unf/unf-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  },

  // ========== TARIFCHECK FINANZEN ==========
  kredit: {
    provider: 'tarifcheck',
    type: 'finanzen',
    name: 'Kredit',
    keywords: ['kredit', 'darlehen', 'ratenkredit', 'privatkredit', 'finanzierung'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-kredit" data-duration="12" data-purpose="8" data-amount="5000"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-kredit/kredit-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      },
      quickCalculator: {
        html: `<link rel="stylesheet" type="text/css" href="https://form.partner-versicherung.de/widgets/kredit-widget.css">
<div style="width: 300px" id="tcpp-widget-kredit" data-form="https://www.tarifcheck.de/kredit/ergebnis/" data-duration="12" data-purpose="8" data-amount="5000"></div>
<script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-widget-kredit/kredit-widget.js"></script>`,
        minWidth: 300,
        type: 'widget'
      }
    },
    scoreBonus: 15
  },

  baufinanzierung: {
    provider: 'tarifcheck',
    type: 'finanzen',
    name: 'Baufinanzierung',
    keywords: ['baufinanzierung', 'immobilie', 'hypothek', 'hauskauf', 'darlehen'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-baufi"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-baufi/baufi-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 20
  },

  girokonto: {
    provider: 'tarifcheck',
    type: 'finanzen',
    name: 'Girokonto',
    keywords: ['girokonto', 'konto', 'bank', 'banking', 'zahlungsverkehr'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-giro"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-giro/giro-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 10
  },

  kreditkarte: {
    provider: 'tarifcheck',
    type: 'finanzen',
    name: 'Kreditkarte',
    keywords: ['kreditkarte', 'visa', 'mastercard', 'amex', 'karte'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-cc"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-cc/cc-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 8
  },

  // ========== TARIFCHECK SONSTIGES ==========
  solaranlage: {
    provider: 'tarifcheck',
    type: 'energie',
    name: 'Solaranlage',
    keywords: ['solar', 'photovoltaik', 'pv', 'anlage', 'sonnenenergie', 'solarstrom'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-solar"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-solar/solar-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 18
  },

  firmen: {
    provider: 'tarifcheck',
    type: 'business',
    name: 'Firmenversicherung',
    keywords: ['firma', 'unternehmen', 'gewerbe', 'business', 'betrieb'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-fc"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-fc/fc-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 15
  },

  hausgrundbesitz: {
    provider: 'tarifcheck',
    type: 'versicherung',
    name: 'Haus- und Grundbesitzhaftpflicht',
    keywords: ['haus', 'grund', 'besitz', 'haftpflicht', 'vermieter'],
    widgets: {
      fullCalculator: {
        html: `<div style="width: 100%" id="tcpp-iframe-hug"></div><script src="https://form.partner-versicherung.de/widgets/${TARIFCHECK_ID}/tcpp-iframe-hug/hug-iframe.js"></script>`,
        minWidth: 900,
        type: 'iframe'
      }
    },
    scoreBonus: 12
  }
};

// 🔴🔴🔴 STRENGSTE VALIDIERUNG - UNIVERSELLE LÖSUNG 🔴🔴🔴
function findBestPartnerCategory(keywords, contractType) {
  try {
    console.log('🔍 STRENGE Partner-Kategorie-Suche gestartet');
    console.log('📋 Input:', { keywords: keywords?.slice(0, 5), contractType });
    
    // Input-Validierung
    if (!keywords || !Array.isArray(keywords)) {
      console.warn('⚠️ findBestPartnerCategory: Invalid keywords input');
      return null;
    }
    
    const keywordsLower = keywords.map(k => String(k).toLowerCase());
    const typeLower = String(contractType || '').toLowerCase();
    
    // 🔴 SCHRITT 1: Explizite Typ-Zuordnung (STRENG)
    const explicitTypeMapping = {
      // Versicherungen (STRENG getrennt)
      'rechtsschutz': 'rechtsschutz',
      'rechtsschutzversicherung': 'rechtsschutz',
      'haftpflicht': 'haftpflicht',
      'haftpflichtversicherung': 'haftpflicht',
      'privathaftpflicht': 'haftpflicht',
      'kfz': 'kfzversicherung',
      'kfzversicherung': 'kfzversicherung',
      'autoversicherung': 'kfzversicherung',
      'hausrat': 'hausrat',
      'hausratversicherung': 'hausrat',
      'wohngebäude': 'wohngebaeude',
      'wohngebäudeversicherung': 'wohngebaeude',
      'berufsunfähigkeit': 'berufsunfaehigkeit',
      'berufsunfähigkeitsversicherung': 'berufsunfaehigkeit',
      'krankenversicherung': 'pkv',
      'pkv': 'pkv',
      'lebensversicherung': 'leben',
      'leben': 'leben',
      'risikoleben': 'risikoleben',
      'unfallversicherung': 'unfall',
      'unfall': 'unfall',
      'tierhalter': 'tierhalter',
      'tierhalterhaftpflicht': 'tierhalter',
      
      // Energie
      'strom': 'strom',
      'stromvertrag': 'strom',
      'stromtarif': 'strom',
      'ökostrom': 'oekostrom',
      'gas': 'gas',
      'gasvertrag': 'gas',
      'gastarif': 'gas',
      
      // Telekommunikation
      'dsl': 'dsl',
      'internet': 'dsl',
      'internetvertrag': 'dsl',
      'handy': 'mobilfunk',
      'mobilfunk': 'mobilfunk',
      'handyvertrag': 'mobilfunk',
      
      // Finanzen
      'kredit': 'kredit',
      'darlehen': 'kredit',
      'girokonto': 'girokonto',
      'konto': 'girokonto',
      'kreditkarte': 'kreditkarte'
    };
    
    // 🔴 Direkte Typ-Zuordnung basierend auf contractType
    let matchedCategory = null;
    if (explicitTypeMapping[typeLower]) {
      matchedCategory = explicitTypeMapping[typeLower];
      console.log(`✅ Direkte Zuordnung über contractType: ${typeLower} → ${matchedCategory}`);
    }
    
    // 🔴 SCHRITT 2: Keyword-Analyse nur als Fallback
    if (!matchedCategory) {
      // Suche nach expliziten Keywords im Text
      for (const keyword of keywordsLower) {
        if (explicitTypeMapping[keyword]) {
          matchedCategory = explicitTypeMapping[keyword];
          console.log(`✅ Keyword-Zuordnung: ${keyword} → ${matchedCategory}`);
          break;
        }
      }
    }
    
    // 🔴 SCHRITT 3: Score-basierte Suche nur wenn keine explizite Zuordnung
    let bestMatch = null;
    let bestScore = 0;
    
    if (!matchedCategory) {
      console.log('⚠️ Keine explizite Zuordnung gefunden - verwende Score-System');
      
      for (const [key, mapping] of Object.entries(partnerMappings)) {
        let score = 0;
        
        // Keyword matching
        for (const keyword of keywordsLower) {
          for (const mappingKeyword of mapping.keywords) {
            const mkLower = mappingKeyword.toLowerCase();
            if (keyword.includes(mkLower) || mkLower.includes(keyword)) {
              score += 10;
            }
          }
        }
        
        // Type matching
        if (typeLower === key) {
          score += 100; // Sehr hoher Bonus für exakte Übereinstimmung
        }
        
        // Category type matching
        if (mapping.type && typeLower.includes(mapping.type)) {
          score += 20;
        }
        
        // Score bonus
        score += mapping.scoreBonus || 0;
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { category: key, ...mapping, matchScore: score };
        }
      }
      
      // 🔴 STRENGE VALIDIERUNG: Minimum Score 50
      if (bestScore < 50) {
        console.log(`❌ Score zu niedrig (${bestScore} < 50) - KEINE Partner-Widgets`);
        return null;
      }
      
      matchedCategory = bestMatch?.category;
    } else {
      // Hole die Mapping-Daten für die explizit gefundene Kategorie
      if (partnerMappings[matchedCategory]) {
        bestMatch = {
          category: matchedCategory,
          ...partnerMappings[matchedCategory],
          matchScore: 100 // Hoher Score für explizite Zuordnung
        };
        bestScore = 100;
      }
    }
    
    // 🔴 SCHRITT 4: Zusätzliche Validierung für Versicherungen
    if (matchedCategory && partnerMappings[matchedCategory]?.type === 'versicherung') {
      // Prüfe auf Konflikte
      const versicherungsKonflikte = {
        'rechtsschutz': ['kfz', 'haftpflicht', 'hausrat', 'leben'],
        'haftpflicht': ['kfz', 'rechtsschutz', 'tierhalter'],
        'kfzversicherung': ['rechtsschutz', 'haftpflicht', 'hausrat'],
        'hausrat': ['kfz', 'rechtsschutz', 'wohngebäude']
      };
      
      const konflikte = versicherungsKonflikte[matchedCategory] || [];
      
      // Prüfe ob Konflikt-Keywords vorhanden sind
      for (const konflikt of konflikte) {
        const konfliktKeywords = partnerMappings[konflikt]?.keywords || [];
        const hasKonflikt = konfliktKeywords.some(kw => 
          keywordsLower.some(k => k.includes(kw))
        );
        
        if (hasKonflikt && !keywordsLower.some(k => 
          partnerMappings[matchedCategory].keywords.some(mk => k.includes(mk))
        )) {
          console.log(`❌ KONFLIKT erkannt: ${matchedCategory} vs ${konflikt}`);
          console.log(`🚫 BLOCKIERE unsichere Zuordnung`);
          return null;
        }
      }
    }
    
    // 🔴 FINALE VALIDIERUNG
    if (!bestMatch) {
      console.log('❌ Keine passende Partner-Kategorie gefunden');
      return null;
    }
    
    console.log(`✅ VALIDIERTE Partner-Kategorie: ${bestMatch.category}`);
    console.log(`📊 Match-Details:`, {
      category: bestMatch.category,
      provider: bestMatch.provider,
      score: bestMatch.matchScore,
      type: bestMatch.type
    });
    
    return bestMatch;
    
  } catch (error) {
    console.error('❌ Fehler in findBestPartnerCategory:', error);
    return null;
  }
}

// 🆕 VERBESSERTE Helper-Funktion mit Error Handling
function generatePartnerOffers(category, extractedData = {}) {
  try {
    const mapping = partnerMappings[category];
    if (!mapping) {
      console.warn(`⚠️ Keine Partner-Kategorie gefunden: ${category}`);
      return [];
    }
    
    const offers = [];
    
    // Check24/TarifCheck Angebot erstellen
    if (mapping.widgets && mapping.widgets.fullCalculator) {
      offers.push({
        source: 'partner',
        provider: mapping.provider,
        title: `${mapping.name} - Jetzt vergleichen`,
        snippet: `Vergleichen Sie hunderte Anbieter und sparen Sie bis zu mehrere hundert Euro im Jahr`,
        link: '#partner-widget',
        price: extractedData.price || 'Preis ermitteln',
        prices: [extractedData.price || 'Preis ermitteln'],
        features: [
          '✔ Über 100 Anbieter im Vergleich',
          '✔ TÜV-geprüfter Service',
          '✔ Kostenlos & unverbindlich',
          '✔ Bonus-Aktionen verfügbar'
        ],
        relevantInfo: 'Vergleichsportal mit vielen Anbietern und Tarifen',
        widget: mapping.widgets.fullCalculator,
        directLink: mapping.widgets.directLink || null,
        scoreBonus: mapping.scoreBonus || 10,
        isVerified: true,
        hasDetailedData: true,
        isPriorityPortal: true,
        category: category
      });
    }
    
    // Quick Calculator als Alternative
    if (mapping.widgets && mapping.widgets.quickCalculator) {
      offers.push({
        source: 'partner',
        provider: mapping.provider,
        title: `${mapping.name} - Schnell-Check`,
        snippet: 'Schnelle Übersicht über verfügbare Tarife',
        link: '#partner-widget-quick',
        price: 'Preis prüfen',
        prices: ['Preis prüfen'],
        features: [
          '✔ Schnelle Eingabe',
          '✔ Sofortige Ergebnisse',
          '✔ Unverbindlich'
        ],
        relevantInfo: 'Schneller Vergleich verfügbar',
        widget: mapping.widgets.quickCalculator,
        scoreBonus: (mapping.scoreBonus || 10) - 5,
        isVerified: true,
        hasDetailedData: true,
        isPriorityPortal: true,
        category: category
      });
    }
    
    console.log(`✅ ${offers.length} Partner-Angebote generiert für: ${category}`);
    return offers;
    
  } catch (error) {
    console.error('❌ Fehler in generatePartnerOffers:', error);
    return [];
  }
}

// 🆕 TEST FUNCTION für Debug
function testPartnerMappings() {
  console.log('🧪 PARTNER MAPPINGS TEST');
  console.log('========================');
  console.log(`Total Categories: ${Object.keys(partnerMappings).length}`);
  console.log(`CHECK24 Partner ID: ${PARTNER_ID}`);
  console.log(`TARIFCHECK Partner ID: ${TARIFCHECK_ID}`);
  
  // Test mit Beispiel-Keywords
  const testCases = [
    { keywords: ['rechtsschutz', 'versicherung'], type: 'rechtsschutz' },
    { keywords: ['haftpflicht', 'versicherung'], type: 'haftpflicht' },
    { keywords: ['kfz', 'auto', 'versicherung'], type: 'kfz' },
    { keywords: ['strom', 'energie'], type: 'strom' },
    { keywords: ['kredit', 'darlehen'], type: 'kredit' }
  ];
  
  testCases.forEach(test => {
    const result = findBestPartnerCategory(test.keywords, test.type);
    console.log(`\nTest: ${test.type} - ${test.keywords.join(', ')}`);
    console.log(`Result: ${result ? result.category + ' (Score: ' + result.matchScore + ')' : 'NOT FOUND (richtig so!)'}`);
  });
}

// Export
module.exports = {
  partnerMappings,
  findBestPartnerCategory,
  generatePartnerOffers,
  testPartnerMappings // 🆕 Für Debug
};