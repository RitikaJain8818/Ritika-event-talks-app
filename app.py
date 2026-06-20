import urllib.request
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request
import time
import datetime

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = {
    "data": None,
    "last_fetched": 0,
    "expiry": 600  # 10 minutes in seconds
}

def parse_feed_to_updates():
    """Fetches and parses the BigQuery release notes RSS/Atom feed."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    }
    
    req = urllib.request.Request(FEED_URL, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response:
        feed_xml = response.read()
        
    feed = feedparser.parse(feed_xml)
    updates = []
    
    for entry in feed.entries:
        date_str = entry.get('title', 'Unknown Date')
        link = entry.get('link', 'https://cloud.google.com/bigquery/docs/release-notes')
        updated_date = entry.get('updated', '')
        
        # Parse the raw HTML content
        summary_html = entry.get('summary', '') or entry.get('description', '')
        if not summary_html and 'content' in entry and len(entry.content) > 0:
            summary_html = entry.content[0].get('value', '')
            
        soup = BeautifulSoup(summary_html, 'html.parser')
        
        # BigQuery release notes use <h3> elements for categories (e.g. Feature, Change, Deprecation)
        h3s = soup.find_all('h3')
        if not h3s:
            # If no h3s are found, wrap the whole entry as a generic "Update"
            text_content = soup.get_text().strip()
            updates.append({
                'id': entry.get('id', link),
                'date': date_str,
                'category': 'Update',
                'content': str(soup),
                'text': text_content,
                'link': link,
                'updated': updated_date
            })
        else:
            # Parse sections between h3 elements
            for i, h3 in enumerate(h3s):
                category = h3.get_text().strip()
                content_parts = []
                
                # Gather all sibling nodes until the next h3
                next_node = h3.next_sibling
                while next_node and next_node.name != 'h3':
                    if next_node.name:
                        content_parts.append(str(next_node))
                    next_node = next_node.next_sibling
                
                content_html = "".join(content_parts).strip()
                part_soup = BeautifulSoup(content_html, 'html.parser')
                text_content = part_soup.get_text().strip()
                
                # Generate a unique ID for this specific sub-update
                update_id = f"{entry.get('id', link)}-sub-{i}"
                
                updates.append({
                    'id': update_id,
                    'date': date_str,
                    'category': category,
                    'content': content_html,
                    'text': text_content,
                    'link': link,
                    'updated': updated_date
                })
                
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Return from cache if valid and not forced refresh
    if cache["data"] and not force_refresh and (current_time - cache["last_fetched"] < cache["expiry"]):
        return jsonify({
            "updates": cache["data"],
            "last_fetched": datetime.datetime.fromtimestamp(cache["last_fetched"]).isoformat(),
            "source": "cache"
        })
        
    try:
        data = parse_feed_to_updates()
        cache["data"] = data
        cache["last_fetched"] = current_time
        return jsonify({
            "updates": data,
            "last_fetched": datetime.datetime.fromtimestamp(current_time).isoformat(),
            "source": "live"
        })
    except Exception as e:
        # Fallback to expired cache if feed fetch fails
        if cache["data"]:
            return jsonify({
                "updates": cache["data"],
                "last_fetched": datetime.datetime.fromtimestamp(cache["last_fetched"]).isoformat(),
                "source": "cache_fallback",
                "error": str(e)
            })
        return jsonify({
            "error": f"Failed to fetch feed: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
