# Saturn Collections

My anime, manga, films, games, books and stories in one place.

## How it updates

A GitHub Action runs `scripts/update.py` every day at 02:17 (Pakistan time) and refreshes `data/site.json`:

| Source | How |
| --- | --- |
| MyAnimeList (anime, manga, my tags) | automatic |
| Letterboxd (recent watches, ratings, posters) | automatic (RSS) |
| Medium stories | automatic (RSS) |
| Film posters | automatic (TMDB) |
| Games and books | edited on the site itself, stored in `data/games.json` and `data/books.json` |
| Music (Spotify, Last.fm) | automatic, through the Cloudflare helper in `worker/` |
| Anime and manga edits made on the site | sent to MyAnimeList every hour by `scripts/mal_sync.py` (MAL Sync action) |

To run it right away: **Actions → Daily update → Run workflow**.


## Files

- `index.html`: the page itself (header, menu, footer)
- `assets/app.js`: everything the site does; `assets/app.css`: how it looks.
  After changing either, run `python3 tools/build.py` so visitors get the new version straight away.
- `sw.js`: keeps a copy of the site on the phone so it opens fast and works with a weak connection
- `data/site.json`: all data (generated, don't edit by hand)
- `data/hof.json`: Hall of Fame (MAL favourites and blog sections), edit freely
- `data/settings.json`: settings for the updater
- `scripts/update.py`: the updater (one section per source: anime and manga, Hall of Fame, films, games, books, writing, music)
- `scripts/mal_sync.py`: sends edits to MyAnimeList
- `tools/import_spotify.py`: reads a Spotify data download into `data/music_history.json` (totals only)
- `worker/saturn-mal.js`: the Cloudflare helper for MyAnimeList, Spotify and Last.fm
