// ─────────────────────────────────────────────────────────────
// All the site's content lives here. To add a dinosaur, copy one
// entry in DINOS, change the values, and save. Pages update by themselves.
// Ages are in millions of years ago (Ma) and are approximate.
// ─────────────────────────────────────────────────────────────

const PERIODS = [
  {
    id: "triassic", name: "Triassic", start: 251.9, end: 201.4, color: "#d9733b",
    blurb: "All the land was joined into one giant supercontinent called Pangaea. It was hot and dry. Dinosaurs were brand new, and most were small."
  },
  {
    id: "jurassic", name: "Jurassic", start: 201.4, end: 145, color: "#4a9a62",
    blurb: "Pangaea was splitting apart. The world was warm and wet, with forests of ferns and conifer trees. Giant long-necked sauropods roamed."
  },
  {
    id: "cretaceous", name: "Cretaceous", start: 145, end: 66, color: "#3d7cc0",
    blurb: "The continents drifted toward where they are today and the first flowers bloomed. It ended when a huge asteroid hit Earth 66 million years ago."
  }
];

// A simple family tree. Each dinosaur below points at one of the
// bottom-level groups with its `group` field.
const FAMILY_TREE = {
  id: "dinosauria", name: "Dinosaurs", children: [
    {
      id: "saurischia", name: "Saurischians", note: "\"lizard-hipped\"", children: [
        { id: "early", name: "Early dinosaurs", note: "the very first dinosaurs; scientists still debate where they fit" },
        { id: "theropoda", name: "Theropods", note: "walked on two legs, mostly meat-eaters. Birds are theropods!" },
        { id: "sauropodomorpha", name: "Sauropods & relatives", note: "long necks, plant-eaters" }
      ]
    },
    {
      id: "ornithischia", name: "Ornithischians", note: "\"bird-hipped\" plant-eaters (funny enough, not related to birds)", children: [
        { id: "thyreophora", name: "Armored dinosaurs", note: "plates, spikes and armor" },
        { id: "ornithopoda", name: "Ornithopods", note: "beaked plant-eaters, including duck-bills" },
        { id: "marginocephalia", name: "Horns, frills & domes", note: "horned and dome-headed dinosaurs" }
      ]
    }
  ]
};

const DIETS = {
  herbivore: { label: "Plant-eater", icon: "🌿" },
  carnivore: { label: "Meat-eater", icon: "🍖" },
  piscivore: { label: "Fish-eater", icon: "🐟" },
  omnivore:  { label: "Plants & meat", icon: "🍽️" }
};

