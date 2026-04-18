/**
 * blog.js  — Sri Sai Inter College · Student Diaries
 * Sanity.io integration + UI logic (no build step required)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SETUP (do once)                                                    │
 * │  1. Go to https://sanity.io/manage → your project → API            │
 * │  2. Add http://127.0.0.1:5500 (dev) and your live domain to CORS   │
 * │  3. Replace PROJECT_ID and DATASET below                           │
 * └─────────────────────────────────────────────────────────────────────┘
 */

// ── CONFIG ──────────────────────────────────────────────────────────────────
const SANITY_PROJECT_ID = 'vlbzjlq6';   // ← replace
const SANITY_DATASET = 'production';
const SANITY_API_VER = '2024-01-01';
const SANITY_CDN = false;  // bypass CDN to always get fresh data (set true in production)

const BASE_URL = `https://${SANITY_PROJECT_ID}.${SANITY_CDN ? 'apicdn' : 'api'}.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}`;
const IMG_BASE = `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/`;

// ── GROQ QUERIES ─────────────────────────────────────────────────────────────
const QUERY_ALL_POSTS = encodeURIComponent(`
  *[_type == "post"] | order(publishedAt desc) {
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    author,
    readTime,
    featured,
    "mainImage": mainImage{
      "url": asset->url,
      "lqip": asset->metadata.lqip,
      alt
    },
    "category": category->{ title, "slug": slug.current, color }
  }
`);

const QUERY_CATEGORIES = encodeURIComponent(`
  *[_type == "category"] | order(title asc) {
    title,
    "slug": slug.current
  }
`);

// single post by slug — used in blog-post.html
const querySinglePost = (slug) => encodeURIComponent(`
  *[_type == "post" && slug.current == "${slug}"][0] {
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    author,
    readTime,
    "body": body[]{
      ...,
      "asset": asset->{ url }
    },
    "mainImage": mainImage{ "url": asset->url, alt },
    "category": category->{ title, "slug": slug.current, color }
  }
`);

const queryRelated = (categorySlug, currentSlug) => encodeURIComponent(`
  *[_type == "post" && category->slug.current == "${categorySlug}" && slug.current != "${currentSlug}"] | order(publishedAt desc) [0...3] {
    title,
    "slug": slug.current,
    publishedAt,
    excerpt,
    "mainImage": mainImage{ "url": asset->url, alt },
    "category": category->{ title, "slug": slug.current }
  }
`);

// ── FETCH HELPER ─────────────────────────────────────────────────────────────
async function sanityFetch(query) {
  const res = await fetch(`${BASE_URL}?query=${query}`);
  if (!res.ok) throw new Error(`Sanity fetch failed: ${res.status}`);
  const data = await res.json();
  return data.result;
}

// ── IMAGE URL BUILDER ────────────────────────────────────────────────────────
function imgUrl(post, width = 800) {
  if (!post.mainImage?.url) return 'img/blog-placeholder.jpg';
  // Sanity image transform via URL params
  return `${post.mainImage.url}?w=${width}&auto=format&fit=crop&q=80`;
}

// ── DATE FORMATTER ────────────────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── PORTABLE TEXT → HTML ─────────────────────────────────────────────────────
function portableTextToHtml(blocks = []) {
  return blocks.map(block => {
    if (block._type === 'image') {
      // asset->url is resolved by GROQ; fall back to building URL from _ref if needed
      let url = block.asset?.url || '';
      if (!url && block.asset?._ref) {
        // _ref format: "image-<id>-<width>x<height>-<ext>"
        const ref = block.asset._ref.replace(/^image-/, '').replace(/-(\w+)$/, '.$1').replace(/-(\d+x\d+)-/, '-$1-');
        url = `${IMG_BASE}${ref}`;
      }
      const src = url ? `${url}?w=900&auto=format&fit=max&q=80` : '';
      if (!src) return ''; // skip if still no URL
      return `<figure class="post-img">
        <img src="${src}" alt="${block.alt || ''}" loading="lazy">
        ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ''}
      </figure>`;
    }
    if (block._type !== 'block') return '';

    const tag = {
      normal: 'p', h2: 'h2', h3: 'h3', blockquote: 'blockquote'
    }[block.style] || 'p';

    const text = (block.children || []).map(span => {
      let t = span.text || '';
      if (span.marks?.includes('strong')) t = `<strong>${t}</strong>`;
      if (span.marks?.includes('em')) t = `<em>${t}</em>`;
      if (span.marks?.includes('underline')) t = `<u>${t}</u>`;
      return t;
    }).join('');

    return `<${tag}>${text}</${tag}>`;
  }).join('\n');
}

