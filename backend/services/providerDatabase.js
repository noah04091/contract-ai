// providerDatabase.js - Comprehensive German Provider Database
// Place this in backend/services/providerDatabase.js

const providers = {
  // VERSICHERUNGEN
  insurance: {
    'allianz': {
      name: 'Allianz Versicherungs-AG',
      displayName: 'Allianz',
      email: 'service@allianz.de',
      cancelEmail: 'kuendigung@allianz.de',
      address: {
        street: 'Königinstraße 28',
        zip: '80802',
        city: 'München'
      },
      phone: '0800 4100 104',
      keywords: ['allianz', 'allianz versicherung', 'allianz ag'],
      category: 'Versicherung'
    },
    'axa': {
      name: 'AXA Versicherung AG',
      displayName: 'AXA',
      email: 'service@axa.de',
      cancelEmail: 'kuendigung@axa.de',
      address: {
        street: 'Colonia-Allee 10-20',
        zip: '51067',
        city: 'Köln'
      },
      phone: '0221 148 24752',
      keywords: ['axa', 'axa versicherung', 'axa konzern'],
      category: 'Versicherung'
    },
    'huk': {
      name: 'HUK-COBURG Versicherungsgruppe',
      displayName: 'HUK-COBURG',
      email: 'info@huk-coburg.de',
      cancelEmail: 'kuendigung@huk-coburg.de',
      address: {
        street: 'Bahnhofsplatz',
        zip: '96444',
        city: 'Coburg'
      },
      phone: '09561 960',
      keywords: ['huk', 'huk-coburg', 'huk coburg', 'huk24'],
      category: 'Versicherung'
    },
    'ergo': {
      name: 'ERGO Group AG',
      displayName: 'ERGO',
      email: 'service@ergo.de',
      cancelEmail: 'kuendigung@ergo.de',
      address: {
        street: 'ERGO-Platz 1',
        zip: '40477',
        city: 'Düsseldorf'
      },
      phone: '0211 477 0',
      keywords: ['ergo', 'ergo versicherung', 'ergo direkt'],
      category: 'Versicherung'
    },
    'generali': {
      name: 'Generali Deutschland AG',
      displayName: 'Generali',
      email: 'service@generali.de',
      cancelEmail: 'kuendigung@generali.de',
      address: {
        street: 'Adenauerring 7',
        zip: '81737',
        city: 'München'
      },
      phone: '089 5121 0',
      keywords: ['generali', 'generali deutschland', 'generali versicherung'],
      category: 'Versicherung'
    },
    'signal_iduna': {
      name: 'SIGNAL IDUNA Gruppe',
      displayName: 'SIGNAL IDUNA',
      email: 'info@signal-iduna.de',
      cancelEmail: 'kuendigung@signal-iduna.de',
      address: {
        street: 'Joseph-Scherer-Straße 3',
        zip: '44139',
        city: 'Dortmund'
      },
      phone: '0231 135 0',
      keywords: ['signal iduna', 'signal-iduna', 'signal', 'iduna'],
      category: 'Versicherung'
    },
    'debeka': {
      name: 'Debeka Versicherungsgruppe',
      displayName: 'Debeka',
      email: 'info@debeka.de',
      cancelEmail: 'kuendigung@debeka.de',
      address: {
        street: 'Ferdinand-Sauerbruch-Straße 18',
        zip: '56058',
        city: 'Koblenz'
      },
      phone: '0261 498 0',
      keywords: ['debeka', 'debeka versicherung'],
      category: 'Versicherung'
    },
    'zurich': {
      name: 'Zurich Versicherung',
      displayName: 'Zurich',
      email: 'service@zurich.de',
      cancelEmail: 'kuendigung@zurich.de',
      address: {
        street: 'Deutzer Allee 1',
        zip: '50679',
        city: 'Köln'
      },
      phone: '0221 7715 0',
      keywords: ['zurich', 'zürich', 'zurich versicherung'],
      category: 'Versicherung'
    }
  },

  // TELEKOMMUNIKATION
  telecom: {
    'telekom': {
      name: 'Deutsche Telekom AG',
      displayName: 'Telekom',
      email: 'kundenservice@telekom.de',
      cancelEmail: 'kuendigung@telekom.de',
      address: {
        street: 'Landgrabenweg 151',
        zip: '53227',
        city: 'Bonn'
      },
      phone: '0800 330 1000',
      keywords: ['telekom', 'deutsche telekom', 't-mobile', 'magenta'],
      category: 'Telekommunikation'
    },
    'vodafone': {
      name: 'Vodafone GmbH',
      displayName: 'Vodafone',
      email: 'service@vodafone.de',
      cancelEmail: 'kuendigung@vodafone.de',
      address: {
        street: 'Ferdinand-Braun-Platz 1',
        zip: '40549',
        city: 'Düsseldorf'
      },
      phone: '0800 172 1212',
      keywords: ['vodafone', 'vodafone deutschland', 'vodafone gmbh'],
      category: 'Telekommunikation'
    },
    'o2': {
      name: 'Telefónica Germany GmbH & Co. OHG',
      displayName: 'O2',
      email: 'service@o2online.de',
      cancelEmail: 'kuendigung@o2online.de',
      address: {
        street: 'Georg-Brauchle-Ring 50',
        zip: '80992',
        city: 'München'
      },
      phone: '089 2442 0',
      keywords: ['o2', 'o zwei', 'telefonica', 'telefónica'],
      category: 'Telekommunikation'
    },
    '1und1': {
      name: '1&1 Telecommunication SE',
      displayName: '1&1',
      email: 'service@1und1.de',
      cancelEmail: 'kuendigung@1und1.de',
      address: {
        street: 'Elgendorfer Straße 57',
        zip: '56410',
        city: 'Montabaur'
      },
      phone: '0721 9600',
      keywords: ['1&1', '1und1', 'eins und eins', '1 und 1'],
      category: 'Telekommunikation'
    }
  },

  // ENERGIE
  energy: {
    'eon': {
      name: 'E.ON SE',
      displayName: 'E.ON',
      email: 'service@eon.de',
      cancelEmail: 'kuendigung@eon.de',
      address: {
        street: 'Brüsseler Platz 1',
        zip: '45131',
        city: 'Essen'
      },
      phone: '0871 95 38 62 00',
      keywords: ['eon', 'e.on', 'e-on', 'e on'],
      category: 'Energie'
    },
    'vattenfall': {
      name: 'Vattenfall GmbH',
      displayName: 'Vattenfall',
      email: 'service@vattenfall.de',
      cancelEmail: 'kuendigung@vattenfall.de',
      address: {
        street: 'Überseering 12',
        zip: '22297',
        city: 'Hamburg'
      },
      phone: '040 657 988 630',
      keywords: ['vattenfall', 'vattenfall europe'],
      category: 'Energie'
    },
    'enbw': {
      name: 'EnBW Energie Baden-Württemberg AG',
      displayName: 'EnBW',
      email: 'service@enbw.com',
      cancelEmail: 'kuendigung@enbw.com',
      address: {
        street: 'Durlacher Allee 93',
        zip: '76131',
        city: 'Karlsruhe'
      },
      phone: '0721 63 0',
      keywords: ['enbw', 'energie baden-württemberg', 'energie bw'],
      category: 'Energie'
    },
    'rwe': {
      name: 'RWE AG',
      displayName: 'RWE',
      email: 'service@rwe.com',
      cancelEmail: 'kuendigung@rwe.com',
      address: {
        street: 'RWE Platz 1',
        zip: '45141',
        city: 'Essen'
      },
      phone: '0201 5179 0',
      keywords: ['rwe', 'rwe ag', 'innogy'],
      category: 'Energie'
    },
    'stadtwerke_muenchen': {
      name: 'Stadtwerke München GmbH',
      displayName: 'SWM',
      email: 'service@swm.de',
      cancelEmail: 'kuendigung@swm.de',
      address: {
        street: 'Emmy-Noether-Straße 2',
        zip: '80992',
        city: 'München'
      },
      phone: '089 2361 0',
      keywords: ['swm', 'stadtwerke münchen', 'stadtwerke muenchen', 'm-strom'],
      category: 'Energie'
    }
  },

  // STREAMING & DIGITAL SERVICES
  streaming: {
    'netflix': {
      name: 'Netflix Services Germany GmbH',
      displayName: 'Netflix',
      email: 'privacy@netflix.com',
      cancelEmail: 'cancel@netflix.com',
      address: {
        street: 'Friedrichstraße 88',
        zip: '10117',
        city: 'Berlin'
      },
      phone: '0800 724 9451',
      keywords: ['netflix', 'netflix deutschland'],
      category: 'Streaming'
    },
    'spotify': {
      name: 'Spotify GmbH',
      displayName: 'Spotify',
      email: 'support@spotify.com',
      cancelEmail: 'cancel@spotify.com',
      address: {
        street: 'Alexanderstraße 1',
        zip: '10178',
        city: 'Berlin'
      },
      keywords: ['spotify', 'spotify premium'],
      category: 'Streaming'
    },
    'amazon_prime': {
      name: 'Amazon EU S.à r.l.',
      displayName: 'Amazon Prime',
      email: 'service@amazon.de',
      cancelEmail: 'kuendigung@amazon.de',
      address: {
        street: 'Marcel-Breuer-Straße 12',
        zip: '80807',
        city: 'München'
      },
      phone: '0800 363 8469',
      keywords: ['amazon prime', 'prime video', 'amazon', 'prime'],
      category: 'Streaming'
    },
    'disney_plus': {
      name: 'The Walt Disney Company (Germany) GmbH',
      displayName: 'Disney+',
      email: 'help@disneyplus.com',
      cancelEmail: 'cancel@disneyplus.com',
      address: {
        street: 'Kronstadter Straße 9',
        zip: '81677',
        city: 'München'
      },
      keywords: ['disney+', 'disney plus', 'disneyplus'],
      category: 'Streaming'
    },
    'sky': {
      name: 'Sky Deutschland GmbH',
      displayName: 'Sky',
      email: 'service@sky.de',
      cancelEmail: 'kuendigung@sky.de',
      address: {
        street: 'Medienallee 26',
        zip: '85774',
        city: 'Unterföhring'
      },
      phone: '089 9958 6000',
      keywords: ['sky', 'sky deutschland', 'sky ticket'],
      category: 'Streaming'
    },
    'dazn': {
      name: 'DAZN Limited',
      displayName: 'DAZN',
      email: 'help@dazn.com',
      cancelEmail: 'cancel@dazn.com',
      address: {
        street: 'Hanauer Landstraße 181-185',
        zip: '60314',
        city: 'Frankfurt am Main'
      },
      keywords: ['dazn', 'dazn sports'],
      category: 'Streaming'
    }
  },

  // FITNESS & GESUNDHEIT
  fitness: {
    'mcfit': {
      name: 'McFIT Global Group GmbH',
      displayName: 'McFIT',
      email: 'service@mcfit.com',
      cancelEmail: 'kuendigung@mcfit.com',
      address: {
        street: 'Taubenstraße 7-9',
        zip: '10117',
        city: 'Berlin'
      },
      phone: '030 2000 497 0',
      keywords: ['mcfit', 'mc fit', 'rsg group'],
      category: 'Fitness'
    },
    'clever_fit': {
      name: 'clever fit GmbH',
      displayName: 'clever fit',
      email: 'service@clever-fit.com',
      cancelEmail: 'kuendigung@clever-fit.com',
      address: {
        street: 'Waldstraße 84',
        zip: '64569',
        city: 'Nauheim'
      },
      phone: '06152 9295 0',
      keywords: ['clever fit', 'cleverfit', 'clever-fit'],
      category: 'Fitness'
    },
    'fitness_first': {
      name: 'Fitness First Germany GmbH',
      displayName: 'Fitness First',
      email: 'service@fitnessfirst.de',
      cancelEmail: 'kuendigung@fitnessfirst.de',
      address: {
        street: 'Hanauer Landstraße 148',
        zip: '60314',
        city: 'Frankfurt am Main'
      },
      phone: '069 408 442 0',
      keywords: ['fitness first', 'fitnessfirst'],
      category: 'Fitness'
    }
  },

  // BANKEN
  banks: {
    'sparkasse': {
      name: 'Sparkasse',
      displayName: 'Sparkasse',
      email: 'service@sparkasse.de',
      cancelEmail: 'kuendigung@sparkasse.de',
      address: {
        street: 'Simrockstraße 4',
        zip: '53113',
        city: 'Bonn'
      },
      keywords: ['sparkasse', 'stadtsparkasse', 'kreissparkasse'],
      category: 'Bank'
    },
    'deutsche_bank': {
      name: 'Deutsche Bank AG',
      displayName: 'Deutsche Bank',
      email: 'service@db.com',
      cancelEmail: 'kuendigung@db.com',
      address: {
        street: 'Taunusanlage 12',
        zip: '60325',
        city: 'Frankfurt am Main'
      },
      phone: '069 910 0',
      keywords: ['deutsche bank', 'deutschebank', 'db'],
      category: 'Bank'
    },
    'commerzbank': {
      name: 'Commerzbank AG',
      displayName: 'Commerzbank',
      email: 'service@commerzbank.de',
      cancelEmail: 'kuendigung@commerzbank.de',
      address: {
        street: 'Kaiserplatz',
        zip: '60311',
        city: 'Frankfurt am Main'
      },
      phone: '069 136 20',
      keywords: ['commerzbank', 'comdirect'],
      category: 'Bank'
    },
    'volksbank': {
      name: 'Volksbank',
      displayName: 'Volksbank',
      email: 'service@volksbank.de',
      cancelEmail: 'kuendigung@volksbank.de',
      address: {
        street: 'Heussallee 5',
        zip: '53113',
        city: 'Bonn'
      },
      keywords: ['volksbank', 'vr bank', 'raiffeisenbank', 'vr-bank'],
      category: 'Bank'
    },
    'ing': {
      name: 'ING-DiBa AG',
      displayName: 'ING',
      email: 'info@ing.de',
      cancelEmail: 'kuendigung@ing.de',
      address: {
        street: 'Theodor-Heuss-Allee 2',
        zip: '60486',
        city: 'Frankfurt am Main'
      },
      phone: '069 27 222 0',
      keywords: ['ing', 'ing-diba', 'ing diba', 'diba'],
      category: 'Bank'
    }
  },

  // ZEITUNGEN & MAGAZINE
  media: {
    'zeit': {
      name: 'Zeitverlag Gerd Bucerius GmbH & Co. KG',
      displayName: 'DIE ZEIT',
      email: 'abo@zeit.de',
      cancelEmail: 'kuendigung@zeit.de',
      address: {
        street: 'Buceriusstraße, Eingang Speersort 1',
        zip: '20095',
        city: 'Hamburg'
      },
      phone: '040 3280 0',
      keywords: ['die zeit', 'zeit', 'zeit online'],
      category: 'Medien'
    },
    'spiegel': {
      name: 'DER SPIEGEL GmbH & Co. KG',
      displayName: 'DER SPIEGEL',
      email: 'abo@spiegel.de',
      cancelEmail: 'kuendigung@spiegel.de',
      address: {
        street: 'Ericusspitze 1',
        zip: '20457',
        city: 'Hamburg'
      },
      phone: '040 3007 0',
      keywords: ['der spiegel', 'spiegel', 'spiegel online', 'spiegel+'],
      category: 'Medien'
    },
    'faz': {
      name: 'Frankfurter Allgemeine Zeitung GmbH',
      displayName: 'FAZ',
      email: 'abo@faz.de',
      cancelEmail: 'kuendigung@faz.de',
      address: {
        street: 'Hellerhofstraße 2-4',
        zip: '60327',
        city: 'Frankfurt am Main'
      },
      phone: '069 7591 0',
      keywords: ['faz', 'frankfurter allgemeine', 'f.a.z.'],
      category: 'Medien'
    },
    'sueddeutsche': {
      name: 'Süddeutscher Verlag GmbH',
      displayName: 'Süddeutsche Zeitung',
      email: 'abo@sz.de',
      cancelEmail: 'kuendigung@sz.de',
      address: {
        street: 'Hultschiner Straße 8',
        zip: '81677',
        city: 'München'
      },
      phone: '089 2183 0',
      keywords: ['süddeutsche', 'sueddeutsche', 'sz', 'süddeutsche zeitung'],
      category: 'Medien'
    }
  },

  // MOBILITÄT
  mobility: {
    'deutsche_bahn': {
      name: 'Deutsche Bahn AG',
      displayName: 'Deutsche Bahn',
      email: 'service@bahn.de',
      cancelEmail: 'abo-kuendigung@bahn.de',
      address: {
        street: 'Potsdamer Platz 2',
        zip: '10785',
        city: 'Berlin'
      },
      phone: '030 297 0',
      keywords: ['deutsche bahn', 'db', 'bahn', 'bahncard'],
      category: 'Mobilität'
    },
    'share_now': {
      name: 'SHARE NOW GmbH',
      displayName: 'SHARE NOW',
      email: 'service@share-now.com',
      cancelEmail: 'cancel@share-now.com',
      address: {
        street: 'Brunnenstraße 19-21',
        zip: '10119',
        city: 'Berlin'
      },
      keywords: ['share now', 'sharenow', 'car2go', 'drivenow'],
      category: 'Mobilität'
    },
    'miles': {
      name: 'Miles Mobility GmbH',
      displayName: 'MILES',
      email: 'support@miles-mobility.com',
      cancelEmail: 'cancel@miles-mobility.com',
      address: {
        street: 'Schmidtstraße 51',
        zip: '10179',
        city: 'Berlin'
      },
      keywords: ['miles', 'miles mobility', 'miles carsharing'],
      category: 'Mobilität'
    },
    'sixt': {
      name: 'Sixt SE',
      displayName: 'Sixt',
      email: 'service@sixt.de',
      cancelEmail: 'kuendigung@sixt.de',
      address: {
        street: 'Zugspitzstraße 1',
        zip: '82049',
        city: 'Pullach'
      },
      phone: '089 7444 0',
      keywords: ['sixt', 'sixt rent', 'sixt leasing', 'sixt+'],
      category: 'Mobilität'
    }
  }
};

