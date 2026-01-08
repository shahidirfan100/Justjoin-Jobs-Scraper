# JustJoin IT Jobs Scraper

Extract thousands of tech job listings from **JustJoin.it**, Poland's largest IT job board. Get structured data including job titles, salaries, required skills, company information, and full descriptions — ready for analysis, integration, or building your own job aggregator.

## Why use this scraper?

JustJoin.it is the go-to platform for IT professionals in Poland, featuring positions from startups to Fortune 500 companies. This scraper enables you to:

- **Track market trends** — Monitor salary ranges across different technologies and cities
- **Generate leads** — Find companies actively hiring for specific tech stacks
- **Build job boards** — Aggregate listings for niche audiences or internal portals
- **Research competitors** — Analyze hiring patterns of tech companies in Central Europe

## Features

- **Smart filtering** — Search by keywords, city, and workplace preference
- **Full job details** — Extract complete descriptions, requirements, and application links
- **Salary data** — Get structured salary information with currency and payment frequency
- **Skills extraction** — Collect required and nice-to-have technology skills
- **Resume capability** — Automatically saves progress and resumes after interruptions
- **Export flexibility** — Download results as JSON, CSV, Excel, or XML

## Input parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `keywords` | String | Search term for job titles or skills (e.g., "React", "Python") |
| `city` | String | City name to filter results (e.g., "Warszawa", "Kraków") |
| `workplaceTypes` | Array | Work location: `remote`, `hybrid`, `office` |
| `collectDetails` | Boolean | Fetch full descriptions (default: true) |
| `maxItems` | Integer | Maximum jobs to collect (default: 100) |
| `maxPages` | Integer | Maximum result pages to process (default: 10) |
| `proxyConfiguration` | Object | Proxy settings for reliability |

## Output data

Each job listing contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Job position title |
| `company` | String | Hiring company name |
| `location` | String | Primary job location |
| `experience` | String | Required experience level |
| `salary` | String | Formatted salary range (e.g., "15000 - 25000 PLN / month") |
| `skills` | Array | Required technology skills |
| `employment_types` | Array | Available contract types with salary details |
| `workplace_type` | String | Remote, hybrid, or office |
| `date_posted` | String | Original posting date |
| `description_text` | String | Full job description (plain text) |
| `description_html` | String | Full job description (HTML) |
| `apply_url` | String | Direct application link |
| `url` | String | Job listing URL |

## Example output

```json
{
  "title": "Senior Frontend Developer",
  "company": "Tech Solutions Sp. z o.o.",
  "location": "Warszawa",
  "experience": "senior",
  "salary": "25000 - 32000 PLN / month",
  "skills": ["React", "TypeScript", "Redux"],
  "workplace_type": "hybrid",
  "employment_types": [
    {
      "type": "b2b",
      "from": 25000,
      "to": 32000,
      "currency": "pln"
    }
  ],
  "date_posted": "2026-01-08T10:00:00Z",
  "description_text": "We are looking for an experienced frontend developer...",
  "apply_url": "https://justjoin.it/job-offer/tech-solutions-senior-frontend-developer/apply",
  "url": "https://justjoin.it/job-offer/tech-solutions-senior-frontend-developer"
}
```

## Usage examples

### Collect React jobs in Warsaw

```json
{
  "keywords": "React",
  "city": "Warszawa",
  "maxItems": 200
}
```

### Find remote Python positions

```json
{
  "keywords": "Python",
  "workplaceTypes": ["remote"],
  "maxItems": 100
}
```

### Quick listing scan (no details)

```json
{
  "maxItems": 500,
  "collectDetails": false
}
```

## Integrations

Connect this scraper to your workflow using:

- **Apify API** — Programmatic access to run the actor and fetch results
- **Webhooks** — Get notified when new data is available
- **Integrations** — Connect to Google Sheets, Slack, Zapier, Make, and more
- **Scheduling** — Run daily or weekly to track new job postings

## Tips for best results

1. **Use Apify Proxy** — Enable residential proxies for higher success rates
2. **Start with defaults** — Test with small batches before large extractions
3. **Filter wisely** — Combine filters to get targeted, relevant results
4. **Schedule runs** — Set up recurring runs to monitor new opportunities

## Cost estimation

The scraper is optimized for efficiency. Typical costs:

| Jobs | Details | Estimated Cost |
|------|---------|----------------|
| 100 | Yes | ~$0.10 |
| 500 | Yes | ~$0.40 |
| 1000 | No | ~$0.20 |

Actual costs depend on proxy usage and retry rates.

## Legal and compliance

This scraper is designed for legitimate data collection purposes such as market research, lead generation, and job aggregation. Users are responsible for ensuring their use complies with applicable laws and JustJoin.it's terms of service.

## Support

- **Issues?** Open a ticket in the Issues tab
- **Questions?** Use the Discussion section
- **Updates?** Star this actor to get notified of improvements

---

Built for recruiters, researchers, and developers who need reliable access to Poland's tech job market.
