// Simple EUR-Lex SPARQL Test
const fetch = require('node-fetch');

const ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";

// Very simple query - just get ANYTHING to test connectivity
const simpleQuery = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT * WHERE { ?s ?p ?o . } LIMIT 5
`;

(async () => {
  console.log('🧪 Testing EUR-Lex SPARQL Endpoint\n');
  console.log('Endpoint:', ENDPOINT);
  console.log('\n1. Testing basic connectivity...\n');

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "accept": "application/sparql-results+json"
      },
      body: new URLSearchParams({ query: simpleQuery })
    });

    console.log('Response status:', res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      console.error('Error response:', text);
      process.exit(1);
    }

    const data = await res.json();
    console.log('\n✅ EUR-Lex endpoint is reachable!');
    console.log('Results:', JSON.stringify(data, null, 2).substring(0, 500));

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
  }

  process.exit(0);
})();