// ── SKELETON LOADER ───────────────────────────────────────────────────────────
function skeletonCard() {
  return `<div class="skeleton-card">
    <div class="skel skel-img"></div>
    <div class="skel-body">
      <div class="skel skel-badge"></div>
      <div class="skel skel-title"></div>
      <div class="skel skel-title short"></div>
      <div class="skel skel-line"></div>
      <div class="skel skel-line"></div>
      <div class="skel skel-line short"></div>
    </div>
  </div>`;
}

// ── CATEGORY BADGE ────────────────────────────────────────────────────────────
function categoryBadge(cat) {
  const color = cat?.color || '#A3332D';
  const label = cat?.title || 'General';
  return `<span class="cat-badge" style="background:${color};">${label}</span>`;
}

// ── BLOG CARD (GRID) ──────────────────────────────────────────────────────────
function renderCard(post) {
  const slug = post.slug;
  const cat = post.category?.slug || 'all';
  return `
  <article class="blog-card reveal-card" data-category="${cat}" onclick="window.location='blog-post.html?slug=${slug}'">
    <div class="card-img-wrap">
      <img src="${imgUrl(post, 600)}" alt="${post.mainImage?.alt || post.title}" loading="lazy">
    </div>
    <div class="card-body">
      <div class="card-meta">
        ${categoryBadge(post.category)}
        <span class="card-date"><i class="fas fa-calendar-alt"></i> ${formatDate(post.publishedAt)}</span>
      </div>
      <h3 class="card-title">${post.title}</h3>
      <p class="card-excerpt">${post.excerpt || ''}</p>
      <div class="card-footer">
        <span class="card-author"><i class="fas fa-user-circle"></i> ${post.author || 'Student Contributor'}</span>
        ${post.readTime ? `<span class="read-time"><i class="fas fa-clock"></i> ${post.readTime} min read</span>` : ''}
      </div>
    </div>
  </article>`;
}

// ── FEATURED HERO CARD ────────────────────────────────────────────────────────
function renderFeatured(post) {
  return `
  <div class="featured-card" onclick="window.location='blog-post.html?slug=${post.slug}'" role="button" tabindex="0">
    <div class="featured-img">
      <img src="${imgUrl(post, 1200)}" alt="${post.mainImage?.alt || post.title}">
      <div class="featured-overlay"></div>
    </div>
    <div class="featured-content">
      <div class="featured-meta">
        <span class="featured-tag">✦ Featured Story</span>
        ${categoryBadge(post.category)}
      </div>
      <h2 class="featured-title">${post.title}</h2>
      <p class="featured-excerpt">${post.excerpt || ''}</p>
      <div class="featured-footer">
        <span><i class="fas fa-user-circle"></i> ${post.author || 'Student Contributor'}</span>
        <span><i class="fas fa-calendar-alt"></i> ${formatDate(post.publishedAt)}</span>
        ${post.readTime ? `<span><i class="fas fa-clock"></i> ${post.readTime} min</span>` : ''}
        <span class="read-btn">Read Story <i class="fas fa-arrow-right"></i></span>
      </div>
    </div>
  </div>`;
}

// ── INTERSECTION OBSERVER (fade-in) ──────────────────────────────────────────
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), i * 80);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal-card').forEach(el => obs.observe(el));
}

// ── FILTER BAR ────────────────────────────────────────────────────────────────
function initFilter() {
  const btns = document.querySelectorAll('.filter-btn');
  const cards = () => document.querySelectorAll('.blog-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      let visible = 0;
      cards().forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      const empty = document.getElementById('empty-state');
      if (empty) empty.style.display = visible === 0 ? 'flex' : 'none';
    });
  });
}

// ── POPULATE FILTER BAR WITH REAL CATEGORIES ─────────────────────────────────
function populateFilterBar(categories) {
  const bar = document.getElementById('filter-btns');
  if (!bar) return;
  const extras = categories.map(c =>
    `<button class="filter-btn" data-filter="${c.slug}">${c.title}</button>`
  ).join('');
  bar.innerHTML = `<button class="filter-btn active" data-filter="all">All Posts</button>${extras}`;
  initFilter();
}

