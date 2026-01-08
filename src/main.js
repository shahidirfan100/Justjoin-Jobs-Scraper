import { Actor, log } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { load as cheerioLoad } from 'cheerio';
import { gotScraping } from 'got-scraping';

// ===== API ENDPOINTS =====
const API_V2_BASE = 'https://api.justjoin.it/v2/user-panel/offers/by-cursor';
const API_DETAIL_BASE = 'https://justjoin.it/api/candidate-api/offers';
const DEFAULT_LIST_URL = 'https://justjoin.it/job-offers/all-locations';

// ===== STEALTH: User-Agent Rotation =====
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
];

const getRandomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = (min, max) => sleep(min + Math.random() * (max - min));

const toInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toArray = (value) => {
    if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && String(item).trim() !== '');
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
};

const toCsv = (value) => {
    const items = toArray(value);
    return items.length ? items.join(',') : null;
};

const cleanText = (html) => {
    if (!html) return null;
    const $ = cheerioLoad(String(html));
    $('script, style, noscript, iframe').remove();
    const text = $.root().text().replace(/\s+/g, ' ').trim();
    return text || null;
};

// Clean HTML - strip CSS classes but keep semantic tags
const cleanHtml = (html) => {
    if (!html) return null;
    const $ = cheerioLoad(String(html));
    $('script, style, noscript, iframe').remove();
    // Remove all class attributes
    $('[class]').removeAttr('class');
    // Remove all style attributes
    $('[style]').removeAttr('style');
    // Remove all id attributes
    $('[id]').removeAttr('id');
    // Remove all data attributes
    $('*').each((_, el) => {
        const attribs = $(el).attr();
        if (attribs) {
            Object.keys(attribs).forEach((attr) => {
                if (attr.startsWith('data-')) $(el).removeAttr(attr);
            });
        }
    });
    return $.html().trim() || null;
};

// Simplify employment types - keep only essential fields
const simplifyEmploymentTypes = (types) => {
    if (!Array.isArray(types) || types.length === 0) return null;
    return types.slice(0, 3).map((t) => ({
        type: t?.type || null,
        from: t?.from ?? t?.fromPerUnit ?? null,
        to: t?.to ?? t?.toPerUnit ?? null,
        currency: t?.currency ? String(t.currency).toUpperCase() : null,
    })).filter((t) => t.type);
};

const mapSkills = (skills) => {
    if (!Array.isArray(skills)) return null;
    const items = skills
        .map((skill) => {
            if (!skill) return null;
            if (typeof skill === 'string') return skill.trim() || null;
            if (typeof skill.name === 'string') return skill.name.trim() || null;
            return null;
        })
        .filter(Boolean);
    return items.length ? items : null;
};

const summarizeSalary = (employmentTypes) => {
    if (!Array.isArray(employmentTypes) || employmentTypes.length === 0) return null;
    const original = employmentTypes.find((item) => String(item?.currencySource || '').toLowerCase() === 'original') || employmentTypes[0];
    if (!original) return null;
    const from = original.fromPerUnit ?? original.from ?? null;
    const to = original.toPerUnit ?? original.to ?? null;
    const currency = original.currency || null;
    const unit = original.unit ? String(original.unit).toLowerCase() : null;
    if (from === null && to === null) return null;
    const range = from !== null && to !== null ? `${from} - ${to}` : `${from ?? to}`;
    const suffix = currency ? ` ${currency.toUpperCase()}` : '';
    const per = unit ? ` / ${unit}` : '';
    return `${range}${suffix}${per}`.trim();
};

const extractStartUrls = (input) => {
    const urls = [];
    const pushUrl = (value) => {
        if (!value) return;
        if (typeof value === 'string') urls.push(value);
        if (typeof value === 'object' && typeof value.url === 'string') urls.push(value.url);
    };
    if (Array.isArray(input.startUrls)) input.startUrls.forEach(pushUrl);
    return urls;
};

const extractJobPostingJsonLd = ($) => {
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i += 1) {
        try {
            const raw = $(scripts[i]).text();
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
                if (!item) continue;
                const type = item['@type'] || item.type;
                if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
                    return item;
                }
            }
        } catch (error) {
            continue;
        }
    }
    return null;
};

