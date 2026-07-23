# Green → Orange Color Audit

All occurrences of green (`#1D9E75`, `#0F6E56`, `#28B88A`, `#E1F5EE`, `#E6FFF4`, `#c7eedf`, `#053f31`, `#043D28`, `#9FE1CB`, `rgba(29,158,117,...)`, `rgba(15,110,86,...)`) found across the app.

| Key | Replacement |
|-----|-------------|
| `#1D9E75` (primary green) | `#FF6A00` (primary orange) |
| `#0F6E56` (dark green) | `#FF8C3A` (light orange) |
| `#28B88A` (mid green) | `#FF6A00` |
| `#E1F5EE` (light green bg) | `#FFF3EB` (light orange bg) |
| `#E6FFF4` (very light green) | `#FFF3EB` |
| `#9FE1CB` (green border light) | `rgba(255,106,0,0.3)` |
| `#c7eedf` (selection green) | `rgba(255,106,0,0.2)` |
| `#053f31` (deepest green) | `#7A2E00` |
| `#043D28` (very deep green) | `#7A2E00` |
| `rgba(29,158,117,*)` | `rgba(255,106,0,*)` |
| `rgba(15,110,86,*)` | `rgba(255,106,0,*)` |
| `#085041` (dark teal text) | `#7A2E00` |
| `#0F4B3E` (club dark header) | `#CC5500` |
| `#EBF3EC` (very light green bg) | `#FFF3EB` |
| `#F4FBF8` (photos light bg) | `#FFF7F0` |
| `#F0FAF5` (profile light bg) | `#FFF7F0` |
| `#E8FFF8` (club light panel) | `#FFF7ED` |
| `#C9F5E7` (club light panel 2) | `#FFDBB5` |
| `#081510` (photos dark hero) | `#1A0A00` |
| `#0A2C1A` (photos hero mid) | `#331400` |
| `#1fcea8` (home badge text) | `#FF8C3A` |

---

## By File

### 1. `src/TravelBae.jsx` (app shell, top bar, auth, tabs, spinners)

| Line | Current | What |
|------|---------|------|
| 43 | `'#1D9E75'` in MCOLORS | Member avatar color array |
| 47 | `'#E1F5EE'` | Transport category bg |
| 55 | `'#E1F5EE','#0F6E56'` | Driver contact bg & color |
| 178 | `'#0F6E56','#E1F5EE','#9FE1CB'` | tripStatusInfo (upcoming status) |
| 230 | `'#0F6E56','#E6FFF4','rgba(29,158,117,0.32)'` | navTabActive style |
| 234 | `'#28B88A','#0F6E56','rgba(15,110,86,0.68)','rgba(15,110,86,0.24)'` | btnP style |
| 241 | `'#E1F5EE','#1D9E75'` | spinner style |
| 672 | `'#E1F5EE','#1D9E75'` | auth loading spinner |
| 898 | `rgba(29,158,117,0.13)` | background radial blob |
| 958 | `'#c7eedf','#053f31'` | ::selection |
| 959 | `'#E1F5EE','#1D9E75'` | input[type=range] |
| 961 | `'#1D9E75',rgba(29,158,117,0.14)` | input:focus |
| 989,993,997,1023 | `'#1D9E75'` | background SVG arcs & planes |
| 1055 | `'#1D9E75','#0F6E56'` | Profile avatar green gradient |
| 1165 | `'#0F6E56'` | Group tab active color |

### 2. `src/api.js`

| Line | Current | What |
|------|---------|------|
| — | No green colors | ✅ Clean |

### 3. `src/index.css`

| Line | Current | What |
|------|---------|------|
| 259,261 | `rgba(29,158,117,0.28),'#0F6E56'` | `.tb-shared-flight` |
| 346-348 | `rgba(15,110,86,0.40),rgba(15,110,86,0.55)` | `@keyframes tbFabPulse` |

### 4. `src/features/shared/constants.js`

| Line | Current | What |
|------|---------|------|
| 1 | `'#1D9E75','#0F6E56'` | MCOLORS array |
| 5 | `'#E1F5EE'` | Transport category bg |
| 14 | `'#E1F5EE','#0F6E56'` | Driver contact bg & color |
| 63 | `'#0F6E56','#E1F5EE','#9FE1CB'` | tripStatusInfo |

### 5. `src/features/shared/styles.js`

| Line | Current | What |
|------|---------|------|
| 13 | `'#28B88A','#0F6E56',rgba(15,110,86,*)` | btnP style |
| 20 | `'#E1F5EE','#1D9E75'` | spinner |

### 6. `src/features/shared/ui.jsx`

| Line | Current | What |
|------|---------|------|
| 73 | `'#0F6E56'` | Checkmark icon stroke |

### 7. `src/features/home/HomePage.jsx`

