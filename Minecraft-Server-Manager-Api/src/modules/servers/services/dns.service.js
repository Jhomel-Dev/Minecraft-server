export default class DnsService {
  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
    this.apiUrl = `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/dns_records`;
  }

  get isConfigured() {
    return Boolean(this.apiToken && this.zoneId);
  }

  async setCustomDomain(subdomain, tunnelAddress) {
    if (!this.isConfigured) {
      console.log(`[DNS Mock] Cloudflare credentials not set. Simulating DNS creation for ${subdomain} -> ${tunnelAddress}`);
      return true;
    }

    if (!tunnelAddress) {
       console.log(`[DNS Warning] No tunnel address provided. Cannot route ${subdomain}.`);
       return false;
    }

    console.log(`[DNS] Updating Cloudflare DNS for ${subdomain} pointing to ${tunnelAddress}`);
    try {
      
      const [targetIpOrHost, targetPort] = tunnelAddress.split(':');
      
      
      
      
      
      const record = {
        type: 'CNAME',
        name: subdomain,
        content: targetIpOrHost,
        ttl: 120, 
        proxied: false 
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      const data = await response.json();
      if (!data.success) {
        console.error('[DNS] Cloudflare API Error:', data.errors);
        
        throw new Error('Failed to create DNS record in Cloudflare');
      }

      console.log(`[DNS] Successfully routed ${subdomain}`);
      return true;
    } catch (error) {
      console.error('[DNS] Error executing DNS update:', error);
      throw error;
    }
  }
}
