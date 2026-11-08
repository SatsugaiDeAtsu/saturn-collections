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

To run it right away: **Actions → Daily update → Run workflow**.


## Files

- `index.html`: the whole site
- `data/site.json`: all data (generated, don't edit by hand)
- `data/hof.json`: Hall of Fame (MAL favourites and blog sections), edit freely
- `data/settings.json`: settings for the updater
- `scripts/update.py`: the updater