| Line | Current | What |
|------|---------|------|
| 181 | `rgba(29,158,117,0.42)` | Trip card hero glow |
| 186 | `rgba(29,158,117,0.28)'#1fcea8'` | Status badge (ongoing) |
| 188 | `rgba(29,158,117,0.22)'#86EFC9'` | Status badge (upcoming) |
| 327 | `'#0F6E56'` | Join trip button text |
| 741 | `'#043D28'` | Greeting profile name color |
| 756 | `'#043D28'` | Home hero title |
| 767 | `'#043D28'` | Hero chevron arrow |

### 8. `src/features/home/CreateTripWizard.jsx`

| Line | Current | What |
|------|---------|------|
| 35 | `'#0F6E56'` | Info icon stroke |

### 9. `src/features/split/SplitPage.jsx`

| Line | Current | What |
|------|---------|------|
| 96 | `'#1D9E75','#0F6E56'` | MCOLORS_LIST |
| 110 | `'#0F6E56'` | CAT_COLORS.transport |
| 1030 | `rgba(29,158,117,0.22)` | Card border |
| 1038 | `'#1D9E75'` | Total amount display |
| 1045 | `'#0F6E56'` | Member owed icon |

### 10. `src/features/club/ClubPage.jsx` (28 occurrences)

| Line | Current | What |
|------|---------|------|
| 334 | `'#1D9E75',rgba(29,158,117,0.35)` | Club vibe color |
| 1304 | `rgba(15,110,86,0.05)` | Background pattern |
| 1669 | `'#1D9E75','#0F6E56',rgba(29,158,117,0.28)` | My avatar in chat |
| 1680 | `'#1D9E75',rgba(29,158,117,0.2)` | Unread indicator |
| 1698 | `'#1D9E75','#0F6E56'` | Trip avatar |
| 1734 | `'#1D9E75','#0F6E56',rgba(29,158,117,0.28)` | My chat bubble |
| 1762 | `'#1D9E75','#0F6E56',rgba(29,158,117,0.3)` | Send button |
| 1772 | `'#0F4B3E','#1D9E75'` | Club panel header |
| 1788 | `rgba(15,110,86,0.1)` | Club info card shadow |
| 1789 | `'#1D9E75','#0F6E56',rgba(15,110,86,0.32)` | Club info icon |
| 1834 | `'#0F6E56'` | Total spent label |
| 1854 | `'#0F6E56'` | Split member badge |
| 1871 | `'#1D9E75'` | Split section tab |
| 1960 | `'#0F6E56'` | Net positive balance |
| 1970 | `'#E1F5EE','#9FE1CB','#085041'` | Everyone settled msg |
| 1979 | `'#0F6E56'` | Settlement amount |
| 1996,1998 | `'#1D9E75','#0F6E56'` | Balance card |
| 2013 | `'#1D9E75','#0F6E56',rgba(15,110,86,0.45)` | FAB button |
| 2028 | `'#0F6E56','#1D9E75'` | Expense form header |
| 2064 | `'#E1F5EE','#0F6E56','#9FE1CB'` | Split member pill |
| 2112 | `'#0F6E56'` | Photo upload progress |
| 2154 | `'#1D9E75','#0F6E56'` | Club tab button |
| 2156 | `rgba(15,110,86,0.68)` | Active tab border |
| 2269 | `rgba(29,158,117,0.35),rgba(29,158,117,0.1)` | Live toggle |
| 2271 | `'#1D9E75'` | Toggle switch bg |
| 2274 | `'#0F6E56'` | "Live" label text |
| 2357,2358 | `'#0F6E56'` | Radius filter labels |
| 2483 | `'#1D9E75','#0F6E56',rgba(29,158,117,0.32)` | Send request button |
| 2489 | `'#1D9E75','#0F6E56',rgba(29,158,117,0.32)` | Already sent disabled btn |

### 11. `src/features/solo/SoloExpensesPage.jsx`

| Line | Current | What |
|------|---------|------|
| 273 | `'#0F6E56'` | CAT_COLORS.transport |
| 341 | `'#1D9E75'` | BAR_COLORS.transport |

### 12. `src/features/photos/PhotosPage.jsx`

| Line | Current | What |
|------|---------|------|
| 16 | `'#1D9E75','#0F6E56'` | Theme constants |
| 20 | `'#1D9E75','#0F6E56'` | MCOLORS array |

### 13. `src/features/photos/photos.css`

