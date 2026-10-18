#!/usr/bin/env python3
# ticker-sweep.py — the ticker keeper's hands (function:ticker 6): read the open feeds, give each report the second
# it was first recorded on the sundial, and print what is new since the last sweep. It writes nothing; the keeper
# reads the output, merges reports of one event, writes each line in its own words, and says it on the beach.
#
#   python3 -I ticker-sweep.py [SINCE]
#
# SINCE is the address of the newest line on the tape's day list (2026413476.854), or an ISO instant. The helper
# reads from an hour before it, because a report can reach its feed late and an earthquake can turn significant
# hours after it struck, so the keeper skips what already stands on the list. Without SINCE: the last three hours.
#
# Prints JSON lines. First {"seen": [nine addresses]}: the second this sweep ran and the eight after it, for the
# reports the keeper first saw here (a Wikipedia line), each later one taking the next (function:ticker 1). Then,
# oldest first, {"address", "when", "source", "title", "link", "summary"} for each report on a feed (GDACS orange
# and red alerts only), then {"context": "wikipedia", "day", "category", "depth", "text"} for each line of the
# Wikipedia Current events portal for every day the sweep covers, which carries no times and is read as the day's
# context. A source that fails prints {"error": source, "why"} and the rest carry on.
#
# The keeper's routine (the scheduled task 'Weft · ticker') carries a copy of this file: change both together.
import json, re, sys, time, urllib.error, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

