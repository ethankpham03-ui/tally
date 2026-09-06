# Tally font assets

The WOFF2 files in `public/fonts/` were converted from the font files supplied by the user. Original font names, metadata, and designs are preserved. PF Beau Sans retains every source glyph, including Latin, Vietnamese, Greek, Cyrillic, and OpenType alternates; CookieRun retains Latin, Vietnamese, and UI symbols to avoid shipping unused CJK glyphs.

| Web asset | Original file | Weight / style |
| --- | --- | --- |
| `cookie-run-regular.woff2` | `CookieRun VH/CookieRun VH/SRN CookieRun Regular.otf` | 400 normal |
| `cookie-run-bold.woff2` | `CookieRun VH/CookieRun VH/SRN CookieRun Bold.otf` | 700 normal |
| `pf-beau-sans-regular.woff2` | `PF BEAU SANS FONT FAMILY VH/PF BEAU SANS FONT FAMILY VH/FS PFBeauSansPro-Regular.otf` | 400 normal |
| `pf-beau-sans-book.woff2` | `PF BEAU SANS FONT FAMILY VH/PF BEAU SANS FONT FAMILY VH/FS PFBeauSansPro-Bbook.otf` | 500 normal |
| `pf-beau-sans-semibold.woff2` | `PF BEAU SANS FONT FAMILY VH/PF BEAU SANS FONT FAMILY VH/FS PFBeauSansPro-SemiBold.otf` | 600 normal |
| `pf-beau-sans-bold.woff2` | `PF BEAU SANS FONT FAMILY VH/PF BEAU SANS FONT FAMILY VH/FS PFBeauSansPro-Bold.otf` | 700 normal |
| `pf-beau-sans-book-italic.woff2` | `PF BEAU SANS FONT FAMILY VH/PF BEAU SANS FONT FAMILY VH/FS PFBeauSansPro-BbookItalic.otf` | 500 italic |

Source folders are under the user's Downloads directory. The internal families are `SRN CookieRun` and `FS PF BeauSans Pro`. CookieRun's embedded metadata credits Devsisters (2019). PF Beau Sans credits Parachute, designer Panos Vassiliou, and Vietnamese adaptation by PhongChuViet. Original rights and licensing metadata are retained; this conversion does not add a license grant.

Each PF Beau Sans face retains all 1,285 glyphs and 1,284 Unicode mappings. The five files total 481,488 bytes. Conversion was verified against every source cmap subtable, glyph outline, advance width, side bearing, name record, timestamp, and complete GSUB/GPOS/OS2/hhea table. The source `Bbook` cut is an actual weight 500 face, and its italic is an actual weight 500 italic; no weight metadata was relabeled.

CookieRun was subset to source glyphs in `U+0000-024F, U+0300-036F, U+1E00-1EFF, U+2000-206F, U+2070-209F, U+20A0-20CF, U+2100-214F, U+2190-21FF, U+2200-22FF, U+25A0-25FF, U+FEFF, U+FFFD`. The resulting files contain 537 glyphs per face (31,692 bytes regular; 31,312 bytes bold). Every retained glyph outline, advance width, side bearing, and Unicode mapping was checked against the source.

All seven faces cover precomposed Vietnamese letters and digits. Prefer NFC text: both families omit standalone combining grave (U+0300), acute (U+0301), tilde (U+0303), circumflex (U+0302), breve (U+0306), and horn (U+031B).

PF Beau Sans has tabular digits by default and retains the OpenType `tnum`, `pnum`, `lnum`, `onum`, and related numeric features. Per-digit advance widths at 1,000 units per em are 590 for regular, 595 for book, 617 for semibold, 653 for bold, and 577 for book italic. CookieRun uses proportional digits and has no `tnum` feature.