// body: which placeholder silhouette to draw — "biped", "longneck" or "quad"
const DINOS = [
  {
    id: "eoraptor", name: "Eoraptor", say: "EE-oh-RAP-tor", meaning: "dawn plunderer",
    start: 231, end: 228, group: "early", diet: "omnivore", body: "biped",
    lengthM: 1, weightKg: 10, found: "Argentina", continents: ["South America"],
    fact: "One of the very first dinosaurs. It lived when dinosaurs were still small and rare."
  },
  {
    id: "herrerasaurus", name: "Herrerasaurus", say: "herr-AIR-uh-SORE-us", meaning: "Herrera's lizard",
    start: 231, end: 229, group: "early", diet: "carnivore", body: "biped",
    lengthM: 4.5, weightKg: 250, found: "Argentina", continents: ["South America"],
    fact: "It's named after Victorino Herrera, the goat herder who found its bones."
  },
  {
    id: "coelophysis", name: "Coelophysis", say: "SEE-low-FYE-sis", meaning: "hollow form",
    start: 215, end: 208, group: "theropoda", diet: "carnivore", body: "biped",
    lengthM: 3, weightKg: 20, found: "New Mexico & Arizona, USA", continents: ["North America"],
    fact: "Hundreds of Coelophysis skeletons were found together at Ghost Ranch in New Mexico."
  },
  {
    id: "plateosaurus", name: "Plateosaurus", say: "PLAT-ee-oh-SORE-us", meaning: "broad lizard",
    start: 214, end: 204, group: "sauropodomorpha", diet: "herbivore", body: "biped",
    lengthM: 8, weightKg: 700, found: "Germany, Switzerland & France", continents: ["Europe"],
    fact: "An early cousin of the giant sauropods. It walked on two legs and grabbed plants with its clawed hands."
  },
  {
    id: "dilophosaurus", name: "Dilophosaurus", say: "dye-LOFF-oh-SORE-us", meaning: "two-crested lizard",
    start: 196, end: 184, group: "theropoda", diet: "carnivore", body: "biped",
    lengthM: 7, weightKg: 400, found: "Arizona, USA", continents: ["North America"],
    fact: "In the movies it spits venom and has a neck frill, but there's no evidence for either!"
  },
  {
    id: "stegosaurus", name: "Stegosaurus", say: "STEG-oh-SORE-us", meaning: "roof lizard",
    start: 155, end: 145, group: "thyreophora", diet: "herbivore", body: "quad",
    lengthM: 9, weightKg: 5000, found: "Western USA & Portugal", continents: ["North America", "Europe"],
    fact: "The spikes on its tail are nicknamed the \"thagomizer\", a name that started as a joke in a cartoon."
  },
  {
    id: "allosaurus", name: "Allosaurus", say: "AL-oh-SORE-us", meaning: "different lizard",
    start: 155, end: 145, group: "theropoda", diet: "carnivore", body: "biped",
    lengthM: 9.5, weightKg: 2000, found: "Western USA & Portugal", continents: ["North America", "Europe"],
    fact: "The top predator of the Jurassic. It probably hunted Stegosaurus."
  },
  {
    id: "brachiosaurus", name: "Brachiosaurus", say: "BRAK-ee-oh-SORE-us", meaning: "arm lizard",
    start: 154, end: 150, group: "sauropodomorpha", diet: "herbivore", body: "longneck",
    lengthM: 22, weightKg: 40000, found: "Colorado & Utah, USA", continents: ["North America"],
    fact: "Its front legs were longer than its back legs, so it stood tall like a giraffe."
  },
  {
    id: "diplodocus", name: "Diplodocus", say: "dih-PLOD-oh-kus", meaning: "double beam",
    start: 154, end: 152, group: "sauropodomorpha", diet: "herbivore", body: "longneck",
    lengthM: 26, weightKg: 15000, found: "Western USA", continents: ["North America"],
    fact: "Its tail was so long that some scientists think it could crack it like a whip."
  },
  {
    id: "archaeopteryx", name: "Archaeopteryx", say: "ar-kee-OP-ter-iks", meaning: "ancient wing",
    start: 149, end: 148, group: "theropoda", diet: "carnivore", dietNote: "insects and small animals", body: "biped",
    lengthM: 0.5, weightKg: 1, found: "Germany", continents: ["Europe"],
    fact: "It had feathers and wings like a bird, but teeth and a long bony tail like a dinosaur."
  },
  {
    id: "iguanodon", name: "Iguanodon", say: "ig-WAH-no-don", meaning: "iguana tooth",
    start: 126, end: 122, group: "ornithopoda", diet: "herbivore", body: "biped",
    lengthM: 10, weightKg: 3500, found: "Western Europe", continents: ["Europe"],
    fact: "Scientists first put its thumb spike on its nose, like a horn!"
  },
  {
    id: "spinosaurus", name: "Spinosaurus", say: "SPY-no-SORE-us", meaning: "spine lizard",
    start: 100, end: 94, group: "theropoda", diet: "piscivore", body: "biped",
    lengthM: 14, weightKg: 7000, found: "Northern Africa", continents: ["Africa"],
    fact: "Longer than T. rex! It spent lots of time in rivers, hunting giant fish."
  },
  {
    id: "argentinosaurus", name: "Argentinosaurus", say: "ar-jen-TEEN-oh-SORE-us", meaning: "Argentina lizard",
    start: 97, end: 93, group: "sauropodomorpha", diet: "herbivore", body: "longneck",
    lengthM: 35, weightKg: 70000, found: "Argentina", continents: ["South America"],
    fact: "One of the biggest animals ever to walk on land. A single bone from its back was as tall as a grown-up."
  },
  {
    id: "parasaurolophus", name: "Parasaurolophus", say: "PAR-uh-sore-OL-off-us", meaning: "near crested lizard",
    start: 77, end: 73, group: "ornithopoda", diet: "herbivore", body: "biped",
    lengthM: 9.5, weightKg: 2500, found: "Western USA & Canada", continents: ["North America"],
    fact: "Its long hollow crest may have worked like a trumpet, making loud honking calls."
  },
  {
    id: "velociraptor", name: "Velociraptor", say: "veh-LOSS-ih-RAP-tor", meaning: "swift thief",
    start: 75, end: 71, group: "theropoda", diet: "carnivore", body: "biped",
    lengthM: 2, weightKg: 15, found: "Mongolia & China", continents: ["Asia"],
    fact: "The real Velociraptor was about the size of a turkey and covered in feathers."
  },
  {
    id: "ankylosaurus", name: "Ankylosaurus", say: "an-KYE-loh-SORE-us", meaning: "fused lizard",
    start: 68, end: 66, group: "thyreophora", diet: "herbivore", body: "quad",
    lengthM: 8, weightKg: 6000, found: "Montana, USA & Canada", continents: ["North America"],
    fact: "Its tail ended in a heavy bony club it could swing at attackers."
  },
  {
    id: "pachycephalosaurus", name: "Pachycephalosaurus", say: "PAK-ee-SEF-uh-loh-SORE-us", meaning: "thick-headed lizard",
    start: 68, end: 66, group: "marginocephalia", diet: "herbivore", body: "biped",
    lengthM: 4.5, weightKg: 450, found: "Montana & South Dakota, USA", continents: ["North America"],
    fact: "The dome on top of its skull was up to 25 cm (10 inches) thick."
  },
  {
    id: "triceratops", name: "Triceratops", say: "try-SAIR-uh-tops", meaning: "three-horned face",
    start: 68, end: 66, group: "marginocephalia", diet: "herbivore", body: "quad",
    lengthM: 9, weightKg: 9000, found: "Western USA & Canada", continents: ["North America"],
    fact: "Triceratops lived at the same time and place as T. rex, which probably hunted it."
  },
  {
    id: "tyrannosaurus", name: "Tyrannosaurus rex", say: "tie-RAN-oh-SORE-us rex", meaning: "tyrant lizard king",
    start: 68, end: 66, group: "theropoda", diet: "carnivore", body: "biped",
    lengthM: 12, weightKg: 8000, found: "Western USA & Canada", continents: ["North America"],
    fact: "T. rex lived closer in time to us than to Stegosaurus!"
  }
];
