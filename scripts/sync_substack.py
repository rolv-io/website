#!/usr/bin/env python3
"""
Syncs posts tagged with 'rolv' from Substack (biodatahacks.substack.com)
and generates static HTML pages:
- website/blog/index.html (Article index / grid)
- website/blog/{slug}.html (Individual article pages with full text, images, and captions)
- website/blog.html (Redirect helper)
"""

import os
import sys
import json
import urllib.request
import urllib.error
import re
from datetime import datetime
import html

SUBSTACK_POSTS_URL = "https://biodatahacks.substack.com/api/v1/posts?limit=50"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 (rolv.io blog sync)"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WEBSITE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BLOG_DIR = os.path.join(WEBSITE_DIR, "blog")
CACHE_FILE = os.path.join(SCRIPT_DIR, "posts_cache.json")

CLOUDFLARE_ANALYTICS = """<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "22956b3c44774125b79b1c456a44252e"}'></script><!-- End Cloudflare Web Analytics -->"""

LOGO_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2" height="32" preserveAspectRatio="xMidYMid meet">
    <g transform="matrix(1.6794,0,0,2.27631,188.384,-1051.21)">
        <ellipse cx="192.698" cy="686.728" rx="304.871" ry="224.925" fill="none"/>
    </g>
    <g transform="matrix(7.99889,0,0,7.99889,112,64.3929)">
        <path d="M99.7,76.4L59.9,7.5C59.5,6.8 58.7,6.4 57.9,6.4L42,6.4C41.2,6.4 40.4,6.8 40,7.5L0.3,76.4C-0.1,77.1 -0.1,78 0.3,78.7L8.3,92.5C8.7,93.2 9.5,93.6 10.3,93.6L89.8,93.6C90.6,93.6 91.4,93.2 91.8,92.5L99.8,78.7C100.1,78 100.1,77.1 99.7,76.4ZM43.4,11L54,11L24.2,62.6C23.8,63.3 23.8,64.2 24.2,64.9C24.6,65.6 25.4,66 26.2,66L56.7,66L62,75.2L6.3,75.2L43.4,11ZM50,54.6L54,61.5L46,61.5L50,54.6ZM6.3,79.8L65.9,79.8C66.7,79.8 67.5,79.4 67.9,78.7C68.3,78 68.3,77.1 67.9,76.4L52.7,50L58,40.8L85.8,89L11.6,89L6.3,79.8ZM89.8,86.7L59.9,35.1C59.5,34.4 58.7,34 57.9,34C57.1,34 56.3,34.4 55.9,35.1L40.7,61.5L30.1,61.5L58,13.3L95.1,77.6L89.8,86.7Z" fill="#f8fafc" fill-rule="nonzero"/>
    </g>
