# Saturn Collections

My anime, manga, films, games, books and stories in one place.

## How it updates

A GitHub Action runs `scripts/update.py` every day at 02:17 (Pakistan time) and refreshes `data/site.json`:

| Source | How |
| --- | --- |
| MyAnimeList (anime, manga, my tags) | automatic |
| Letterboxd (recent watches, ratings, posters) | automatic (RSS) |
| Medium stories | automatic (RSS) |
| Goodreads | automatic (RSS, needs a public profile) |
| Grouvee | manual: upload a new export as `data/imports/grouvee_export.json` |

To run it right away: **Actions → Daily update → Run workflow**.

Uploading a file into `data/imports/` also triggers an update.

## Files

- `index.html`: the whole site
- `data/site.json`: all data (generated, don't edit by hand)
- `data/hof.json`: Hall of Fame (MAL favourites and blog sections), edit freely
- `data/settings.json`: settings for the updater
- `scripts/update.py`: the updater
