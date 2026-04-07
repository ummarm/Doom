const axios = require("axios");
const { decode, slugToId } = require("../utils/helpers");

const BASE_URL = "https://one.1cinevood.watch";
const API_URL = `${BASE_URL}/wp-json/wp/v2`;

const CATEGORY_MAP = {
  "cinevood-latest": "",
  "cinevood-bollywood": "bollywood",
  "cinevood-hollywood": "hollywood",
  "cinevood-tamil": "tamil",
  "cinevood-telugu": "telugu",
  "cinevood-webseries": "web-series"
};

const catCache = new Map();

async function getCategoryId(slug) {
  if (catCache.has(slug)) return catCache.get(slug);

  try {
    const response = await axios.get(`${API_URL}/categories`, {
      params: { slug, per_page: 1 },
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*"
      }
    });

    const data = response.data;
    if (Array.isArray(data) && data.length > 0) {
      const id = data[0].id;
      catCache.set(slug, id);
      return id;
    }
  } catch (error) {
    console.error(`Category ID error for ${slug}:`, error.message);
  }

  return null;
}

async function getCatalog(catalogId, type, page = 1) {
  const categorySlug = CATEGORY_MAP[catalogId] || "";

  let url = `${API_URL}/posts?per_page=20&page=${page}`;

  if (categorySlug) {
    const catId = await getCategoryId(categorySlug);
    if (catId) {
      url += `&categories=${catId}`;
    }
  }

  try {
    console.log("[CATALOG URL]", url);

    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*"
      },
      validateStatus: () => true
    });

    const data = response.data;

    console.log("[CATALOG STATUS]", response.status);
    console.log("[CATALOG TYPE]", typeof data);

    // If API did not return array, send debug item
    if (!Array.isArray(data)) {
      return [
        {
          id: "cv:debug-non-array",
          type: "movie",
          name: `DEBUG non-array status=${response.status}`,
          poster: null,
          posterShape: "poster",
          description: typeof data === "string" ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
        }
      ];
    }

    if (data.length === 0) {
      return [
        {
          id: "cv:debug-empty-array",
          type: "movie",
          name: `DEBUG empty array`,
          poster: null,
          posterShape: "poster",
          description: `catalogId=${catalogId} slug=${categorySlug} page=${page}`
        }
      ];
    }

    return data.map(post => {
      const title = decode(post.title?.rendered || "");
      const slug = post.slug || "";
      const link = post.link || "";

      let poster = null;
      try {
        poster = post.meta?.fifu_image_url || null;
      } catch (e) {}

      if (!poster && post.content?.rendered) {
        const imgMatch = post.content.rendered.match(/src=["'](https?:\/\/image\.tmdb\.org[^"']+)["']/);
        if (imgMatch) poster = imgMatch[1];
      }

      const isSeries =
        title.toLowerCase().includes("season") ||
        link.includes("web-series") ||
        link.includes("tv-shows");

      return {
        id: slugToId(slug),
        type: isSeries ? "series" : "movie",
        name: title,
        poster: poster,
        posterShape: "poster",
        description: post.excerpt?.rendered ? decode(post.excerpt.rendered).substring(0, 200) : undefined
      };
    });

  } catch (error) {
    console.error("Catalog fetch error:", error.message);

    return [
      {
        id: "cv:debug-error",
        type: "movie",
        name: `DEBUG error`,
        poster: null,
        posterShape: "poster",
        description: error.message.substring(0, 200)
      }
    ];
  }
}

async function search(query) {
  try {
    const response = await axios.get(`${API_URL}/posts`, {
      params: { search: query, per_page: 20 },
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json, text/plain, */*"
      },
      validateStatus: () => true
    });

    const data = response.data;

    if (!Array.isArray(data)) return [];

    return data.map(post => {
      const title = decode(post.title?.rendered || "");
      const slug = post.slug || "";

      return {
        id: slugToId(slug),
        type: "movie",
        name: title
      };
    });

  } catch (error) {
    console.error("Search error:", error.message);
    return [];
  }
}

module.exports = { getStreams };
