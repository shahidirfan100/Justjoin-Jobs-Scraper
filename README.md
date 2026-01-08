# JustJoin IT Jobs Scraper 🇵🇱

Extract high-quality job listings from **JustJoin.it**, the premier job board for the tech industry in Poland. This powerful tool allows you to collect structured data for developer roles, engineering positions, and other IT vacancies with ease.

## 🚀 Features

- **Direct Extraction**: Targeted data collection from official sources.
- **Deep Data Retrieval**: Optionally visit job detail pages to extract full descriptions and application links.
- **Smart Filtering**: Filter by keywords (React, Python, etc.), city (Warszawa, Kraków, etc.), and search radius.
- **Employment Filters**: Support for B2B, Permanent, and other contract types.
- **Automation Ready**: Use with Apify's API and Webhooks for automated job tracking.
- **Stealthy & Reliable**: Built-in support for residential and datacenter proxies.

## 📥 Input Parameters

The scraper accepts the following configuration:

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `startUrls` | array | Specific JustJoin.it search URLs to scrape. | `[]` |
| `keywords` | string | Search term for job title or skills (e.g., 'Frontend'). | `null` |
| `city` | string | City to filter results (e.g., 'Warszawa'). | `null` |
| `cityRadiusKm` | integer | Radius in km around the city search. | `30` |
| `collectDetails` | boolean | Fetch full descriptions from detail pages. | `true` |
| `maxItems` | integer | Limit the number of jobs collected. | `100` |
| `maxPages` | integer | Maximum number of result pages to crawl. | `10` |
| `pageSize` | integer | Number of items per request (max 100). | `100` |
| `employmentTypes`| array | Filter by 'b2b', 'permanent', etc. | `[]` |
| `proxyConfiguration`| object | Proxy settings (Residential recommended). | `{ "useApifyProxy": true }` |

## 📤 Output Data

The scraper provides structured results in formats like **JSON**, **CSV**, **Excel**, or **XML**. Each job listing includes fields such as:

- `title`: Job position title.
- `company`: Name of the hiring company.
- `location`: Location of the job (city).
- `experience`: junior, mid, senior.
- `salary`: Formatted salary string.
- `skills`: List of required technology skills.
- `date_posted`: Original posting date.
- `url`: Direct link to the job offer.

### Sample Output (JSON)

```json
{
  "title": "Senior Frontend Developer",
  "company": "Tech Solutions Sp. z o.o.",
  "location": "Warszawa",
  "experience": "senior",
  "salary": "25 000 - 32 000 PLN / month",
  "skills": ["React", "TypeScript", "Redux"],
  "date_posted": "2026-01-08T10:00:00Z",
  "url": "https://justjoin.it/offers/tech-solutions-senior-frontend-developer"
}
```

## 💡 How to Use

1. **Setup**: Provide a search keyword or a list of Start URLs.
2. **Configure**: Set your limits (e.g., `maxItems: 50`) and detail collection preference.
3. **Proxy**: Ensure Apify Proxy is enabled to maintain high success rates.
4. **Run**: Execute the actor and download your data from the **Dataset** tab.

## 🏆 SEO & Use Cases

- **Market Analysis**: Track tech salary trends across different Polish cities.
- **Lead Generation**: Identify companies hiring for specific technology stacks.
- **Job Aggregation**: Build your own niche job board or internal career portal.
- **Competitor Intelligence**: Monitor hiring patterns of top tech firms in Europe.

---
*Note: This tool is intended for personal and professional data analysis. Always respect the source website's terms of service.*
