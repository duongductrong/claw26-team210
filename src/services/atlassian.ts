/**
 * Encodes email and API token to Base64 for Basic Authentication.
 */
function getAtlassianAuthHeader(): string {
  const email = process.env.ATLASSIAN_EMAIL || "";
  const token = process.env.ATLASSIAN_API_TOKEN || "";
  if (!email || !token) {
    return "";
  }
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

/**
 * Helper to call Jira Cloud REST API v3
 */
export async function callJiraCloudAPI(path: string, method = "GET", body: any = null): Promise<any> {
  let domain = process.env.ATLASSIAN_DOMAIN || "";
  if (!domain) {
    throw new Error("ATLASSIAN_DOMAIN is not configured in environment variables.");
  }
  domain = domain.replace(/^https?:\/\//i, "").split("/")[0].replace(/\.atlassian\.net$/i, "");
  const authHeader = getAtlassianAuthHeader();
  if (!authHeader) {
    throw new Error("Atlassian credentials (ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN) are not configured.");
  }

  const url = `https://${domain}.atlassian.net/rest/api/3${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira Cloud API error ${response.status}: ${errorText || response.statusText}`);
  }

  if (response.status === 204) {
    return {};
  }
  return response.json();
}

/**
 * Helper to call Confluence Cloud REST API v1
 */
export async function callConfluenceCloudAPI(path: string, method = "GET", body: any = null): Promise<any> {
  let domain = process.env.ATLASSIAN_DOMAIN || "";
  if (!domain) {
    throw new Error("ATLASSIAN_DOMAIN is not configured in environment variables.");
  }
  domain = domain.replace(/^https?:\/\//i, "").split("/")[0].replace(/\.atlassian\.net$/i, "");
  const authHeader = getAtlassianAuthHeader();
  if (!authHeader) {
    throw new Error("Atlassian credentials (ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN) are not configured.");
  }

  const url = `https://${domain}.atlassian.net/wiki/rest/api${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Confluence Cloud API error ${response.status}: ${errorText || response.statusText}`);
  }

  if (response.status === 204) {
    return {};
  }
  return response.json();
}