UA = 'happyseaurchin-ticker/0.1 (https://happyseaurchin.com)'
FEEDS = [
    ('BBC News', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
    ('NPR', 'https://feeds.npr.org/1001/rss.xml'),
    ('DW', 'https://rss.dw.com/rdf/rss-en-all'),
    ('Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml'),
    ('Global Voices', 'https://globalvoices.org/feed/'),
    ('The Conversation', 'https://theconversation.com/global/articles.atom'),
    ('GDACS', 'https://www.gdacs.org/xml/rss.xml'),
]
USGS = ('USGS', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson')
SPANS = (62985600000, 6998400000, 777600000, 86400000, 9600000)  # the day's five rungs, in ms x 6561


def address(t):
    """The sundial address of an instant, to the second: the site's api/news.js itemAddress, re-ported."""
    t = t.astimezone(timezone.utc)
    y, mo, d = t.year, t.month - 1, t.day
    rem = ((t.hour * 3600 + t.minute * 60 + t.second) * 1000 + t.microsecond // 1000) * 6561
    out = []
    for span in SPANS:
        k = min(8, rem // span)
        out.append(k + 1)
        rem -= k * span
    return (f"{y // 1000 % 10}{y // 100 % 10}{y // 10 % 10}{y % 10}{mo // 3 + 1}{mo % 3 + 1}"
            f"{(d - 1) // 7 + 1}{(d - 1) % 7 + 1}{out[0]}{out[1]}.{out[2]}{out[3]}{out[4]}")


def instant(addr):
    """The instant an address's second begins, the inverse of address(); a shorter address gives its first second."""
    d = addr.replace('.', '')
    rem = sum((max(int(c), 1) - 1) * s for c, s in zip(d[8:13].ljust(5, '1'), SPANS))
    day = datetime(int(d[:4]), (int(d[4]) - 1) * 3 + int(d[5]), (int(d[6]) - 1) * 7 + int(d[7]), tzinfo=timezone.utc)
    return day + timedelta(milliseconds=-(-rem // 6561))


def seen(now):
    """The second the sweep ran and the eight after it, each its own second (a ticker second is 1.46 s)."""
    day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    cell = (now - day) // timedelta(milliseconds=1) * 6561 // SPANS[-1]
    return [address(day + timedelta(milliseconds=-(-(cell + i) * SPANS[-1] // 6561))) for i in range(9)]


def get(url, tries=1):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read()
        except urllib.error.HTTPError as e:  # Wikipedia turns a shared address away now and then: wait, ask again
            if e.code != 429 or attempt == tries - 1:
                raise
            time.sleep(10)


def when_of(s):
    s = (s or '').strip()
    if not s:
        return None
    try:
        t = parsedate_to_datetime(s)
    except Exception:
        try:
            t = datetime.fromisoformat(s.replace('Z', '+00:00'))
        except Exception:
            return None
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    return re.sub(r'\s+', ' ', s).strip()


def local(el):
    return el.tag.split('}')[-1]


def child(el, *names):
    for c in el:
        if local(c) in names:
            return c
    return None


def feed_items(source, raw):
    out = []
    for it in ET.fromstring(raw).iter():
        if local(it) not in ('item', 'entry'):
            continue
        t, l = child(it, 'title'), child(it, 'link')
        d = child(it, 'pubDate', 'published', 'date', 'updated')
        s = child(it, 'description', 'summary')
        title = clean(t.text if t is not None else '')
        link = ((l.get('href') or l.text or '').strip()) if l is not None else ''
        when = when_of(d.text if d is not None else '')
        if source == 'GDACS' and title.startswith('Green'):
            continue
        if title and link and when:
            out.append({'source': source, 'title': title, 'link': link, 'when': when,
                        'summary': clean(s.text if s is not None else '')[:300]})
    return out


def usgs_items(raw):
    out = []
    for f in json.loads(raw).get('features', []):
        p = f.get('properties', {})
        if p.get('title') and p.get('url') and p.get('time'):
            when = datetime.fromtimestamp(p['time'] / 1000, tz=timezone.utc)
            out.append({'source': USGS[0], 'title': p['title'], 'link': p['url'], 'when': when, 'summary': ''})
    return out


def wiki_markup(s):
    s = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>', '', s)
    s = re.sub(r'\{\{[^{}]*\}\}', '', s)
    s = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', s)
    s = re.sub(r'\[https?://\S+\s+([^\]]+)\]', r'\1', s)
    s = re.sub(r'\[https?://\S+\]', '', s)
    return clean(s.replace("'''", '').replace("''", ''))


def wikipedia_context(day):
    page = 'Portal:Current_events/' + day.strftime('%Y_%B_') + str(day.day)
    text = get('https://en.wikipedia.org/w/index.php?action=raw&title=' + urllib.request.quote(page), 3).decode('utf-8')
    out, category = [], ''
    for line in text.splitlines():
        head = re.match(r"^'''(.+?)'''\s*$", line.strip())
        if head:
            category = wiki_markup(head.group(1))
            continue
        bullet = re.match(r'^(\*+)\s*(.+)$', line)
        if bullet and category:
            words = wiki_markup(bullet.group(2))
            if words:
                out.append({'context': 'wikipedia', 'day': day.date().isoformat(), 'category': category,
                            'depth': len(bullet.group(1)), 'text': words})
    return out


def main():
    now = datetime.now(timezone.utc)
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    mark = instant(arg) if re.fullmatch(r'\d{8,10}(\.\d{1,3})?', arg) else when_of(arg)
    if arg and mark is None:
        sys.exit('SINCE is neither a sundial address nor an ISO instant: ' + arg)
    since = mark - timedelta(hours=1) if mark else now - timedelta(hours=3)
    print(json.dumps({'seen': seen(now)}))
    reports, links = [], set()
    for source, url in FEEDS + [USGS]:
        try:
            raw = get(url)
            found = usgs_items(raw) if source == 'USGS' else feed_items(source, raw)
        except Exception as e:
            print(json.dumps({'error': source, 'why': str(e)[:120]}))
            continue
        for r in found:
            if r['when'] > since and r['link'] not in links:
                links.add(r['link'])
                reports.append(r)
    for r in sorted(reports, key=lambda r: r['when']):
        print(json.dumps({'address': address(r['when']), 'when': r['when'].astimezone(timezone.utc).isoformat(),
                          'source': r['source'], 'title': r['title'], 'link': r['link'], 'summary': r['summary']},
                         ensure_ascii=False))
    day = since.astimezone(timezone.utc)
    while day.date() <= now.date():
        try:
            for c in wikipedia_context(day):
                print(json.dumps(c, ensure_ascii=False))
        except Exception as e:
            print(json.dumps({'error': 'Wikipedia ' + day.date().isoformat(), 'why': str(e)[:120]}))
        day += timedelta(days=1)


if __name__ == '__main__':
    main()
