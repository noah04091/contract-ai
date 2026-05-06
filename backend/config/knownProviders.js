// 🎯 Kuratierte Liste bekannter Anbieter pro Vertragstyp
//
// HEUTE: Vorbereitung — wird (noch) nicht aktiv im Code verwendet
// SPÄTER: Mögliche Garantie-Anzeige bekannter Anbieter, falls SERP+KI nicht reicht
//
// Quelle: Marktrecherche & öffentliche Informationen, Stand: 2026

module.exports = {
  rechtsschutz: [
    { name: 'ARAG', url: 'https://www.arag.de/rechtsschutzversicherung/', summary: 'Europas größter Rechtsschutzversicherer mit über 85 Jahren Erfahrung.' },
    { name: 'ROLAND', url: 'https://www.roland-rechtsschutz.de/', summary: 'Spezialist für Rechtsschutz seit 1957 mit 24/7 Anwalt-Hotline.' },
    { name: 'ADVOCARD', url: 'https://www.advocard.de/', summary: 'Rechtsschutz aus Hamburg, einer der ältesten deutschen Anbieter.' },
    { name: 'DEVK', url: 'https://www.devk.de/', summary: 'Rechtsschutz mit fairen Preisen und gutem Service.' },
    { name: 'HUK-COBURG', url: 'https://www.huk.de/', summary: 'Versicherer der Beamten und Bürger, oft Testsieger.' },
    { name: 'Allianz', url: 'https://www.allianz.de/recht-und-eigentum/rechtsschutzversicherung/', summary: 'Marktführer mit umfassendem Rechtsschutz-Angebot.' },
    { name: 'AXA', url: 'https://www.axa.de/rechtsschutz', summary: 'Rechtsschutz mit telefonischer Erstberatung und Mediation.' },
    { name: 'ERGO', url: 'https://www.ergo.de/', summary: 'ERGO Rechtsschutz mit flexiblen Bausteinen.' },
    { name: 'Adam Riese', url: 'https://www.adam-riese.de/', summary: 'Digitaler Versicherer der Württembergischen.' }
  ],
  haftpflicht: [
    { name: 'HUK-COBURG', url: 'https://www.huk.de/haftpflichtversicherung/', summary: 'Privathaftpflicht mit hoher Deckungssumme zu fairem Preis.' },
    { name: 'Allianz', url: 'https://www.allianz.de/haftpflichtversicherung/', summary: 'Marktführer-Haftpflicht mit umfassendem Schutz.' },
    { name: 'CosmosDirekt', url: 'https://www.cosmosdirekt.de/privathaftpflichtversicherung/', summary: 'Online-Haftpflicht zu günstigen Konditionen.' },
    { name: 'Adam Riese', url: 'https://www.adam-riese.de/', summary: 'Digitaler Versicherer der Württembergischen.' },
    { name: 'Friday', url: 'https://www.friday.de/', summary: 'Monatlich kündbare Haftpflicht.' },
    { name: 'Getsafe', url: 'https://hellogetsafe.com/de/haftpflichtversicherung', summary: 'Mobile-First-Versicherer mit App.' },
    { name: 'AXA', url: 'https://www.axa.de/', summary: 'Klassische Haftpflicht mit Markenvertrauen.' },
    { name: 'ERGO', url: 'https://www.ergo.de/', summary: 'Haftpflicht-Bausteine flexibel kombinierbar.' }
  ],
  kfz: [
    { name: 'HUK-COBURG', url: 'https://www.huk.de/kfz-versicherung/', summary: 'Marktführer in der KFZ-Versicherung mit Direktversicherer-Modell.' },
    { name: 'Allianz', url: 'https://www.allianz.de/auto/kfz-versicherung/', summary: 'KFZ-Versicherung mit Premium-Service.' },
    { name: 'AXA', url: 'https://www.axa.de/auto', summary: 'AXA Autoversicherung mit Schadenservice.' },
    { name: 'CosmosDirekt', url: 'https://www.cosmosdirekt.de/kfz-versicherung/', summary: 'Online-KFZ ohne Außendienst.' },
    { name: 'DA Direkt', url: 'https://www.da-direkt.de/', summary: 'Direktversicherer mit fairen KFZ-Tarifen.' },
    { name: 'Verti', url: 'https://www.verti.de/', summary: 'Direkter KFZ-Versicherer (ehemals Direct Line).' },
    { name: 'ERGO', url: 'https://www.ergo.de/', summary: 'KFZ-Versicherung mit großem Werkstattnetz.' }
  ],
  hausrat: [
    { name: 'HUK-COBURG', url: 'https://www.huk.de/hausratversicherung/', summary: 'Hausrat mit Wohnflächen-Tarifen.' },
    { name: 'Allianz', url: 'https://www.allianz.de/hausratversicherung/', summary: 'Marktführer-Hausrat mit Premium-Optionen.' },
    { name: 'CosmosDirekt', url: 'https://www.cosmosdirekt.de/hausratversicherung/', summary: 'Online-Hausrat zu günstigen Preisen.' },
    { name: 'Adam Riese', url: 'https://www.adam-riese.de/', summary: 'Digital-Hausrat-Versicherung.' },
    { name: 'AXA', url: 'https://www.axa.de/', summary: 'Hausrat mit Schadenservice und individuellen Bausteinen.' },
    { name: 'Wertgarantie', url: 'https://www.wertgarantie.de/', summary: 'Spezialist für Geräte- und Hausrat-Versicherung.' },
    { name: 'ERGO', url: 'https://www.ergo.de/', summary: 'Hausrat-Versicherung mit flexiblem Schutz.' }
  ],
  strom: [
    { name: 'E.ON', url: 'https://www.eon.de/de/pk/strom.html', summary: 'Einer der größten deutschen Stromanbieter.' },
    { name: 'Vattenfall', url: 'https://www.vattenfall.de/strom', summary: 'Schwedischer Energiekonzern mit Ökostrom-Tarifen.' },
    { name: 'EnBW', url: 'https://www.enbw.com/privatkunden/energie/strom/', summary: 'Baden-Württembergischer Energieversorger.' },
    { name: 'LichtBlick', url: 'https://www.lichtblick.de/oekostrom/', summary: 'Reiner Ökostromanbieter mit grünem Strom.' },
    { name: 'Naturstrom', url: 'https://www.naturstrom.de/', summary: 'Ökostromanbieter mit Fokus auf neue Anlagen.' },
    { name: 'Tibber', url: 'https://tibber.com/de', summary: 'Smart-Strom mit dynamischen Tarifen via App.' },
    { name: 'Octopus Energy', url: 'https://octopusenergy.de/', summary: 'Innovative Ökostrom-Tarife mit smartem Service.' },
    { name: 'Greenpeace Energy', url: 'https://green-planet-energy.de/', summary: 'Genossenschaftlich organisierter Ökostromanbieter.' }
  ],
  gas: [
    { name: 'E.ON', url: 'https://www.eon.de/de/pk/gas.html', summary: 'Großer Gasanbieter mit verschiedenen Tarifen.' },
    { name: 'Vattenfall', url: 'https://www.vattenfall.de/gas', summary: 'Gasanbieter mit Ökogas-Optionen.' },
    { name: 'EnBW', url: 'https://www.enbw.com/privatkunden/energie/erdgas/', summary: 'Süddeutscher Gasanbieter.' },
    { name: 'Stadtwerke (regional)', url: 'https://www.stadtwerke.de/', summary: 'Regionale Stadtwerke mit oft günstigen Konditionen.' },
    { name: 'Lichtblick', url: 'https://www.lichtblick.de/oekogas/', summary: 'Ökogas-Anbieter mit klimaneutralen Tarifen.' }
  ],
  mobilfunk: [
    { name: 'Deutsche Telekom', url: 'https://www.telekom.de/mobilfunk', summary: 'Beste Netzqualität, Premium-Tarife.' },
    { name: 'Vodafone', url: 'https://www.vodafone.de/privat/mobilfunk-handy-vertraege/', summary: 'Großes Vodafone-Netz in Deutschland.' },
    { name: 'O2 (Telefónica)', url: 'https://www.o2online.de/handy-tarife/', summary: 'Günstige Tarife mit gutem Netz.' },
    { name: 'Congstar', url: 'https://www.congstar.de/handytarife/', summary: 'Telekom-Discountmarke mit fairen Preisen.' },
    { name: '1&1', url: 'https://www.1und1.de/Mobilfunk/', summary: 'Eigenes Netz im Aufbau, attraktive Tarife.' },
    { name: 'Klarmobil', url: 'https://www.klarmobil.de/handytarife/', summary: 'Discount-Anbieter im Telekom-Netz.' },
    { name: 'WinSIM', url: 'https://www.winsim.de/', summary: 'Discounter im O2-Netz.' },
    { name: 'Aldi Talk', url: 'https://www.alditalk.de/', summary: 'Prepaid-Anbieter im Telefónica-Netz.' }
  ],
  internet: [
    { name: 'Deutsche Telekom', url: 'https://www.telekom.de/zuhause/internet', summary: 'DSL und Glasfaser, Marktführer.' },
    { name: 'Vodafone', url: 'https://www.vodafone.de/privat/dsl-internet-anschluss/', summary: 'DSL und Kabel-Internet.' },
    { name: '1&1', url: 'https://www.1und1.de/DSL/', summary: 'Günstige DSL-Tarife, eigenes Netz.' },
    { name: 'O2 (Telefónica)', url: 'https://www.o2online.de/dsl/', summary: 'DSL-Tarife mit O2-Bundle-Optionen.' },
    { name: 'M-Net', url: 'https://www.m-net.de/', summary: 'Süddeutscher Glasfaser-Anbieter.' },
    { name: 'NetCologne', url: 'https://www.netcologne.de/', summary: 'Regionaler Anbieter im Köln-Bonner-Raum.' }
  ]
};