const extractListJsonLd = ($) => {
    const urls = new Set();
    const scripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i += 1) {
        try {
            const raw = $(scripts[i]).text();
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of items) {
                if (!item) continue;
                const type = item['@type'] || item.type;
                if (type === 'CollectionPage' && Array.isArray(item.hasPart)) {
                    item.hasPart.forEach((part) => {
                        if (part?.url) urls.add(part.url);
                    });
                }
            }
        } catch (error) {
            continue;
        }
    }
    return [...urls];
};

const extractJobUrlsFromHtml = ($) => {
    const urls = new Set();
    $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        if (/\/job-offer\//i.test(href)) {
            try {
                const absolute = new URL(href, 'https://justjoin.it').href;
                urls.add(absolute);
            } catch {
                return;
            }
        }
    });
    return [...urls];
};

await Actor.init();

try {
    const input = (await Actor.getInput()) || {};
    const proxyConfiguration = input.proxyConfiguration
        ? await Actor.createProxyConfiguration({ ...input.proxyConfiguration })
        : undefined;

    // ===== CONFIGURATION =====
    const maxItemsRaw = toInt(input.maxItems, 50);
    const maxPages = Math.max(1, toInt(input.maxPages, 10));
    const pageSize = 100; // Fixed optimal page size
    const collectDetails = input.collectDetails !== false;
    const maxConcurrency = 10;
    const minDelayMs = 150;
    const maxDelayMs = 400;

    const maxItems = maxItemsRaw > 0 ? maxItemsRaw : Number.POSITIVE_INFINITY;
    const keywords = typeof input.keywords === 'string' && input.keywords.trim() ? input.keywords.trim() : null;
    const city = typeof input.city === 'string' && input.city.trim() ? input.city.trim() : null;
    const workplaceTypes = toCsv(input.workplaceTypes);

    // ===== STATE PERSISTENCE =====
    const defaultState = { saved: 0, seen: [], cursor: null };
    const persistedState = await Actor.getValue('STATE') || defaultState;
    const state = {
        saved: persistedState.saved || 0,
        seen: new Set(persistedState.seen || []),
        cursor: persistedState.cursor || null,
    };

    const persistState = async () => {
        await Actor.setValue('STATE', {
            saved: state.saved,
            seen: [...state.seen],
            cursor: state.cursor,
        });
    };

    Actor.on('migrating', persistState);
    Actor.on('aborting', persistState);

    log.info(`🚀 Starting JustJoin Scraper: maxItems=${Number.isFinite(maxItems) ? maxItems : 'unlimited'}, collectDetails=${collectDetails}`);

    // ===== HTTP REQUEST HELPERS =====
    const getHeaders = () => ({
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9,pl;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://justjoin.it/',
        'Origin': 'https://justjoin.it',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
    });

    const requestJson = async (url, retries = 3) => {
        const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await gotScraping({
                    url,
                    responseType: 'json',
                    timeout: { request: 30000 },
                    headers: getHeaders(),
                    proxyUrl,
                    http2: true,
                });
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    throw new Error(`HTTP ${response.statusCode}`);
                }
                return response.body;
            } catch (error) {
                if (attempt === retries) throw error;
                const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
                log.debug(`Retry ${attempt}/${retries} for ${url}, waiting ${waitTime}ms`);
                await sleep(waitTime);
            }
        }
    };

    const requestText = async (url, retries = 3) => {
        const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const response = await gotScraping({
                    url,
                    responseType: 'text',
                    timeout: { request: 30000 },
                    headers: { ...getHeaders(), 'Accept': 'text/html,application/xhtml+xml' },
                    proxyUrl,
                    http2: true,
                });
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    throw new Error(`HTTP ${response.statusCode}`);
                }
                return response.body;
            } catch (error) {
                if (attempt === retries) throw error;
                const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
                await sleep(waitTime);
            }
        }
    };

    const sitemapCache = { urls: null };

    const extractSitemapUrls = (text) => {
        if (!text) return [];
        const matches = text.match(/https?:\/\/justjoin\.it\/job-offer\/[^\s"<]+/gi) || [];
        return [...new Set(matches)];
    };

    const fetchSitemapUrls = async () => {
        if (sitemapCache.urls) return sitemapCache.urls;
        try {
            const body = await requestText('https://justjoin.it/sitemap.xml');
            const urls = extractSitemapUrls(body);
            sitemapCache.urls = urls;
            if (urls.length) log.info(`📍 Sitemap fallback found ${urls.length} offers.`);
            return urls;
        } catch (error) {
            log.warning(`Sitemap fallback failed: ${error.message}`);
            sitemapCache.urls = [];
            return [];
        }
    };

    const buildOfferUrl = (slug) => (slug ? `https://justjoin.it/job-offer/${slug}` : null);

    const buildOfferItem = (offer, detail) => {
        const slug = detail?.slug || offer?.slug || null;
        const employment = detail?.employmentTypes || offer?.employmentTypes || null;
        return {
            id: detail?.id || offer?.guid || null,
            slug,
            title: detail?.title || offer?.title || null,
            company: detail?.companyName || offer?.companyName || null,
            company_logo: detail?.companyLogoUrl || offer?.companyLogoThumbUrl || null,
            category: detail?.category?.key || offer?.category?.key || null,
            workplace_type: detail?.workplaceType || offer?.workplaceType || null,
            experience: detail?.experienceLevel || offer?.experienceLevel || null,
            location: detail?.city || offer?.city || (detail?.locations?.length ? detail.locations[0].city : null) || null,
            country_code: detail?.countryCode || null,
            employment_types: simplifyEmploymentTypes(employment),
            salary: summarizeSalary(employment),
            skills: mapSkills(detail?.requiredSkills || offer?.requiredSkills),
            date_posted: detail?.publishedAt || offer?.publishedAt || null,
            description_html: cleanHtml(detail?.body) || null,
            description_text: detail?.body ? cleanText(detail.body) : null,
            url: buildOfferUrl(slug),
            source: 'justjoin.it',
        };
    };

    const mapWithConcurrency = async (items, limit, mapper) => {
        const results = new Array(items.length);
        let index = 0;
        const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
            while (index < items.length) {
                const current = index;
                index += 1;
                results[current] = await mapper(items[current]);
            }
        });
        await Promise.all(workers);
        return results;
    };

    const shouldSkip = (item) => {
        const key = item?.slug || item?.url;
        if (!key) return false;
        if (state.seen.has(key)) return true;
        state.seen.add(key);
        return false;
    };

    const pushItem = async (item) => {
        if (!item || shouldSkip(item)) return;
        await Actor.pushData(item);
        state.saved += 1;
        if (state.saved % 25 === 0) {
            log.info(`📊 Progress: ${state.saved} jobs saved`);
            await persistState();
        }
    };

    // ===== V2 API: Fetch offers page using cursor pagination =====
    const fetchOffersPageV2 = async (cursor, itemsCount) => {
        const url = new URL(API_V2_BASE);
        url.searchParams.set('itemsCount', String(itemsCount));
        url.searchParams.set('sortBy', 'published');
        url.searchParams.set('orderBy', 'DESC');

        if (cursor !== null && cursor !== undefined) {
            url.searchParams.set('cursor', String(cursor));
        }

        if (keywords) url.searchParams.set('keywords', keywords);
        if (city) url.searchParams.set('city', city);
        if (workplaceTypes) url.searchParams.set('workplaceTypes', workplaceTypes);

        return requestJson(url.href);
    };

    // ===== Detail API: Fetch full job details =====
    const fetchOfferDetail = async (slug) => {
        if (!slug) return null;
        const url = `${API_DETAIL_BASE}/${slug}`;
        try {
            const detail = await requestJson(url);
            await randomDelay(minDelayMs, maxDelayMs);
            return detail;
        } catch (error) {
            log.debug(`Detail fetch failed for ${slug}: ${error.message}`);
            return null;
        }
    };

    // ===== PRIMARY: JSON API Scraper =====
    const runApiScraper = async () => {
        log.info('🔌 Using JSON API');
        let cursor = state.cursor;
        let apiTouched = false;

        for (let page = 1; page <= maxPages && state.saved < maxItems; page += 1) {
            const remaining = Number.isFinite(maxItems) ? Math.max(0, maxItems - state.saved) : pageSize;
            const itemsCount = Number.isFinite(maxItems) ? Math.min(pageSize, remaining) : pageSize;
            if (itemsCount <= 0) break;

            let response;
            try {
                response = await fetchOffersPageV2(cursor, itemsCount);
                apiTouched = true;
            } catch (error) {
                log.warning(`❌ API page ${page} failed: ${error.message}`);
                return apiTouched;
            }

            const offers = Array.isArray(response?.data) ? response.data : [];
            if (!offers.length) {
                log.info(`📭 No more offers found at page ${page}`);
                break;
            }

            log.info(`📦 Page ${page}: fetched ${offers.length} offers (total: ${response?.meta?.totalItems || 'unknown'})`);

            const limitedOffers = Number.isFinite(maxItems) ? offers.slice(0, remaining) : offers;
            const items = collectDetails
                ? await mapWithConcurrency(limitedOffers, maxConcurrency, async (offer) => {
                    const detail = await fetchOfferDetail(offer.slug);
                    return buildOfferItem(offer, detail);
                })
                : limitedOffers.map((offer) => buildOfferItem(offer, null));

            for (const item of items) {
                if (state.saved >= maxItems) break;
                await pushItem(item);
            }

            const nextCursor = response?.meta?.next?.cursor;
            if (nextCursor === null || nextCursor === undefined) {
                log.info('📄 Reached last page');
                break;
            }
            cursor = nextCursor;
            state.cursor = cursor;

            await randomDelay(minDelayMs, maxDelayMs);
        }
        return apiTouched;
    };

    // ===== FALLBACK: HTML Scraper =====
    const runHtmlFallback = async () => {
        log.warning('⚠️ Falling back to HTML parsing');
        const startUrls = extractStartUrls(input);
        const listUrl = startUrls.length ? startUrls[0] : DEFAULT_LIST_URL;

        const crawler = new CheerioCrawler({
            proxyConfiguration,
            maxRequestRetries: 3,
            useSessionPool: true,
            maxConcurrency: Math.min(10, maxConcurrency),
            requestHandlerTimeoutSecs: 60,
            async requestHandler({ request, $, enqueueLinks }) {
                const label = request.userData?.label || 'LIST';

                if (label === 'LIST') {
                    const jsonLdUrls = extractListJsonLd($);
                    let urls = jsonLdUrls.length ? jsonLdUrls : extractJobUrlsFromHtml($);
                    if (!urls.length) {
                        urls = await fetchSitemapUrls();
                    }

                    const remaining = Number.isFinite(maxItems) ? Math.max(0, maxItems - state.saved) : urls.length;
                    const batch = urls.slice(0, remaining);

                    if (collectDetails) {
                        if (batch.length) await enqueueLinks({ urls: batch, userData: { label: 'DETAIL' } });
                    } else {
                        for (const url of batch) {
                            if (state.saved >= maxItems) break;
                            await pushItem({ url, source: 'justjoin.it' });
                        }
                    }
                    return;
                }

                if (label === 'DETAIL') {
                    if (state.saved >= maxItems) return;
                    const json = extractJobPostingJsonLd($);
                    let title = json?.title || json?.name || null;
                    let company = json?.hiringOrganization?.name || null;
                    if (!title || !company) {
                        const docTitle = $('title').first().text().trim();
                        if (docTitle.includes(' - ')) {
                            const parts = docTitle.split(' - ');
                            if (!title) title = parts[0]?.trim() || null;
                            if (!company) company = parts.slice(1).join(' - ').trim() || null;
                        }
                    }

                    const descriptionHtml = json?.description || null;
                    const empTypes = json?.employmentType
                        ? Array.isArray(json.employmentType)
                            ? json.employmentType
                            : [json.employmentType]
                        : null;

                    const slug = (() => {
                        try {
                            return new URL(request.url).pathname.split('/').filter(Boolean).pop() || null;
                        } catch {
                            return null;
                        }
                    })();

                    const item = {
                        slug,
                        title,
                        company,
                        location: null,
                        experience: null,
                        skills: null,
                        employment_types: empTypes,
                        salary: json?.baseSalary?.value?.value || json?.baseSalary?.value?.minValue || null,
                        date_posted: json?.datePosted || null,
                        description_html: descriptionHtml,
                        description_text: descriptionHtml ? cleanText(descriptionHtml) : null,
                        url: request.url,
                        source: 'justjoin.it',
                    };

                    await pushItem(item);
                }
            },
        });

        await crawler.run([{ url: listUrl, userData: { label: 'LIST', pageNo: 1 } }]);
    };

    // ===== RUN =====
    const apiSucceeded = await runApiScraper();
    if (!apiSucceeded && state.saved === 0) {
        await runHtmlFallback();
    }

    await persistState();
    log.info(`✅ Finished. Saved ${state.saved} jobs.`);
    await Actor.exit();
} catch (error) {
    log.exception(error);
    await Actor.fail(`Run failed: ${error.message}`);
}
