# Image library (60 photos)

The AI picks photos only from this list, through the `findImages` tool: it describes the photo it needs, and Lakebase Search (Step 4) finds the best matches by the alt text below, with the tag as an optional filter. The first build uses it for work thumbnails, the intro photo and galleries; Prettify (Step 5) uses it to fill any image slot a hand-built section left empty. People can also pick from it themselves in the image picker (Step 10). Library photos are free; only uploads count toward storage.

Everyone building the app uses the same 60 photos, all free under the Unsplash License (none is Unsplash+). They're stand-ins: the AI tells people to swap in their own work, and the upload tab is one click away.

The photos come with the starter, in `public/library/<id>.webp`: each was downloaded once from its Unsplash page below, cropped to 3:2, resized to 1600×1067 and saved as WebP (quality 78). This table records where each one comes from and who took it. `lib/images/library.json` is `ui/library.json` as-is.

| id | tag | Photo (also the alt text) | Unsplash photo, photographer |
|---|---|---|---|
| `food-01` | food | Three rustic loaves with seeds and wheat stalks on wood | [rsWZ-P9FbQ4](https://unsplash.com/photos/rustic-bread-loaves-with-wheat-stalks-rsWZ-P9FbQ4), Wesual Click |
| `food-02` | food | Two coffees and pastries on a wooden café table | [FXNqY7Fx0lA](https://unsplash.com/photos/two-coffees-and-pastries-on-a-wooden-table-FXNqY7Fx0lA), masha.uu |
| `food-03` | food | A colourful salad bowl with avocado and fresh vegetables | [_vy3L5n8VnI](https://unsplash.com/photos/a-colorful-salad-bowl-with-many-fresh-ingredients-_vy3L5n8VnI), Elena Leya |
| `food-04` | food | A chef preparing food in a restaurant kitchen | [DxO74ROLieI](https://unsplash.com/photos/a-chef-preparing-food-in-a-restaurant-kitchen-DxO74ROLieI), Hendrik Morkel |
| `food-05` | food | Fresh vegetables on a market stall | [Zaiuy5dKeCk](https://unsplash.com/photos/fresh-vegetables-on-market-stall-Zaiuy5dKeCk), Shelley Pauls |
| `food-06` | food | A pizza baking in a wood-fired oven | [vHRFraV4U00](https://unsplash.com/photos/pizza-baking-in-wood-fired-oven-vHRFraV4U00), Fabrizio Pullara |
| `food-07` | food | A fried egg on a white plate beside a bowl of fruit | [79fXvXmvJjw](https://unsplash.com/photos/a-white-plate-topped-with-a-fried-egg-next-to-a-bowl-of-fruit-79fXvXmvJjw), Yingxin Li |
| `food-08` | food | A cake with white frosting and fresh berries | [__WgTA4CBnI](https://unsplash.com/photos/a-cake-with-white-frosting-and-berries-on-top-__WgTA4CBnI), Anita Austvika |
| `food-09` | food | A cup on a sunny window sill | [QscGYfYmjKg](https://unsplash.com/photos/a-cup-sitting-on-a-window-sill-in-front-of-a-window-QscGYfYmjKg), Maheima Kapur |
| `food-10` | food | Friends gathered around a table for a meal | [MAFMkfevd7w](https://unsplash.com/photos/group-of-friends-gathered-around-a-table-for-a-meal-MAFMkfevd7w), tommao wang |
| `office-01` | office | A modern office with wooden desks and large green plants | [HjKoLK6Eif0](https://unsplash.com/photos/modern-office-workspace-with-indoor-plants-HjKoLK6Eif0), Tiago ib Machado |
| `office-02` | office | A laptop and glasses on a wooden desk | [80sl0xh63k0](https://unsplash.com/photos/laptop-and-glasses-on-wooden-desk-80sl0xh63k0), SPurno Animation Studio |
| `office-03` | office | A business meeting around a conference table | [3tCLyPBSQ5k](https://unsplash.com/photos/business-meeting-with-people-around-a-conference-table-3tCLyPBSQ5k), Beatriz Cattel |
| `office-04` | office | A woman working at a standing desk by a window | [cgD-TtiJvRY](https://unsplash.com/photos/a-woman-standing-at-a-desk-in-front-of-a-window-cgD-TtiJvRY), TheStandingDesk |
| `office-05` | office | A shop front window with a clock | [0plphpzQBJc](https://unsplash.com/photos/a-store-front-window-with-a-clock-on-it-0plphpzQBJc), Se. Tsuchiya |
| `office-06` | office | A modern lobby with a marble reception desk and plants | [pt0nGH-NvoA](https://unsplash.com/photos/modern-lobby-with-marble-reception-desk-and-plants-pt0nGH-NvoA), Aalo Lens |
| `office-07` | office | Sketching in a notebook with coloured pencils nearby | [6FdwZg_uRNM](https://unsplash.com/photos/artist-sketching-in-notebook-with-colored-pencils-nearby-6FdwZg_uRNM), Vitaly Gariev |
| `office-08` | office | A whiteboard with sticky notes | [JXyY3jRV9oI](https://unsplash.com/photos/a-white-board-with-sticky-notes-attached-to-it-JXyY3jRV9oI), Paymo |
| `office-09` | office | A wooden workbench with hand tools in a sunlit workshop | [MWti0Vr2A-M](https://unsplash.com/photos/wooden-workbench-with-hand-tools-MWti0Vr2A-M), Darin Wicentowich |
| `office-10` | office | Two people working on laptops in a sunlit office | [-8DAN9_oi8g](https://unsplash.com/photos/modern-office-workspace-with-two-people--8DAN9_oi8g), Copernico |
| `nature-01` | nature | Snow-capped mountains in golden sunlight | [TliweUwl4Bw](https://unsplash.com/photos/snow-capped-mountains-bathed-in-golden-sunlight-TliweUwl4Bw), Ryan Klaus |
| `nature-02` | nature | A dirt path through a sun-dappled forest | [eohdpP_XFJw](https://unsplash.com/photos/a-dirt-path-winds-through-a-sun-dappled-forest-eohdpP_XFJw), Howard Walsh |
| `nature-03` | nature | A calm lake reflecting green hills under a blue sky | [nq4J2vtak0w](https://unsplash.com/photos/calm-lake-reflecting-green-hills-under-a-clear-blue-sky-nq4J2vtak0w), Martine Rando |
| `nature-04` | nature | Waves breaking on a beach | [NKJ0_QwpnH8](https://unsplash.com/photos/waves-crashing-on-a-beach-NKJ0_QwpnH8), Zac Gudakov |
| `nature-05` | nature | A tea plantation with rows on a green hillside | [7du4l9-4hfQ](https://unsplash.com/photos/tea-plantation-on-green-hillside-7du4l9-4hfQ), Manoa Angelo |
| `nature-06` | nature | A meadow full of colourful wildflowers | [CBA3Zui6ETI](https://unsplash.com/photos/a-vibrant-meadow-filled-with-colorful-wildflowers-and-green-grass-CBA3Zui6ETI), Anna Khromova |
| `nature-07` | nature | Snowy peaks above a layer of low clouds | [YQHUa4j7eGQ](https://unsplash.com/photos/snowy-mountain-peaks-above-clouds-YQHUa4j7eGQ), Laura Chouette |
| `nature-08` | nature | A river running through a mountain valley | [lzDuzTFHUI4](https://unsplash.com/photos/a-river-running-through-a-valley-surrounded-by-mountains-lzDuzTFHUI4), Tom Feb |
| `nature-09` | nature | The sun over desert sand dunes | [Fq2ByVF3yI0](https://unsplash.com/photos/the-sun-is-shining-over-the-sand-dunes-Fq2ByVF3yI0), Ryan Faulkner |
| `nature-10` | nature | A green leaf with water droplets | [lYj0dLgMHmA](https://unsplash.com/photos/green-leaf-with-water-droplets-lYj0dLgMHmA), Elimende Inagella |
| `people-01` | people | A smiling woman with long black hair, close up | [1AhGNGKuhR0](https://unsplash.com/photos/long-black-haired-woman-smiling-close-up-photography-1AhGNGKuhR0), Lesly Juarez |
| `people-02` | people | A smiling man in a parka outdoors | [vQuGqtLTabQ](https://unsplash.com/photos/smiling-man-wearing-parka-in-front-of-handrail-and-trees-vQuGqtLTabQ), Tânia Mousinho |
| `people-03` | people | Friends around a table with wine glasses | [Y8gXPB8Mq98](https://unsplash.com/photos/a-group-of-people-sitting-around-a-table-with-wine-glasses-Y8gXPB8Mq98), Frankie Cordoba |
| `people-04` | people | A man speaking in front of a crowd | [RfiBK6Y_upQ](https://unsplash.com/photos/man-speaking-in-front-of-crowd-RfiBK6Y_upQ), Miguel Henriques |
| `people-05` | people | A yoga class with arms raised in a bright studio | [LtI8XZBlQvw](https://unsplash.com/photos/people-practicing-yoga-in-studio-LtI8XZBlQvw), Vitaly Gariev |
| `people-06` | people | A bride and groom walking on a hill | [IfjHaIoAoqE](https://unsplash.com/photos/a-bride-and-groom-walking-on-a-hill-IfjHaIoAoqE), Foto Pettine |
| `people-07` | people | Hands shaping clay on a pottery wheel | [ZSgWcW70cTs](https://unsplash.com/photos/pottery-wheel-with-clay-and-tools-ZSgWcW70cTs), Taylor Heery |
| `people-08` | people | Coffee being poured into a white cup | [X4RJG4aNi8o](https://unsplash.com/photos/person-pouring-cup-of-coffee-in-white-ceramic-cup-X4RJG4aNi8o), Brooke Cagle |
| `people-09` | people | Three people laughing together at a table | [g1Kr4Ozfoac](https://unsplash.com/photos/three-people-sitting-in-front-of-table-laughing-together-g1Kr4Ozfoac), Brooke Cagle |
| `people-10` | people | A person running down a street, motion-blurred | [nvfh0s5ojjg](https://unsplash.com/photos/a-person-running-on-a-street-with-motion-blur-nvfh0s5ojjg), eowynring |
| `product-01` | product | Skincare bottles on white fabric | [8jg7vumdUlU](https://unsplash.com/photos/white-and-brown-plastic-bottles-on-white-textile-8jg7vumdUlU), Neauthy Skincare |
| `product-02` | product | A white and orange sneaker on a light background | [LG88A2XgIXY](https://unsplash.com/photos/white-and-orange-athletic-sneaker-LG88A2XgIXY), Luis Felipe Lins |
| `product-03` | product | Ceramic mugs and pitchers on a shelf | [psUrLzw9wlg](https://unsplash.com/photos/stack-of-ceramic-mugs-and-pitchers-on-a-shelf-psUrLzw9wlg), T |
| `product-04` | product | A smartphone beside its case | [Q0ksjWR55Jc](https://unsplash.com/photos/black-smartphone-beside-black-smart-case-Q0ksjWR55Jc), Sven |
| `product-05` | product | Coffee beans in a sack | [obV_LM0KjxY](https://unsplash.com/photos/shallow-focus-photography-of-coffee-beans-in-sack-obV_LM0KjxY), Tina Guina |
| `product-06` | product | A watch beside a rock on a dark surface | [rONaAK8agSk](https://unsplash.com/photos/a-watch-sitting-next-to-a-rock-on-a-black-surface-rONaAK8agSk), Aren Nagulyan |
| `product-07` | product | Pink and white wireless headphones | [Zam8TvEgN5o](https://unsplash.com/photos/pink-and-white-wireless-headphones-Zam8TvEgN5o), Ervo Rocks |
| `product-08` | product | A pile of open paperback books | [LUGuCtvlk1Q](https://unsplash.com/photos/pile-of-open-paperback-books-LUGuCtvlk1Q), Gülfer ERGİN |
| `product-09` | product | A group of candles side by side | [KLU0scqbKQ0](https://unsplash.com/photos/a-group-of-candles-sitting-next-to-each-other-KLU0scqbKQ0), pmv chamara |
| `product-10` | product | A black backpack hanging on a door knob | [6y2BGmrNBy4](https://unsplash.com/photos/black-backpack-hanged-on-door-knob-6y2BGmrNBy4), Carlos 312 |
| `abstract-01` | abstract | A soft gradient of warm colours | [Gf5Q_5UF3vs](https://unsplash.com/photos/abstract-gradient-of-warm-colors-with-soft-edges-Gf5Q_5UF3vs), asi mong |
| `abstract-02` | abstract | Geometric shapes on a pink surface | [buK8k-vF0no](https://unsplash.com/photos/a-group-of-different-shapes-and-sizes-on-a-pink-surface-buK8k-vF0no), Skiking Photos |
| `abstract-03` | abstract | A stack of folded paper in soft light | [vMODzl7Svjg](https://unsplash.com/photos/a-stack-of-folded-papers-sitting-on-top-of-each-other-vMODzl7Svjg), Pawel Czerwinski |
| `abstract-04` | abstract | Blurred lights at night | [FABH5NJEMGM](https://unsplash.com/photos/bokeh-photography-FABH5NJEMGM), Ugur Akdemir |
| `abstract-05` | abstract | Swirling white smoke on black | [3q3O3QftPVo](https://unsplash.com/photos/white-and-black-smoke-illustration-3q3O3QftPVo), Katrin Hauf |
| `abstract-06` | abstract | White buildings against a pale sky | [sKKuyRyiy6k](https://unsplash.com/photos/white-buildings-under-white-sky-sKKuyRyiy6k), Lim Wu |
| `abstract-07` | abstract | A light grey wall with rough plaster texture | [ZOjO31xtKiU](https://unsplash.com/photos/grey-wall-with-rough-plaster-texture-ZOjO31xtKiU), Antoine Merour |
| `abstract-08` | abstract | A window of multicoloured glass | [QHPVnH9pLew](https://unsplash.com/photos/multicolored-glass-window-QHPVnH9pLew), Tim Mossholder |
| `abstract-09` | abstract | A long shadow across white marble | [LfU6_b3Oj4E](https://unsplash.com/photos/a-white-marble-counter-top-with-a-long-shadow-LfU6_b3Oj4E), Augustine Wong |
| `abstract-10` | abstract | A close-up of grey fabric texture | [SWy0WAO12P8](https://unsplash.com/photos/a-close-up-of-a-gray-fabric-texture-SWy0WAO12P8), engin akyurt |