</svg>'''


def fetch_posts():
    """Fetch posts from Substack API, falling back to cache if offline."""
    req = urllib.request.Request(
        SUBSTACK_POSTS_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"}
    )
    try:
        print(f"Fetching posts from {SUBSTACK_POSTS_URL}...")
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            # Save cache
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            print("Successfully fetched live posts from Substack.")
            return data.get("posts", [])
    except Exception as e:
        print(f"Warning: Could not fetch from Substack API ({e}).")
        if os.path.exists(CACHE_FILE):
            print(f"Falling back to local cache: {CACHE_FILE}")
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("posts", [])
        else:
            print("Error: No cache file available.")
            return []


def format_date(date_str, long_format=False):
    """Format ISO date string to human-readable format."""
    if not date_str:
        return ""
    try:
        # Strip trailing Z and parse
        clean_date = date_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_date)
        if long_format:
            return dt.strftime("%B %d, %Y")
        return dt.strftime("%b %d, %Y")
    except Exception:
        return date_str[:10]


def sanitize_body_html(body_html):
    """Clean up Substack-specific interactive scripts or artifacts if needed."""
    if not body_html:
        return ""
    # Ensure image captions are well preserved and unnecessary button hover clutter is removed
    # The Substack CSS classes (captioned-image-container, image-caption, etc.) are handled by styles.css
    return body_html


def generate_index_html(posts):
    """Generate website/blog/index.html."""
    cards_html = []
    for post in posts:
        slug = post.get("slug", "")
        title = html.escape(post.get("title", "Untitled"))
        subtitle = html.escape(post.get("subtitle") or post.get("description") or "")
        date_formatted = format_date(post.get("post_date", ""))
        cover_image = post.get("cover_image")
        wordcount = post.get("wordcount", 0)
        read_time = max(1, round(wordcount / 200)) if wordcount else 3

        if cover_image:
            img_html = f'<img src="{html.escape(cover_image)}" alt="{title}" class="blog-card-img" loading="lazy">'
        else:
            img_html = f'<div class="blog-card-placeholder">{LOGO_SVG}</div>'

        card = f'''            <a href="{slug}.html" class="blog-card">
                <div class="blog-card-img-wrap">
                    {img_html}
                </div>
                <div class="blog-card-body">
                    <div class="blog-card-meta">
                        <span class="blog-tag">rolv</span>
                        <span>&bull;</span>
                        <span>{date_formatted}</span>
                        <span>&bull;</span>
                        <span>{read_time} min read</span>
                    </div>
                    <h2 class="blog-card-title">{title}</h2>
                    <p class="blog-card-desc">{subtitle}</p>
                    <div class="blog-card-footer">
                        <span>Read article</span>
                        <span>&rarr;</span>
                    </div>
                </div>
            </a>'''
        cards_html.append(card)

    cards_block = "\n".join(cards_html) if cards_html else "<p>No articles found yet.</p>"

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - rolv</title>
    <meta name="description" content="Articles, guides, and workflows for reproducible AI-assisted biomedical data science.">
    <meta property="og:title" content="rolv Blog - AI-assisted data analysis for science">
    <meta property="og:description" content="Articles, guides, and workflows for reproducible AI-assisted biomedical data science.">
    <meta property="og:type" content="website">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/x-icon" href="../favicon.ico">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="apple-touch-icon" href="../apple-touch-icon.png">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <div class="container">
        <!-- Navigation -->
        <nav>
            <a href="../index.html" class="logo" style="text-decoration: none;">
                {LOGO_SVG}
                rolv
            </a>
            <div class="nav-links">
                <a href="../index.html">Home</a>
                <a href="../docs/index.html">Docs</a>
                <a href="index.html" style="color: var(--accent);">Blog</a>
                <a href="../contact.html">Contact</a>
            </div>
        </nav>

        <!-- Blog Hero -->
        <header class="blog-hero">
            <h1>rolv Blog</h1>
            <p class="subtitle">Workflows, insights, and recipes for reproducible AI-assisted scientific data analysis.</p>
            <div class="blog-source-badge">
                <span>Published in partnership with</span>
                <a href="https://biodatahacks.substack.com/t/rolv" target="_blank" rel="noopener">&gt;_ Hacks &amp; Recipes</a>
            </div>
        </header>

        <!-- Articles Grid -->
        <main class="blog-grid">
{cards_block}
        </main>

        <!-- Footer -->
        <footer>
            <div class="footer-content" style="justify-content: center;">
                <div class="footer-links" style="gap: 4rem;">
                    <a href="../index.html" style="color: var(--text-secondary); font-size: 0.9rem;">Home</a>
                    <a href="../docs/index.html" style="color: var(--text-secondary); font-size: 0.9rem;">Docs</a>
                    <a href="index.html" style="color: var(--text-primary); font-size: 0.9rem;">Blog</a>
                    <a href="../contact.html" style="color: var(--text-secondary); font-size: 0.9rem;">Contact</a>
                </div>
            </div>
            <p style="text-align: center; margin-top: 2rem; font-size: 0.85rem; color: var(--text-secondary);">
                &copy; 2026 rolv
            </p>
        </footer>
    </div>
    {CLOUDFLARE_ANALYTICS}
</body>
</html>
'''


def generate_post_html(post):
    """Generate individual article website/blog/{slug}.html."""
    slug = post.get("slug", "")
    title = html.escape(post.get("title", "Untitled"))
    subtitle = html.escape(post.get("subtitle") or post.get("description") or "")
    date_formatted = format_date(post.get("post_date", ""), long_format=True)
    canonical_url = post.get("canonical_url") or f"https://biodatahacks.substack.com/p/{slug}"
    cover_image = post.get("cover_image")
    body_html = sanitize_body_html(post.get("body_html", ""))
    wordcount = post.get("wordcount", 0)
    read_time = max(1, round(wordcount / 200)) if wordcount else 3

    # Bylines
    bylines = post.get("publishedBylines", [])
    author_name = "Altuna Akalin"
    if bylines and isinstance(bylines, list):
        first_byline = bylines[0]
        if first_byline.get("name"):
            author_name = first_byline.get("name")

    cover_image_html = ""
    if cover_image:
        cover_image_html = f'''            <img src="{html.escape(cover_image)}" alt="{title}" class="post-featured-image">'''

    subtitle_html = ""
    if subtitle:
        subtitle_html = f'''            <p class="post-subtitle">{subtitle}</p>'''

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - rolv Blog</title>
    <meta name="description" content="{subtitle}">
    <link rel="canonical" href="{canonical_url}">
    
    <!-- Open Graph / Social Meta -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{subtitle}">
    <meta property="og:url" content="https://rolv.io/blog/{slug}.html">
    {f'<meta property="og:image" content="{html.escape(cover_image)}">' if cover_image else ''}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{subtitle}">
    {f'<meta name="twitter:image" content="{html.escape(cover_image)}">' if cover_image else ''}

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/x-icon" href="../favicon.ico">
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="apple-touch-icon" href="../apple-touch-icon.png">
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <div class="container">
        <!-- Navigation -->
        <nav>
            <a href="../index.html" class="logo" style="text-decoration: none;">
                {LOGO_SVG}
                rolv
            </a>
            <div class="nav-links">
                <a href="../index.html">Home</a>
                <a href="../docs/index.html">Docs</a>
                <a href="index.html" style="color: var(--accent);">Blog</a>
                <a href="../contact.html">Contact</a>
            </div>
        </nav>

        <article class="post-wrapper">
            <a href="index.html" class="post-back-link">
                &larr; Back to all articles
            </a>

            <header class="post-header">
                <h1>{title}</h1>
                {subtitle_html}
                <div class="post-byline-bar">
                    <span class="post-author-name">{html.escape(author_name)}</span>
                    <span class="byline-dot">&bull;</span>
                    <span class="post-date-read">{date_formatted}</span>
                    <span class="byline-dot">&bull;</span>
                    <span class="post-date-read">{read_time} min read</span>
                </div>
            </header>