// ── STICKY FILTER BAR ─────────────────────────────────────────────────────────
function initStickyFilter() {
  const bar = document.querySelector('.filter-bar');
  const hero = document.querySelector('.blog-hero');
  if (!bar || !hero) return;

  const obs = new IntersectionObserver(([e]) => {
    bar.classList.toggle('stuck', !e.isIntersecting);
  }, { threshold: 0 });
  obs.observe(hero);
}

// ── MAIN — BLOG LISTING PAGE ──────────────────────────────────────────────────
async function initBlogPage() {
  const skeleton = document.getElementById('loading-skeleton');
  const featured = document.getElementById('featured-wrap');
  const grid = document.getElementById('posts-grid');
  const emptyEl = document.getElementById('empty-state');

  try {
    // Show skeletons
    if (skeleton) skeleton.innerHTML = Array(6).fill(skeletonCard()).join('');

    const [posts, categories] = await Promise.all([
      sanityFetch(QUERY_ALL_POSTS),
      sanityFetch(QUERY_CATEGORIES),
    ]);

    // Hide skeleton
    if (skeleton) skeleton.style.display = 'none';

    if (!posts || posts.length === 0) {
      if (emptyEl) emptyEl.style.display = 'flex';
      return;
    }

    // Populate filter bar
    populateFilterBar(categories || []);

    // Featured post — prefer marked featured, else first post
    const featuredPost = posts.find(p => p.featured) || posts[0];
    if (featured) featured.innerHTML = renderFeatured(featuredPost);

    // Grid: remaining posts (skip the featured one)
    const gridPosts = posts.filter(p => p.slug !== featuredPost.slug).slice(0, 9);
    if (grid) grid.innerHTML = gridPosts.map(renderCard).join('');

    // Animations
    initReveal();
    initStickyFilter();

  } catch (err) {
    console.error('Sanity fetch error:', err);
    if (skeleton) skeleton.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Could not load posts. Please check your Sanity config.</p>
        <small>${err.message}</small>
      </div>`;
  }
}

// ── MAIN — SINGLE POST PAGE ───────────────────────────────────────────────────
async function initPostPage() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) { window.location = 'blog.html'; return; }

  const spinner = document.getElementById('post-spinner');
  const postWrap = document.getElementById('post-content');
  const relatedEl = document.getElementById('related-posts');

  try {
    const post = await sanityFetch(querySinglePost(slug));

    if (spinner) spinner.style.display = 'none';

    if (!post) {
      if (postWrap) postWrap.innerHTML = `<p class="error-msg">Post not found.</p>`;
      return;
    }

    // Now fetch related posts based on the category of the loaded post
    const categorySlug = post.category?.slug || '';
    let related = [];
    if (categorySlug) {
      try {
        related = await sanityFetch(queryRelated(categorySlug, slug));
      } catch (err) {
        console.warn('Failed to fetch related posts:', err);
      }
    }

    // Update page meta
    document.title = `${post.title} | Sri Sai Inter College`;

    if (postWrap) {
      postWrap.innerHTML = `
        <div class="post-hero" style="background-image:url('${imgUrl(post, 1400)}')">
          <div class="post-hero-overlay"></div>
          <div class="post-hero-content container">
            ${categoryBadge(post.category)}
            <h1>${post.title}</h1>
            <div class="post-hero-meta">
              <span><i class="fas fa-user-circle"></i> ${post.author || 'Student Contributor'}</span>
              <span><i class="fas fa-calendar-alt"></i> ${formatDate(post.publishedAt)}</span>
              ${post.readTime ? `<span><i class="fas fa-clock"></i> ${post.readTime} min read</span>` : ''}
            </div>
          </div>
        </div>
        <div class="post-body container">
          <article class="post-article">
            ${portableTextToHtml(post.body || [])}
          </article>
        </div>`;
    }

    // Related posts
    if (relatedEl && related?.length) {
      relatedEl.innerHTML = `
        <div class="container">
          <div class="related-header">
            <span class="section-label">Keep Reading</span>
            <h2 class="section-title">Related <span>Stories</span></h2>
          </div>
          <div class="related-grid">
            ${related.map(renderCard).join('')}
          </div>
        </div>`;
      initReveal();
    }

  } catch (err) {
    console.error(err);
    if (spinner) spinner.style.display = 'none';
    if (postWrap) postWrap.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>${err.message}</p></div>`;
  }
}

// ── BOOT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'blog') initBlogPage();
  if (document.body.dataset.page === 'blog-post') initPostPage();
});
