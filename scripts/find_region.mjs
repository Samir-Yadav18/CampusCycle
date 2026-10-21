import dns from 'dns';

dns.resolve('jresgcozfanfgbeszavf.supabase.co', (err, addr) => {
  console.log('API IPv4:', err ? err.code : addr);
});

// Check CNAME if any
dns.resolveCname('jresgcozfanfgbeszavf.supabase.co', (err, addr) => {
  console.log('API CNAME:', err ? err.code : addr);
});

dns.resolveCname('db.jresgcozfanfgbeszavf.supabase.co', (err, addr) => {
  console.log('DB CNAME:', err ? err.code : addr);
});