// Helper function to find provider by text
function findProvider(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  // Search through all provider categories
  for (const category of Object.values(providers)) {
    for (const provider of Object.values(category)) {
      // Check if any keyword matches
      for (const keyword of provider.keywords) {
        if (lowerText.includes(keyword)) {
          return provider;
        }
      }
      
      // Also check the display name and full name
      if (lowerText.includes(provider.displayName.toLowerCase()) || 
          lowerText.includes(provider.name.toLowerCase())) {
        return provider;
      }
    }
  }
  
  return null;
}

// Helper function to get all providers as flat array
function getAllProviders() {
  const allProviders = [];
  for (const category of Object.values(providers)) {
    allProviders.push(...Object.values(category));
  }
  return allProviders;
}

// Helper function to get providers by category
function getProvidersByCategory(categoryName) {
  const result = [];
  for (const category of Object.values(providers)) {
    const filtered = Object.values(category).filter(p => p.category === categoryName);
    result.push(...filtered);
  }
  return result;
}

// Advanced provider detection with scoring
function detectProviderWithConfidence(text) {
  if (!text) return { provider: null, confidence: 0 };
  
  const lowerText = text.toLowerCase();
  const matches = [];
  
  // Search through all providers
  for (const category of Object.values(providers)) {
    for (const provider of Object.values(category)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of provider.keywords) {
        if (lowerText.includes(keyword)) {
          // Longer keywords get higher scores
          score += keyword.length * 2;
          
          // Exact word match gets bonus
          const regex = new RegExp(`\\b${keyword}\\b`, 'i');
          if (regex.test(text)) {
            score += 10;
          }
        }
      }
      
      // Check display name (high weight)
      if (lowerText.includes(provider.displayName.toLowerCase())) {
        score += 20;
      }
      
      // Check full name
      if (lowerText.includes(provider.name.toLowerCase())) {
        score += 15;
      }
      
      // Check email domain
      if (provider.email && lowerText.includes(provider.email.split('@')[1])) {
        score += 25;
      }
      
      // Check address components
      if (provider.address) {
        if (lowerText.includes(provider.address.city.toLowerCase())) score += 5;
        if (lowerText.includes(provider.address.street.toLowerCase())) score += 8;
      }
      
      if (score > 0) {
        matches.push({ provider, score });
      }
    }
  }
  
  // Sort by score and return best match
  matches.sort((a, b) => b.score - a.score);
  
  if (matches.length > 0) {
    const bestMatch = matches[0];
    // Calculate confidence (0-100)
    const confidence = Math.min(100, Math.round((bestMatch.score / 50) * 100));
    return {
      provider: bestMatch.provider,
      confidence,
      allMatches: matches
    };
  }
  
  return { provider: null, confidence: 0 };
}

// Export functions
module.exports = {
  providers,
  findProvider,
  getAllProviders,
  getProvidersByCategory,
  detectProviderWithConfidence
};