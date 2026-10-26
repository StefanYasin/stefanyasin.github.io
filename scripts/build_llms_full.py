"""Build llms-full.txt: full text of the writing, case studies, now and uses pages,
flattened to markdown so language models can read everything in one request.

Usage: python scripts/build_llms_full.py [site_root]
"""
import glob
import html
import os
import re
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
BASE = "https://stefanyasin.github.io/"

ORDER = (
    [os.path.join(ROOT, "index.html")]
    + sorted(glob.glob(os.path.join(ROOT, "blog", "posts", "*.html")))
    + sorted(glob.glob(os.path.join(ROOT, "case-studies", "*.html")))
    + [os.path.join(ROOT, n) for n in ("now.html", "uses.html")]
)


def strip_tags(fragment):
    fragment = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", fragment, flags=re.S | re.I)
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"</(p|div|li|h[1-6]|tr|blockquote)>", "\n\n", fragment, flags=re.I)
    fragment = re.sub(r"<li[^>]*>", "- ", fragment, flags=re.I)
    fragment = re.sub(r"<h([1-6])[^>]*>", lambda m: "\n" + "#" * (int(m.group(1)) + 1) + " ", fragment, flags=re.I)
    fragment = re.sub(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                      lambda m: "%s (%s)" % (re.sub(r"<[^>]+>", "", m.group(2)).strip(), m.group(1)),
                      fragment, flags=re.S | re.I)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    fragment = html.unescape(fragment)
    fragment = re.sub(r"[ \t]+", " ", fragment)
    fragment = re.sub(r"\n{3,}", "\n\n", fragment)
    return fragment.strip()


def page_title(text):
    m = re.search(r"<title>(.*?)</title>", text, re.S)
    t = html.unescape(m.group(1)).strip() if m else ""
    return t.split(" - Stefan Yasin")[0].strip()


def main():
    out = ["# Stefan Yasin: full text", "",
           "Everything published on https://stefanyasin.github.io, flattened to markdown for machine readers.",
           "Canonical index: https://stefanyasin.github.io/llms.txt", ""]
    count = 0
    for path in ORDER:
        if not os.path.exists(path):
            continue
        raw = open(path, encoding="utf-8").read()
        body = re.search(r"<main[^>]*>(.*?)</main>", raw, re.S)
        if not body:
            trimmed = re.sub(r"<(header|nav|footer|script|style)[^>]*>.*?</\1>", "", raw, flags=re.S | re.I)
            body = re.search(r"<body[^>]*>(.*)</body>", trimmed, re.S)
            if not body:
                continue
        text = strip_tags(body.group(1))
        if len(text) < 400:
            continue
        rel = os.path.relpath(path, ROOT).replace("\\", "/")
        out += ["", "---", "", "## %s" % page_title(raw), "",
                "URL: %s" % (BASE + rel)]
        m = re.search(r'"datePublished"\s*:\s*"([^"]+)"', raw)
        if m:
            out.append("Published: %s" % m.group(1))
        out += ["", text, ""]
        count += 1
    dest = os.path.join(ROOT, "llms-full.txt")
    with open(dest, "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(out).rstrip() + "\n")
    print("llms-full.txt: %d documents, %.0f KB" % (count, os.path.getsize(dest) / 1024))


if __name__ == "__main__":
    main()