{cover_image_html}

            <div class="post-content">
{body_html}
            </div>

            <div class="post-footer-box">
                <div class="post-footer-text">
                    <h4>Originally published on &gt;_ Hacks &amp; Recipes</h4>
                    <p>Read the discussion, leave comments, and join the conversation on Substack.</p>
                </div>
                <div class="post-footer-actions">
                    <a href="{canonical_url}" target="_blank" rel="noopener" class="btn btn-secondary" style="padding: 0.6rem 1.25rem; font-size: 0.9rem;">
                        View on Substack &nearr;
                    </a>
                    <a href="https://biodatahacks.substack.com/subscribe" target="_blank" rel="noopener" class="btn btn-primary" style="padding: 0.6rem 1.25rem; font-size: 0.9rem;">
                        Subscribe
                    </a>
                </div>
            </div>

            <div style="margin-top: 3rem; text-align: center;">
                <a href="index.html" class="post-back-link">
                    &larr; Back to all articles
                </a>
            </div>
        </article>

        <!-- Footer -->
        <footer>
            <div class="footer-content" style="justify-content: center;">
                <div class="footer-links" style="gap: 4rem;">
                    <a href="../index.html" style="color: var(--text-secondary); font-size: 0.9rem;">Home</a>
                    <a href="../docs/index.html" style="color: var(--text-secondary); font-size: 0.9rem;">Docs</a>
                    <a href="index.html" style="color: var(--text-primary); font-size: 0.9rem;">Blog</a>
                    <a href="../contact.html" style="color: var(--text-secondary); font-size: 0.9rem;">Contact</a>
                </div>
            </div>
            <p style="text-align: center; margin-top: 2rem; font-size: 0.85rem; color: var(--text-secondary);">
                &copy; 2026 rolv
            </p>
        </footer>
    </div>
    {CLOUDFLARE_ANALYTICS}
</body>
</html>
'''


def generate_blog_redirect():
    """Generate website/blog.html as a redirect to blog/index.html."""
    return '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=blog/index.html">
    <title>Redirecting to Blog...</title>
    <link rel="canonical" href="blog/index.html">
</head>
<body>
    <p>Redirecting to <a href="blog/index.html">rolv.io/blog</a>...</p>
</body>
</html>
'''


def main():
    os.makedirs(BLOG_DIR, exist_ok=True)
    raw_posts = fetch_posts()

    if not raw_posts:
        print("No posts found. Exiting.")
        return

    # Filter strictly for posts tagged with 'rolv'
    posts = [
        p for p in raw_posts
        if any(t.get("slug") == "rolv" or t.get("name", "").lower() == "rolv" for t in p.get("postTags", []))
    ]

    print(f"Filtered {len(posts)} posts tagged with 'rolv' (out of {len(raw_posts)} total posts).")

    # Clean up any previously generated post pages that are no longer tagged with 'rolv'
    valid_files = {f"{p.get('slug')}.html" for p in posts if p.get("slug")}
    for fname in os.listdir(BLOG_DIR):
        if fname.endswith(".html") and fname != "index.html":
            if fname not in valid_files:
                to_remove = os.path.join(BLOG_DIR, fname)
                os.remove(to_remove)
                print(f"Removed untagged article page: {fname}")

    # 1. Generate blog index
    index_html = generate_index_html(posts)
    index_path = os.path.join(BLOG_DIR, "index.html")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_html)
    print(f"Generated {index_path}")

    # 2. Generate each post page
    for post in posts:
        slug = post.get("slug")
        if not slug:
            continue
        post_html = generate_post_html(post)
        post_path = os.path.join(BLOG_DIR, f"{slug}.html")
        with open(post_path, "w", encoding="utf-8") as f:
            f.write(post_html)
        print(f"Generated post page: {slug}.html")

    # 3. Generate redirect blog.html in website root
    redirect_html = generate_blog_redirect()
    redirect_path = os.path.join(WEBSITE_DIR, "blog.html")
    with open(redirect_path, "w", encoding="utf-8") as f:
        f.write(redirect_html)
    print(f"Generated redirect {redirect_path}")

    print("Substack sync completed successfully!")


if __name__ == "__main__":
    main()
