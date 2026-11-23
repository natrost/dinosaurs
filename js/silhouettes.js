// Facts about each drawing in images/silhouettes/. Used for drawing, scaling and the credits page.
// h: height when the drawing is 100 wide. span: width of the drawing compared with the animal's
// length measured along its body (less than 1 when the neck or tail is raised or curved).
const SILHOUETTES = {
  "eoraptor": {
    "h": 65.15,
    "span": 0.944,
    "species": "Eoraptor lunensis",
    "by": "Marmelad",
    "license": "BY-SA-3.0",
    "source": "https://www.phylopic.org/images/8f3e5723-986f-4f1d-9292-ff041ce176ca",
    "mirrored": false
  },
  "herrerasaurus": {
    "h": 59.83,
    "span": 0.922,
    "species": "Herrerasaurus ischigualastensis",
    "by": "Tasman Dixon",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/3d1b4e68-f523-47c2-8945-c701a5e5d40f",
    "mirrored": true
  },
  "coelophysis": {
    "h": 42.95,
    "span": 0.913,
    "species": "Coelophysis bauri",
    "by": "Tasman Dixon",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/13cd74e3-5ced-4411-a39a-8f0a0feb428b",
    "mirrored": false
  },
  "plateosaurus": {
    "h": 30.11,
    "span": 0.987,
    "species": "Plateosaurus",
    "by": "Jack Mayer Wood",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/23027ce7-713d-4c28-97e2-aec0219266df",
    "mirrored": true
  },
  "dilophosaurus": {
    "h": 30.84,
    "span": 0.98,
    "species": "Dilophosaurus wetherilli",
    "by": "artrociraptor",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/6b999b4b-b474-4bb7-bbf8-eacc05fd4bbb",
    "mirrored": true
  },
  "stegosaurus": {
    "h": 44.37,
    "span": 0.994,
    "species": "Stegosaurus stenops",
    "by": "an artist not named on PhyloPic",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/429d71d8-2940-449b-838b-a5b7f1733eba",
    "mirrored": false
  },
  "allosaurus": {
    "h": 30.44,
    "span": 0.98,
    "species": "Allosaurus europaeus",
    "by": "Jagged Fang Designs",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/62f2e46f-9205-4e32-83d6-e14865a9e789",
    "mirrored": true
  },
  "brachiosaurus": {
    "h": 60.51,
    "span": 0.856,
    "species": "Brachiosaurus altithorax",
    "by": "Michael P. Taylor",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/2431b273-7b21-482e-b971-70377686335d",
    "mirrored": false
  },
  "diplodocus": {
    "h": 30.59,
    "span": 0.948,
    "species": "Diplodocus carnegii",
    "by": "Jagged Fang Designs",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/aae9fef6-0845-4842-8537-1dc418f27c94",
    "mirrored": true
  },
  "archaeopteryx": {
    "h": 40.46,
    "span": 0.977,
    "species": "Archaeopteryx lithographica",
    "by": "Scott Hartman",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/5b18bbbd-516e-40ba-8f2a-3e77aad72230",
    "mirrored": true
  },
  "iguanodon": {
    "h": 41.25,
    "span": 0.938,
    "species": "Iguanodon bernissartensis",
    "by": "Tasman Dixon",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/0fd97fa9-7d64-4a36-b713-a72e073866f7",
    "mirrored": true
  },
  "spinosaurus": {
    "h": 43.38,
    "span": 0.915,
    "species": "Spinosaurus aegyptiacus",
    "by": "Tasman Dixon",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/0dd7eaf6-1caf-4579-9f42-340fa9f34c48",
    "mirrored": true
  },
  "parasaurolophus": {
    "h": 42.58,
    "span": 0.98,
    "species": "Parasaurolophus",
    "by": "Richard Rich",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/ef954cac-604a-4e1f-9b8d-bd92bf3cc3f6",
    "mirrored": true
  },
  "velociraptor": {
    "h": 30.5,
    "span": 0.989,
    "species": "Velociraptor mongoliensis",
    "by": "an artist not named on PhyloPic",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/fc9271c1-c59d-41bf-941e-9c5a084169c7",
    "mirrored": true
  },
  "ankylosaurus": {
    "h": 29.02,
    "span": 0.998,
    "species": "Ankylosaurus magniventris",
    "by": "an artist not named on PhyloPic",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/8a8a2525-e97d-4505-8085-7958f8d36137",
    "mirrored": true
  },
  "pachycephalosaurus": {
    "h": 48.79,
    "span": 0.928,
    "species": "Pachycephalosaurus wyomingensis",
    "by": "Emily Willoughby",
    "license": "BY-SA-3.0",
    "source": "https://www.phylopic.org/images/6105ff49-0bd0-477c-8bef-41b0c39fdca9",
    "mirrored": true
  },
  "triceratops": {
    "h": 41.99,
    "span": 0.962,
    "species": "Triceratops prorsus",
    "by": "Jagged Fang Designs",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/1ef8f3a2-6c8b-400e-ab01-cc26ed9d1a4d",
    "mirrored": true
  },
  "tyrannosaurus": {
    "h": 30.14,
    "span": 0.987,
    "species": "Tyrannosaurus rex",
    "by": "Manuel Brea Lueiro",
    "license": "CC0",
    "source": "https://www.phylopic.org/images/6a38b924-85c4-46b6-a04a-0e53f2f4d77f",
    "mirrored": true
  }
};
