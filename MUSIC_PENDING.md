# Music: Spotify data download

**Imported 2026-11-21** (history 2021-06-10 to 2026-11-19): data/music_history.json, totals only (no IP/country/device).
Done: total hours (Overview Music box, Music banner), Time spent row, plays/hours on song rows, artist and song pages,
Listening stats page (years, months, hour of day, weekdays, year-by-year tops, all-time tops), Hall of Fame 'Since 2021' option,
Wrapped music section per year, nightly plays after the download are added on top. To re-import a newer download:
`python3 tools/import_spotify.py "<unzipped folder>" data/music_history.json data/settings.json`.

## Original checklist

Spotify's "Extended streaming history" (requested 2026-11-20) gives every play with exact listening time.
When the email arrives, download the zip and send it over. Then:

1. **Total hours listened**: add to the Music box on the Overview and to the Music page banner
   (today the box shows songs, artists and the length of the playlists, not time listened).
2. **Minutes per song / per artist**: show "listened X h" on song rows, artist pages and the Top lists.
3. **Time spent box on the Overview**: add a Music row next to Anime, Manga, Films, Games, Books.
4. **Play counts**: "played N times" on songs; most-played songs and artists of all time (real counts,
   not Spotify's ranking).
5. **Recently played / history**: fill the play log back to the first day (Spotify's live connection only gives the last 50).
6. **Taste stats**: listening by year, month, hour of day; top artists per year ("music this year" wrap);
   Wrapped page music section.
7. **Last.fm** keeps counting from 2026-11-20 on; merge its plays after the download's last date so totals stay current.

Also still to do (not waiting on the download):
- Genres: Spotify no longer gives them to new apps; use Last.fm artist tags.
- Anime and game soundtrack links (openings/endings on anime pages, OSTs on game pages, "from <anime>" on songs).
- Artist pictures for the rest of the ~1,000 artists are being fetched 80 per night.