| Line | Current | What |
|------|---------|------|
| 7 | `rgba(15,110,86,0.22),rgba(29,158,117,0.42)` | `@keyframes phHeroGlow` |
| 15-16 | `rgba(29,158,117,*)` | `@keyframes phFabPulse` |
| 29 | `'#081510','#0A2C1A','#0F6E56'` | Photos hero gradient |
| 113 | `'#1D9E75'` | Photo cell border |
| 125 | `'#1D9E75'` | Photo count badge |
| 131 | `'#0F6E56'` | Photos tab active label |
| 152 | `'#1D9E75','#F4FBF8'` | Album selector active |
| 160 | `'#1D9E75','#0F6E56'` | Upload button gradient |
| 162 | `rgba(29,158,117,0.28)` | Upload button shadow |
| 177 | `rgba(29,158,117,0.18),'#1D9E75'` | Photo upload spinner |
| 178 | `'#1D9E75'` | Upload progress text |
| 205 | `'#1D9E75'` | Selected photo cell border |
| 214 | `'#1D9E75'` | Selected photo checkmark |
| 257 | `'#1D9E75','#0F6E56'` | Delete button gradient |
| 261 | `rgba(29,158,117,0.3)` | Delete button shadow |

### 14. `src/features/profile/ProfilePage.jsx`

| Line | Current | What |
|------|---------|------|
| 1296 | `'#E1F5EE','#F0FAF5','#9FE1CB'` | Currency info card |
| 1297 | `'#9FE1CB','#0F6E56'` | Currency icon bg |
| 1299,1300 | `'#0F6E56'` | Currency labels |
| 1320 | `'#1D9E75'` | Currency selector active |
| 1327 | `'#1D9E75'` | Currency selector checkmark |

### 15. `src/features/profile/UserProfileWizard.jsx`

| Line | Current | What |
|------|---------|------|
| 442 | `'#0F6E56'` | Photo uploaded success text |

### 16. `src/features/itinerary/ItineraryPage.jsx`

| Line | Current | What |
|------|---------|------|
| 431,919 | `'#1D9E75'` | accentColor (group trips) |
| 554 | `'#0F6E56'` | Best time badge |
| 920 | `'#1D9E75','#0F6E56'` | headerBg (group trips) |

### 17. `src/features/trips/TripActionMenu.jsx`

| Line | Current | What |
|------|---------|------|
| 97 | `'#1D9E75'` | Emoji selector active border |
| 98 | `'#E1F5EE'` | Emoji selector active bg |
| 160 | `'#0F6E56'` | Menu item text |

---

## Summary

| File | Occurrences |
|------|-------------|
| `src/TravelBae.jsx` | 21 |
| `src/index.css` | 5 |
| `src/features/shared/constants.js` | 6 |
| `src/features/shared/styles.js` | 4 |
| `src/features/shared/ui.jsx` | 1 |
| `src/features/home/HomePage.jsx` | 7 |
| `src/features/home/CreateTripWizard.jsx` | 1 |
| `src/features/split/SplitPage.jsx` | 5 |
| `src/features/club/ClubPage.jsx` | 28 |
| `src/features/solo/SoloExpensesPage.jsx` | 2 |
| `src/features/photos/PhotosPage.jsx` | 2 |
| `src/features/photos/photos.css` | 15 |
| `src/features/profile/ProfilePage.jsx` | 6 |
| `src/features/profile/UserProfileWizard.jsx` | 1 |
| `src/features/itinerary/ItineraryPage.jsx` | 4 |
| `src/features/trips/TripActionMenu.jsx` | 3 |
| **Total** | **~110+ occurrences across 16 files** |

---

## Replacement Map (same-value grouped)

```
#1D9E75         → #FF6A00     (primary green → primary orange)
#0F6E56         → #FF8C3A     (dark green → light orange)
#28B88A         → #FF6A00     (mid gradient green → orange)
#E1F5EE         → #FFF3EB     (light green bg → light orange bg)
#E6FFF4         → #FFF3EB     (very light green → light orange bg)
#9FE1CB         → rgba(255,106,0,0.3)  (green border → orange border)
#c7eedf         → rgba(255,106,0,0.2)  (selection → orange selection)
#053f31         → #7A2E00     (deepest green → darkest orange)
#043D28         → #7A2E00     (very deep green → darkest orange)
#EBF3EC         → #FFF3EB     (extra light green bg)
#F4FBF8         → #FFF7F0     (photos light bg)
#F0FAF5         → #FFF7F0     (profile light bg)
#E8FFF8         → #FFF7ED     (club light panel)
#C9F5E7         → #FFDBB5     (club light panel 2)
#1fcea8         → #FF8C3A     (home badge text)
#86EFC9         → #FFB87A     (upcoming badge text)
#085041         → #7A2E00     (dark teal text)
#0F4B3E         → #CC5500     (club dark header)
#081510         → #1A0A00     (photos dark hero)
#0A2C1A         → #331400     (photos hero mid)
rgba(29,158,117,*) → rgba(255,106,0,*)  (green opacity → orange opacity)
rgba(15,110,86,*)  → rgba(255,106,0,*)  (green opacity → orange opacity)